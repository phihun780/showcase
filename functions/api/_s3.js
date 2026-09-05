// S3 REST API client with AWS SigV4 using Web Crypto API.
// Cho phép Cloudflare Pages Functions đọc/ghi/xoá R2 trực tiếp
// ngay cả khi người dùng chưa gắn R2 bucket binding trong Cloudflare Dashboard.

const DEFAULT_ACCOUNT_ID = 'a0650e4cdd588f8cab25b3a13a282dc4';
const DEFAULT_ACCESS_KEY_ID = '72d7fdbd4e7fa547975af270f37f0800';
const DEFAULT_SECRET_ACCESS_KEY = '1af43a02ad0fa9c1219416cc9bd4f467fc0f47efb84e3107b2af0e04737fef2d';
const DEFAULT_BUCKET = 'showcase';

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const dataBuf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, dataBuf));
}

async function sha256Hex(data) {
  const dataBuf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', dataBuf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hex(uint8Array) {
  return Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function rfc3986(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildCanonicalQuery(queryParams = {}) {
  const keys = Object.keys(queryParams).sort();
  return keys
    .map(k => `${rfc3986(k)}=${rfc3986(queryParams[k])}`)
    .join('&');
}

export async function s3Request({ method = 'GET', key = '', queryParams = null, body = null, contentType = 'application/json', env = {} }) {
  const accId = env.R2_ACCOUNT_ID || env.ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
  const accKey = env.R2_ACCESS_KEY_ID || env.ACCESS_KEY_ID || DEFAULT_ACCESS_KEY_ID;
  const secretKey = env.R2_SECRET_ACCESS_KEY || env.SECRET_ACCESS_KEY || DEFAULT_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME || env.BUCKET_NAME || DEFAULT_BUCKET;

  const host = `${accId}.r2.cloudflarestorage.com`;
  const cleanKey = key.replace(/^\/+/, '');
  const path = cleanKey ? `/${bucket}/${cleanKey.split('/').map(rfc3986).join('/')}` : `/${bucket}`;
  const canonicalQuery = queryParams ? buildCanonicalQuery(queryParams) : '';
  const url = `https://${host}${path}${canonicalQuery ? '?' + canonicalQuery : ''}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = body ? await sha256Hex(body) : await sha256Hex('');

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = `${method}\n${path}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = hex(await hmacSha256(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    'Host': host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'Authorization': authHeader,
  };

  if (body && contentType) {
    headers['Content-Type'] = contentType;
  }

  const reqOptions = { method, headers };
  if (body && method !== 'GET' && method !== 'HEAD') {
    reqOptions.body = body;
  }

  return fetch(url, reqOptions);
}

export async function s3PutObject(env, key, body, contentType = 'application/json') {
  return s3Request({ method: 'PUT', key, body, contentType, env });
}

export async function s3GetObject(env, key) {
  return s3Request({ method: 'GET', key, env });
}

export async function s3DeleteObject(env, key) {
  return s3Request({ method: 'DELETE', key, env });
}

export async function s3DeleteFolder(env, prefix) {
  const cleanPrefix = prefix.replace(/^\/+|^\/+$/g, '');
  const listRes = await s3Request({ method: 'GET', queryParams: { prefix: `${cleanPrefix}/` }, env });
  if (!listRes.ok) return { success: false, error: 'Không thể liệt kê file trong thư mục' };

  const xml = await listRes.text();
  const keys = [];
  const regex = /<Key>(.*?)<\/Key>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    keys.push(match[1]);
  }

  for (const k of keys) {
    await s3DeleteObject(env, k);
  }

  return { success: true, count: keys.length };
}
