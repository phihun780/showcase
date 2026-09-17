import {
  json,
  getCmsPassword,
  createToken,
  checkLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
} from './_lib.js';

// Nhập sai thì trả lời chậm lại một nhịp. Không tốn tài nguyên máy chủ,
// nhưng làm chậm hẳn máy dò mật khẩu tự động.
const FAILURE_DELAY_MS = 700;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// So sanh hai chuoi trong thoi gian NHU NHAU du dung hay sai.
//
// `a === b` dung may cham bit dau tien khac nhau la tra ve ngay. Chenh lech vai
// phan trieu giay do, do di do lai hang nghin lan, la doan duoc tung ky tu mot
// thay vi phai thu het moi to hop. Ham nay luon duyet het, nen khong lo ra gi.
function bangNhau(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let khac = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) khac |= (x[i] || 0) ^ (y[i] || 0);
  return khac === 0;
}

/**
 * Cho giao dien biet ma PIN dai bao nhieu so, de ve dung so o tron.
 *
 * Chi tra ve DO DAI, khong bao gio tra ve ma. Do dai von da lo ra roi — nhin man
 * hinh dang nhap la dem duoc — nen noi ra day khong mat them gi, doi lai la doi
 * CMS_PASSWORD tren Cloudflare sang 6 hay 8 so thi khong phai sua code.
 */
export async function onRequestGet(context) {
  const expected = getCmsPassword(context.env);
  const n = expected ? expected.length : 4;
  return json({ length: Math.min(12, Math.max(4, n)) });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const expected = getCmsPassword(env);
  if (!expected) {
    return json(
      {
        success: false,
        error:
          'Chưa cài đặt CMS_PASSWORD trên Cloudflare. Vào Workers & Pages → dự án → Settings → Variables and Secrets để thêm.',
      },
      503
    );
  }

  // 1. Đang bị khoá vì nhập sai quá nhiều lần?
  const gate = await checkLoginAllowed(env, request);
  if (!gate.allowed) {
    return json(
      {
        success: false,
        locked: true,
        retryAfterMinutes: gate.retryAfterMinutes,
        error: `Đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${gate.retryAfterMinutes} phút.`,
      },
      429
    );
  }

  // 2. Đọc mật khẩu gửi lên
  let password = '';
  try {
    const body = await request.json();
    password = String(body.password || '').trim();
  } catch {
    return json({ success: false, error: 'Yêu cầu không hợp lệ' }, 400);
  }

  // 3. Đúng → cấp vé và xoá bộ đếm
  if (password && bangNhau(password, expected)) {
    await clearLoginFailures(env, request);
    return json({ success: true, token: await createToken(env) });
  }

  // 4. Sai → ghi nhận, chờ một nhịp, rồi báo lỗi
  const { remaining } = await recordLoginFailure(env, request);
  await sleep(FAILURE_DELAY_MS);

  return json(
    {
      success: false,
      remaining,
      error:
        remaining === null
          ? 'Mật khẩu không chính xác'
          : remaining > 0
            ? `Mật khẩu không chính xác. Còn ${remaining} lần thử.`
            : 'Đã nhập sai quá nhiều lần. CMS tạm khoá 15 phút.',
    },
    401
  );
}
