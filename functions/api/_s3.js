// S3 REST API client with AWS SigV4 using Web Crypto API.
// Cho phép Cloudflare Pages Functions đọc/ghi/xoá R2 trực tiếp
// ngay cả khi người dùng chưa gắn R2 bucket binding trong Cloudflare Dashboard.

// KHÔNG viết khoá vào đây.
//
// Ba dòng này trước đây là khoá R2 thật, viết cứng làm giá trị mặc định — mà
// repo thì công khai trên GitHub. Ai mở file này ra cũng có quyền đọc, ghi, xoá
// toàn bộ kho: không cần CMS, không cần mã PIN, không cần gì cả.
//
// Giờ bắt buộc lấy từ biến môi trường. Thiếu thì báo lỗi rõ ràng chứ không âm
// thầm chạy bằng một khoá nào đó.
const TEN_KHO_MAC_DINH = 'showcase';   // tên kho không phải bí mật

function dayDuKhoa(env) {
  const accId = env.R2_ACCOUNT_ID || env.ACCOUNT_ID;
  const accKey = env.R2_ACCESS_KEY_ID || env.ACCESS_KEY_ID;
  const secretKey = env.R2_SECRET_ACCESS_KEY || env.SECRET_ACCESS_KEY;

  if (!accId || !accKey || !secretKey) {
    throw new Error(
      'Thiếu khoá R2. Vào Cloudflare → Workers & Pages → dự án → Settings → ' +
      'Variables and Secrets, thêm R2_ACCOUNT_ID, R2_ACCESS_KEY_ID và ' +
      'R2_SECRET_ACCESS_KEY.'
    );
  }

  return { accId, accKey, secretKey, bucket: env.R2_BUCKET_NAME || env.BUCKET_NAME || TEN_KHO_MAC_DINH };
}

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

/**
 * Gọi S3 API của R2, đã ký sẵn.
 *
 * `kho` để nhắm sang một kho KHÁC kho mặc định — cần khi đếm dung lượng của cả
 * tài khoản. Đặt `goc: true` thì gọi vào gốc tài khoản (không kho nào), dùng
 * cho lệnh liệt kê danh sách kho.
 */
export async function s3Request({ method = 'GET', key = '', queryParams = null, body = null, contentType = 'application/json', env = {}, kho = null, goc = false }) {
  const { accId, accKey, secretKey, bucket: khoMacDinh } = dayDuKhoa(env);
  const bucket = kho || khoMacDinh;

  const host = `${accId}.r2.cloudflarestorage.com`;
  const cleanKey = key.replace(/^\/+/, '');
  const path = goc
    ? '/'
    : cleanKey ? `/${bucket}/${cleanKey.split('/').map(rfc3986).join('/')}` : `/${bucket}`;
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

// Một lần liệt kê trả tối đa 1000 file. Chặn ở 50 vòng (50.000 file) để lỡ có
// gì sai thì vòng lặp còn dừng được, chứ không chạy mãi và treo máy chủ.
const TOI_DA_VONG_XOA = 50;

// Xoá bao nhiêu file cùng lúc. Xoá tuần tự thì 1000 file là 1000 lượt chờ nối
// đuôi nhau — đủ lâu để Cloudflare cắt ngang giữa chừng.
const XOA_CUNG_LUC = 8;

/** Trả lại mấy ký tự XML đã được mã hoá trong tên file. */
function boMaXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');   // phải để cuối, không thì giải mã hai lần
}

