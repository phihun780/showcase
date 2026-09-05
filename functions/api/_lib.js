// Tiện ích dùng chung cho các endpoint CMS.
// File bắt đầu bằng "_" không được Cloudflare Pages biến thành route công khai.

export const PUBLIC_R2_URL = 'https://pub-92c2aa5ead2a411ebfe8b083d3ce67d1.r2.dev';

// Phiên đăng nhập CMS có hiệu lực 12 giờ
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

// Chỉ những thư mục này mới được phép ghi/xoá. Thư mục "data" (chứa
// portfolio.json) cố tình không có ở đây để không thể bị xoá nhầm.
const WRITABLE_FOLDERS = ['projects', 'cover_banners', 'random_works', 'profile', 'uploads'];

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

// Mật khẩu đăng nhập CMS (Cloudflare → Settings → Variables and Secrets)
export function getCmsPassword(env) {
  const pw = env.CMS_PASSWORD ? String(env.CMS_PASSWORD).trim() : '';
  return pw || null;
}

// Chuỗi bí mật dùng để ký vé đăng nhập. Nên đặt riêng và thật dài, để dù
// mật khẩu CMS ngắn thì vé vẫn không thể bị giả mạo.
function getTokenSecret(env) {
  const secret = env.CMS_TOKEN_SECRET ? String(env.CMS_TOKEN_SECRET).trim() : '';
  return secret || getCmsPassword(env);
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Tạo "vé vào cửa" cho phiên CMS. Không cần lưu ở đâu cả: server tự tính lại
// chữ ký để kiểm tra.
export async function createToken(env) {
  const secret = getTokenSecret(env);
  if (!secret) return null;
  const issuedAt = Date.now();
  return `${issuedAt}.${await hmacHex(secret, String(issuedAt))}`;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyToken(env, token) {
  const secret = getTokenSecret(env);
  if (!secret || !token) return false;

  const parts = String(token).split('.');
  if (parts.length !== 2) return false;

  const [issuedAt, signature] = parts;
  const ts = Number(issuedAt);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > TOKEN_TTL_MS) return false;
  if (ts > Date.now() + 60_000) return false; // vé "từ tương lai" là giả

  return safeEqual(signature, await hmacHex(secret, issuedAt));
}

// Trả về null nếu hợp lệ, hoặc Response lỗi nếu không có quyền.
export async function requireAuth(context) {
  if (!getCmsPassword(context.env)) {
    return json(
      {
        error:
          'Chưa cài đặt CMS_PASSWORD trên Cloudflare. Vào Workers & Pages → dự án → Settings → Variables and Secrets để thêm.',
      },
      503
    );
  }

  const header = context.request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (await verifyToken(context.env, token)) return null;

  return json(
    { error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại CMS.' },
    401
  );
}

// Chuyển URL công khai (hoặc key sẵn có) thành key sạch trong bucket.
// Trả về null nếu đó không phải file thuộc kho của mình.
export function toObjectKey(input) {
  if (!input || typeof input !== 'string') return null;

  let key = input.trim();
  if (!key || key.startsWith('data:') || key.startsWith('blob:')) return null;

  if (key.includes('.r2.dev/')) {
    key = key.split('.r2.dev/')[1];
  } else if (key.includes('/portfolio-assets/')) {
    key = key.split('/portfolio-assets/')[1];
  } else if (/^https?:\/\//i.test(key)) {
    return null; // ảnh từ nguồn ngoài, không đụng tới
  }

  key = key.split('?')[0].replace(/^\/+/, '');
  try {
    key = decodeURIComponent(key);
  } catch {
    // giữ nguyên nếu không giải mã được
  }

  if (!key || key.includes('..')) return null;
  return key;
}

// Key có nằm trong thư mục được phép ghi/xoá không?
export function isWritableKey(key) {
  if (!key) return false;
  const parts = key.split('/');
  return parts.length >= 2 && WRITABLE_FOLDERS.includes(parts[0]);
}

// Thư mục có được phép xoá nguyên cụm không? Phải sâu hơn thư mục gốc,
// để không ai xoá được cả "projects" chỉ bằng một lệnh.
export function isWritableFolder(prefix) {
  if (!prefix || typeof prefix !== 'string') return false;
  const clean = prefix.replace(/^\/+|\/+$/g, '');
  if (!clean || clean.includes('..')) return false;
  const parts = clean.split('/');
  return parts.length >= 2 && WRITABLE_FOLDERS.includes(parts[0]);
}

// ---------------------------------------------------------------------------
// Chặn dò mật khẩu
//
// Đếm số lần nhập sai và khoá tạm thời. Bộ đếm được lưu trên R2 nên không bị
// mất khi Cloudflare khởi động lại máy chủ — khác với đếm trong bộ nhớ tạm.
//
// Địa chỉ IP không bao giờ được lưu nguyên văn: nó được băm rồi rút gọn thành
// 1 trong 4096 "ngăn", vừa bảo vệ riêng tư vừa giới hạn số file sinh ra.
// ---------------------------------------------------------------------------

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000; // khoảng thời gian đếm dồn
const LOCK_MS = 15 * 60 * 1000; // thời gian khoá sau khi vượt ngưỡng

async function guardKey(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const salt = getTokenSecret(env) || 'salt';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + salt));
  const bucket = Array.from(new Uint8Array(digest).slice(0, 2))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 3);
  return `_guard/${bucket}.json`;
}

// Còn được phép thử không? Trả về { allowed, retryAfterMinutes }.
export async function checkLoginAllowed(env, request) {
  if (!env.PORTFOLIO_ASSETS) return { allowed: true }; // không chặn được thì vẫn cho đăng nhập

  try {
    const object = await env.PORTFOLIO_ASSETS.get(await guardKey(env, request));
    if (!object) return { allowed: true };

    const state = JSON.parse(await object.text());
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      return {
        allowed: false,
        retryAfterMinutes: Math.ceil((state.lockedUntil - Date.now()) / 60000),
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// Ghi nhận một lần nhập sai. Trả về số lần thử còn lại.
export async function recordLoginFailure(env, request) {
  if (!env.PORTFOLIO_ASSETS) return { remaining: null };

  try {
    const key = await guardKey(env, request);
    const object = await env.PORTFOLIO_ASSETS.get(key);
    const now = Date.now();

    let state = { fails: 0, windowStart: now, lockedUntil: 0 };
    if (object) {
      try {
        const parsed = JSON.parse(await object.text());
        // Hết khoảng đếm thì bắt đầu lại từ đầu
        if (parsed.windowStart && now - parsed.windowStart < WINDOW_MS) state = parsed;
      } catch {
        // file hỏng — coi như chưa có
      }
    }

    state.fails = (state.fails || 0) + 1;
    if (state.fails >= MAX_FAILS) state.lockedUntil = now + LOCK_MS;

    await env.PORTFOLIO_ASSETS.put(key, JSON.stringify(state), {
      httpMetadata: { contentType: 'application/json' },
    });

    return { remaining: Math.max(0, MAX_FAILS - state.fails) };
  } catch {
    return { remaining: null };
  }
}

// Đăng nhập đúng thì xoá bộ đếm.
export async function clearLoginFailures(env, request) {
  if (!env.PORTFOLIO_ASSETS) return;
  try {
    await env.PORTFOLIO_ASSETS.delete(await guardKey(env, request));
  } catch {
    // không quan trọng
  }
}
