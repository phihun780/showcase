import { json, requireAuth, toObjectKey, isWritableKey, getBucket } from './_lib.js';

const BATCH_SIZE = 1000; // giới hạn mỗi lệnh xoá của R2

export async function onRequestPost(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { request, env } = context;
  const bucket = getBucket(env);
  if (!bucket) {
    return json({ error: 'Chưa gắn kho R2 (PORTFOLIO_ASSETS) cho dự án' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  }

  const inputs = Array.isArray(body.keys) ? body.keys : [body.key];

  // Bỏ qua ảnh base64, ảnh từ nguồn ngoài, và mọi đường dẫn ngoài
  // các thư mục được phép — thay vì báo lỗi, để CMS xoá hàng loạt vẫn chạy mượt.
  const keys = [...new Set(inputs.map(toObjectKey).filter(k => k && isWritableKey(k)))];

  if (keys.length === 0) {
    return json({ success: true, deleted: 0, skipped: inputs.length });
  }

  try {
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      await bucket.delete(keys.slice(i, i + BATCH_SIZE));
    }
    return json({ success: true, deleted: keys.length, skipped: inputs.length - keys.length });
  } catch (err) {
    console.error('Delete error:', err);
    return json({ error: 'Xoá ảnh thất bại' }, 500);
  }
}
