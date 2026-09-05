import { json, requireAuth, isWritableFolder, getBucket } from './_lib.js';
import { s3DeleteFolder } from './_s3.js';

export async function onRequestPost(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  }

  const prefix = String(body.prefix || '').replace(/^\/+|\/+$/g, '');
  if (!isWritableFolder(prefix)) {
    return json({ error: 'Không được phép xoá thư mục này' }, 400);
  }

  const bucket = getBucket(env);

  try {
    if (bucket) {
      // Dấu "/" ở cuối rất quan trọng: đảm bảo xoá "projects/abc"
      // không đụng nhầm tới "projects/abc-xyz".
      let cursor;
      let total = 0;

      do {
        const listed = await bucket.list({ prefix: `${prefix}/`, cursor, limit: 1000 });
        const keys = listed.objects.map(o => o.key);

        if (keys.length > 0) {
          await bucket.delete(keys);
          total += keys.length;
        }

        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      return json({ success: true, count: total });
    }

    // Fallback qua S3 REST API
    const res = await s3DeleteFolder(env, prefix);
    return json(res);
  } catch (err) {
    console.error('Delete folder error:', err);
    return json({ error: 'Xoá thư mục thất bại: ' + err.message }, 500);
  }
}
