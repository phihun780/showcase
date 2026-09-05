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
  if (password && password === expected) {
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
