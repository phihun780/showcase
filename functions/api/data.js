import { json, requireAuth, getBucket, PUBLIC_R2_URL } from './_lib.js';

const DATA_KEY = 'data/portfolio.json';

// Đọc nội dung portfolio — công khai, vì trang web ai cũng xem được.
export async function onRequestGet(context) {
  const { env } = context;

  // 1. Thử đọc từ R2 binding nếu có
  try {
    const bucket = getBucket(env);
    if (bucket) {
      const object = await bucket.get(DATA_KEY);
      if (object) {
        return new Response(await object.text(), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
  } catch (err) {
    console.error('Data read error from binding:', err);
  }

  // 2. Fallback: Đọc từ kho R2 công khai và trả về kèm CORS header
  try {
    const publicRes = await fetch(`${PUBLIC_R2_URL}/${DATA_KEY}?t=${Date.now()}`);
    if (publicRes.ok) {
      const text = await publicRes.text();
      return new Response(text, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (err) {
    console.error('Data read error from public URL:', err);
  }

  return json({ empty: true });
}

// Ghi đè nội dung portfolio — chỉ CMS đã đăng nhập mới được phép.
export async function onRequestPost(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { request, env } = context;
  const bucket = getBucket(env);
  if (!bucket) {
    return json({ error: 'Chưa gắn kho R2 (PORTFOLIO_ASSETS) cho dự án' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Dữ liệu gửi lên không hợp lệ' }, 400);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ error: 'Dữ liệu gửi lên không hợp lệ' }, 400);
  }

  try {
    await bucket.put(DATA_KEY, JSON.stringify(payload, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
    return json({ success: true });
  } catch (err) {
    console.error('Data write error:', err);
    return json({ error: 'Lưu dữ liệu thất bại' }, 500);
  }
}
