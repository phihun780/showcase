import { json, requireAuth, isWritableKey, getBucket } from './_lib.js';
import { s3GetObject } from './_s3.js';

/**
 * Tải một tấm ảnh trong kho về máy.
 *
 * VÌ SAO PHẢI ĐI VÒNG QUA ĐÂY:
 * Kho R2 không gửi kèm header CORS, nên trang web không đọc được nội dung file
 * bằng `fetch` — mà không đọc được thì không tạo được nút tải. Còn thẻ <a
 * download> trỏ thẳng sang tên miền khác thì trình duyệt bỏ qua thuộc tính
 * `download`, bấm vào chỉ mở ảnh ra xem chứ không lưu.
 *
 * Endpoint này nằm cùng tên miền với trang, đọc file từ kho ở phía máy chủ rồi
 * trả về kèm `Content-Disposition: attachment` — bấm là lưu thẳng, đúng tên file.
 */
export async function onRequestGet(context) {
  const chan = await requireAuth(context);
  if (chan) return chan;

  const url = new URL(context.request.url);
  const key = (url.searchParams.get('key') || '').trim().replace(/^\/+/, '');

  // Cùng bộ luật với lúc tải lên: chỉ đụng tới các thư mục của CMS, và chặn
  // đường dẫn lắt léo kiểu "../".
  if (!key || key.includes('..') || !/^[a-zA-Z0-9._/-]+$/.test(key) || !isWritableKey(key)) {
    return json({ error: 'Đường dẫn ảnh không hợp lệ' }, 400);
  }

  const ten = key.split('/').pop() || 'anh';

  const traVe = (body, contentType) =>
    new Response(body, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        // filename* để tên có dấu tiếng Việt không bị vỡ
        'Content-Disposition': `attachment; filename="${ten.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        'Cache-Control': 'no-store',
      },
    });

  // Ưu tiên đọc thẳng từ bucket đã gắn vào Pages; không có thì đi đường S3.
  const bucket = getBucket(context.env);
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return json({ error: 'Không tìm thấy ảnh' }, 404);
    return traVe(object.body, object.httpMetadata?.contentType);
  }

  const res = await s3GetObject(context.env, key);
  if (!res || !res.ok) return json({ error: 'Không tìm thấy ảnh' }, 404);
  return traVe(res.body, res.headers.get('content-type'));
}
