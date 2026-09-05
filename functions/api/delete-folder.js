import { json, requireAuth, isWritableFolder } from './_lib.js';

export async function onRequestPost(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { request, env } = context;
  if (!env.PORTFOLIO_ASSETS) {
    return json({ error: 'Chưa gắn kho R2 (PORTFOLIO_ASSETS) cho dự án' }, 500);
  }

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

  try {
    // Dấu "/" ở cuối rất quan trọng: đảm bảo xoá "projects/abc"
    // không đụng nhầm tới "projects/abc-xyz".
    let cursor;
    let total = 0;

    do {
      const listed = await env.PORTFOLIO_ASSETS.list({ prefix: `${prefix}/`, cursor, limit: 1000 });
      const keys = listed.objects.map(o => o.key);

      if (keys.length > 0) {
        await env.PORTFOLIO_ASSETS.delete(keys);
        total += keys.length;
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    return json({ success: true, count: total });
  } catch (err) {
    console.error('Delete folder error:', err);
    return json({ error: 'Xoá thư mục thất bại' }, 500);
  }
}
