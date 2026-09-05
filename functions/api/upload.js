import { json, requireAuth, isWritableKey, getBucket, PUBLIC_R2_URL } from './_lib.js';
import { s3PutObject } from './_s3.js';

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = [
  'image/webp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/avif',
  'image/svg+xml',
];

const EXT_BY_TYPE = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

// Làm sạch đường dẫn lưu trữ do CMS gửi lên. Trả về null nếu không hợp lệ.
function sanitizeKey(rawKey, contentType) {
  if (rawKey && typeof rawKey === 'string') {
    const key = rawKey.trim().replace(/^\/+/, '');
    const isSafe = /^[a-zA-Z0-9._/-]+$/.test(key) && !key.includes('..') && !key.endsWith('/');
    if (isSafe && isWritableKey(key)) return key;
    return null;
  }

  // Không có key thì tự sinh vào thư mục uploads
  const ext = EXT_BY_TYPE[contentType] || 'webp';
  return `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
}

export async function onRequestPost(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || (typeof file.stream !== 'function' && typeof file.arrayBuffer !== 'function')) {
      return json({ error: 'Thiếu file cần tải lên' }, 400);
    }
    if (file.size === 0) {
      return json({ error: 'File rỗng' }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: 'File vượt quá giới hạn 25MB' }, 413);
    }

    const contentType = String(formData.get('contentType') || file.type || 'image/webp')
      .toLowerCase()
      .split(';')[0]
      .trim();

    if (!ALLOWED_TYPES.includes(contentType)) {
      return json({ error: `Định dạng không được phép: ${contentType}` }, 415);
    }

    const key = sanitizeKey(formData.get('key'), contentType);
    if (!key) {
      return json({ error: 'Đường dẫn lưu trữ không hợp lệ' }, 400);
    }

    const bucket = getBucket(env);
    if (bucket) {
      await bucket.put(key, file.stream(), {
        httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      });
      return json({ success: true, url: `${PUBLIC_R2_URL}/${key}`, key });
    }

    // Fallback qua S3 REST API
    const buffer = await file.arrayBuffer();
    const s3Res = await s3PutObject(env, key, buffer, contentType);
    if (s3Res.ok) {
      return json({ success: true, url: `${PUBLIC_R2_URL}/${key}`, key });
    }

    const errText = await s3Res.text();
    console.error('S3 Upload error:', errText);
    return json({ error: 'Tải ảnh lên qua S3 API thất bại: ' + s3Res.status }, 500);
  } catch (err) {
    console.error('Upload error:', err);
    return json({ error: 'Tải ảnh lên thất bại: ' + err.message }, 500);
  }
}