/**
 * Xoá sạch một thư mục trong kho.
 *
 * BỐN LỖI BẢN CŨ MẮC PHẢI, ghi lại để đừng ai viết lại như vậy:
 *
 * 1. KHÔNG ĐI HẾT DANH SÁCH. Một lệnh liệt kê chỉ trả tối đa 1000 file, mà bản
 *    cũ gọi đúng một lần rồi thôi. Thư mục quá 1000 file thì nó xoá 1000 cái
 *    đầu, bỏ lại phần còn lại, mà VẪN BÁO THÀNH CÔNG. Người dùng tưởng đã dọn
 *    sạch, thực tế còn nguyên một đống rác không ai tìm ra nữa.
 *
 * 2. CẮT DẤU GẠCH CUỐI SAI. Biểu thức cũ là `/^\/+|^\/+$/g` — vế thứ hai có
 *    dấu `^` thừa nên chỉ khớp chuỗi TOÀN dấu gạch. Truyền vào "projects/abc/"
 *    thì dấu gạch cuối không bị cắt, ghép thêm "/" nữa thành "projects/abc//",
 *    không khớp file nào, và lại báo thành công với số đếm 0.
 *
 * 3. KHÔNG KIỂM TỪNG LỆNH XOÁ. `s3DeleteObject` trả về một Response nhưng bản
 *    cũ không hề xem nó thành công hay không, cứ thế đếm là đã xoá.
 *
 * 4. XOÁ TUẦN TỰ. 1000 file là 1000 lượt chờ nối đuôi nhau.
 *
 * Đường đi qua R2 binding trong delete-folder.js vốn đã phân trang đúng. Nhưng
 * trang thật KHÔNG gắn binding — nó chạy đúng vào hàm này, nên lỗi là lỗi thật
 * chứ không phải lỗi trên lý thuyết.
 */
export async function s3DeleteFolder(env, prefix) {
  const sach = prefix.replace(/^\/+|\/+$/g, '');
  if (!sach) return { success: false, error: 'Thiếu tên thư mục' };

  // Dấu "/" ở cuối rất quan trọng: xoá "projects/abc" không được đụng nhầm
  // tới "projects/abc-xyz".
  const tienTo = `${sach}/`;

  let daXoa = 0;
  let loi = 0;
  let the = null;

  for (let vong = 0; vong < TOI_DA_VONG_XOA; vong++) {
    const q = { 'list-type': '2', 'max-keys': '1000', prefix: tienTo };
    if (the) q['continuation-token'] = the;

    const listRes = await s3Request({ method: 'GET', queryParams: q, env });
    if (!listRes.ok) {
      return { success: false, error: `Không liệt kê được thư mục (${listRes.status})`, count: daXoa };
    }

    const xml = await listRes.text();

    const keys = [];
    const re = /<Key>([\s\S]*?)<\/Key>/g;
    let m;
    while ((m = re.exec(xml)) !== null) keys.push(boMaXml(m[1]));

    for (let i = 0; i < keys.length; i += XOA_CUNG_LUC) {
      const lo = keys.slice(i, i + XOA_CUNG_LUC);
      const kq = await Promise.all(lo.map(async (k) => {
        try {
          const r = await s3DeleteObject(env, k);
          // S3 trả 204 khi xoá xong, và cũng trả 204 khi file vốn không có —
          // cả hai đều coi như xong việc.
          return r.ok || r.status === 404;
        } catch {
          return false;
        }
      }));
      for (const ok of kq) ok ? daXoa++ : loi++;
    }

    const conTiep = /<IsTruncated>true<\/IsTruncated>/i.test(xml);
    const theTiep = (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1];
    if (!conTiep || !theTiep) {
      return loi > 0
        ? { success: false, error: `Xoá được ${daXoa} file, ${loi} file thất bại`, count: daXoa, loi }
        : { success: true, count: daXoa };
    }
    the = theTiep;
  }

  // Chạm trần vòng lặp: nói thẳng là chưa xoá hết, đừng báo thành công.
  return {
    success: false,
    error: `Thư mục quá lớn, mới xoá được ${daXoa} file. Chạy lại để xoá tiếp.`,
    count: daXoa,
  };
}

/**
 * Danh sách mọi kho trong tài khoản.
 *
 * Trả về null nếu khoá không có quyền — khoá R2 tạo riêng cho MỘT kho thì gọi
 * lệnh này bị từ chối, và đó là chuyện bình thường chứ không phải hỏng. Bên gọi
 * tự quyết làm gì tiếp.
 */
export async function s3ListBuckets(env) {
  const res = await s3Request({ method: 'GET', goc: true, env });
  if (!res.ok) return null;

  const xml = await res.text();
  const ten = [];
  const re = /<Bucket>[\s\S]*?<Name>([\s\S]*?)<\/Name>[\s\S]*?<\/Bucket>/g;
  let m;
  while ((m = re.exec(xml)) !== null) ten.push(m[1]);
  return ten;
}
