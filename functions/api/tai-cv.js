import { json, getBucket, PUBLIC_R2_URL } from './_lib.js';
import { s3GetObject } from './_s3.js';

/**
 * Tải CV về máy. Đây là đường CÔNG KHAI — khách vào xem trang bấm là tải được,
 * không cần đăng nhập gì.
 *
 * VÌ SAO KHÔNG TRỎ THẲNG VÀO KHO:
 * Bấm vào địa chỉ PDF thì trình duyệt MỞ nó ra trong trình xem có sẵn chứ không
 * tải về. Muốn tải thật thì phải có header `Content-Disposition: attachment`, mà
 * cái đó chỉ đặt được ở phía máy chủ.
 *
 * KHÔNG nhận tham số đường dẫn. Endpoint tự đọc `profile.cvUrl` trong dữ liệu
 * rồi phục vụ đúng file đó — người ngoài không thể lái nó sang file khác trong
 * kho, vì đơn giản là không có chỗ nào để lái.
 */
export async function onRequestGet(context) {
  const bucket = getBucket(context.env);

  // Đọc dữ liệu để biết CV hiện là file nào.
  let duLieu = null;
  try {
    if (bucket) {
      const obj = await bucket.get('data/portfolio.json');
      if (obj) duLieu = JSON.parse(await obj.text());
    }
    if (!duLieu) {
      const res = await fetch(`${PUBLIC_R2_URL}/data/portfolio.json?t=${Date.now()}`);
      if (res.ok) duLieu = await res.json();
    }
  } catch {
    duLieu = null;
  }

  const cvUrl = (duLieu?.profile?.cvUrl || duLieu?.profile?.resumeUrl || '').trim();
  if (!cvUrl) return json({ error: 'Chưa có CV' }, 404);

  // Chỉ phục vụ được file nằm trong kho của mình. CV đặt bằng link ngoài
  // (Google Drive chẳng hạn) thì trang tự mở link đó, không đi qua đây.
  let key = '';
  if (cvUrl.includes('.r2.dev/')) key = cvUrl.split('.r2.dev/')[1];
  else if (cvUrl.startsWith(PUBLIC_R2_URL)) key = cvUrl.slice(PUBLIC_R2_URL.length);
  key = key.split('?')[0].replace(/^\/+/, '');

  if (!key || key.includes('..')) return json({ error: 'CV không nằm trong kho' }, 400);

  const ten = key.split('/').pop() || 'CV.pdf';
  const traVe = (body, contentType) =>
    new Response(body, {
      headers: {
        'Content-Type': contentType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${ten.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
        // Đổi CV trong CMS là lần tải sau phải ra file mới ngay.
        'Cache-Control': 'no-store',
      },
    });

  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return json({ error: 'Không tìm thấy file CV' }, 404);
    return traVe(object.body, object.httpMetadata?.contentType);
  }

  const res = await s3GetObject(context.env, key);
  if (!res || !res.ok) return json({ error: 'Không tìm thấy file CV' }, 404);
  return traVe(res.body, res.headers.get('content-type'));
}
