import { json, requireAuth, getBucket } from './_lib.js';
import { s3Request } from './_s3.js';

// Gói miễn phí của Cloudflare R2 cho 10 GB lưu trữ.
//
// Đây là con số của CLOUDFLARE, không phải của trang này — họ đổi thì phải sửa
// ở đây. Để một chỗ duy nhất nên sửa một dòng là xong.
const MUC_MIEN_PHI = 10 * 1024 * 1024 * 1024;

// Một lần liệt kê trả tối đa 1000 file. Kho ảnh của trang nhiều hơn thế nên
// phải đi tiếp bằng "thẻ đánh dấu" (continuation token) cho tới khi hết.
//
// Chặn ở 50 vòng (50.000 file) để lỡ có gì đó sai thì vòng lặp còn dừng được,
// chứ không chạy mãi và treo máy chủ.
const TOI_DA_VONG = 50;

/** Gom từng khối <Contents> để lấy đúng cặp Key + Size của cùng một file. */
function docDanhSach(xml) {
  const ds = [];
  const khoi = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m;
  while ((m = khoi.exec(xml)) !== null) {
    const than = m[1];
    const key = (than.match(/<Key>([\s\S]*?)<\/Key>/) || [])[1];
    const size = Number((than.match(/<Size>(\d+)<\/Size>/) || [])[1] || 0);
    if (key) ds.push({ key, size });
  }
  return ds;
}

function conTiep(xml) {
  const con = /<IsTruncated>true<\/IsTruncated>/i.test(xml);
  const the = (xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1];
  return con && the ? the : null;
}

/** Tên thư mục gốc của một file, để chia nhóm cho dễ nhìn. */
function thuMucGoc(key) {
  const i = key.indexOf('/');
  return i === -1 ? '(ngoài thư mục)' : key.slice(0, i);
}

async function demQuaBinding(bucket) {
  const files = [];
  let cursor;
  for (let vong = 0; vong < TOI_DA_VONG; vong++) {
    const kq = await bucket.list({ limit: 1000, cursor });
    for (const o of kq.objects || []) files.push({ key: o.key, size: o.size || 0 });
    if (!kq.truncated) return files;
    cursor = kq.cursor;
  }
  return files;
}

async function demQuaS3(env) {
  const files = [];
  let the = null;
  for (let vong = 0; vong < TOI_DA_VONG; vong++) {
    const q = { 'list-type': '2', 'max-keys': '1000' };
    if (the) q['continuation-token'] = the;

    const res = await s3Request({ method: 'GET', queryParams: q, env });
    if (!res.ok) throw new Error(`Không liệt kê được kho (${res.status})`);

    const xml = await res.text();
    files.push(...docDanhSach(xml));

    the = conTiep(xml);
    if (!the) return files;
  }
  return files;
}

/**
 * Dung lượng đang dùng trên R2.
 *
 * ĐẾM THẬT chứ không ước lượng: đi hết danh sách file trong kho rồi cộng cỡ
 * từng cái. Cloudflare không có sẵn API trả về tổng dung lượng bucket, mà con
 * số trên trang quản trị của họ cũng cập nhật trễ vài tiếng.
 *
 * Chỉ người đã đăng nhập CMS mới gọi được: danh sách file trong kho là thứ
 * không cần nói cho người lạ.
 */
export async function onRequestGet(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  try {
    const bucket = getBucket(context.env);
    const files = bucket ? await demQuaBinding(bucket) : await demQuaS3(context.env);

    let tong = 0;
    const nhom = new Map();

    for (const f of files) {
      tong += f.size;
      const ten = thuMucGoc(f.key);
      const cu = nhom.get(ten) || { ten, bytes: 0, soFile: 0 };
      cu.bytes += f.size;
      cu.soFile += 1;
      nhom.set(ten, cu);
    }

    return json({
      success: true,
      tong,
      soFile: files.length,
      mucMienPhi: MUC_MIEN_PHI,
      conLai: Math.max(0, MUC_MIEN_PHI - tong),
      phanTram: MUC_MIEN_PHI > 0 ? (tong / MUC_MIEN_PHI) * 100 : 0,
      // Nặng nhất lên đầu — cần dọn kho thì nhìn phát biết dọn chỗ nào.
      theoThuMuc: [...nhom.values()].sort((a, b) => b.bytes - a.bytes),
      // Đếm tới đây là hết kho, hay đã chạm trần vòng lặp?
      demDayDu: files.length < TOI_DA_VONG * 1000,
    });
  } catch (e) {
    return json({ success: false, error: e.message || 'Không đọc được dung lượng kho' }, 500);
  }
}
