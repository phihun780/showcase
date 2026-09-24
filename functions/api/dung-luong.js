import { json, requireAuth, getBucket } from './_lib.js';
import { s3Request, s3ListBuckets } from './_s3.js';

// Gói miễn phí của Cloudflare R2 cho 10 GB lưu trữ.
//
// HẠN MỨC NÀY TÍNH CHO CẢ TÀI KHOẢN, không phải từng kho. Tài khoản đang có
// nhiều kho (trang này một kho, webapp khác vài kho nữa), nên đem một kho so
// với 10 GB là nhìn thấy còn nhiều hơn thực tế.
//
// Đây là con số của CLOUDFLARE — họ đổi thì sửa ở đây, một chỗ duy nhất.
//
// DÙNG 1000 CHỨ KHÔNG PHẢI 1024: Cloudflare tính 1 MB = 1.000.000 byte. Lấy
// 1024 thì cùng một kho mà CMS báo 281 MB còn trang của họ báo 294 MB, nhìn
// vào tưởng một trong hai đếm sai. Mục đích của ô này là đối chiếu với hạn mức
// của Cloudflare, nên phải đo bằng đúng cây thước của họ.
const MUC_MIEN_PHI = 10 * 1000 * 1000 * 1000;

// Một lần liệt kê trả tối đa 1000 file, nên phải đi tiếp bằng "thẻ đánh dấu"
// (continuation token) cho tới khi hết.
//
// Chặn ở 50 vòng (50.000 file mỗi kho) để lỡ có gì đó sai thì vòng lặp còn
// dừng được, chứ không chạy mãi và treo máy chủ.
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
    if (!kq.truncated) return { files, dayDu: true };
    cursor = kq.cursor;
  }
  return { files, dayDu: false };
}

/** Đếm một kho qua S3. `kho` để trống thì đếm kho mặc định của trang. */
async function demQuaS3(env, kho = null) {
  const files = [];
  let the = null;
  for (let vong = 0; vong < TOI_DA_VONG; vong++) {
    const q = { 'list-type': '2', 'max-keys': '1000' };
    if (the) q['continuation-token'] = the;

    const res = await s3Request({ method: 'GET', queryParams: q, env, kho });
    if (!res.ok) throw new Error(`Không liệt kê được kho ${kho || ''} (${res.status})`);

    const xml = await res.text();
    files.push(...docDanhSach(xml));

    the = conTiep(xml);
    if (!the) return { files, dayDu: true };
  }
  return { files, dayDu: false };
}

function gomTheoThuMuc(files) {
  const nhom = new Map();
  for (const f of files) {
    const ten = thuMucGoc(f.key);
    const cu = nhom.get(ten) || { ten, bytes: 0, soFile: 0 };
    cu.bytes += f.size;
    cu.soFile += 1;
    nhom.set(ten, cu);
  }
  return [...nhom.values()].sort((a, b) => b.bytes - a.bytes);
}

const cong = files => files.reduce((t, f) => t + f.size, 0);

/**
 * Dung lượng đang dùng trên R2.
 *
 * ĐẾM THẬT chứ không ước lượng: đi hết danh sách file rồi cộng cỡ từng cái.
 * Cloudflare không có sẵn API trả về tổng dung lượng, mà con số trên trang quản
 * trị của họ cũng cập nhật trễ vài tiếng.
 *
 * ĐẾM CẢ TÀI KHOẢN NẾU KHOÁ CHO PHÉP:
 * Hạn mức 10 GB tính cho cả tài khoản chứ không phải từng kho. Khoá R2 tạo
 * riêng cho một kho thì lệnh liệt kê danh sách kho bị từ chối — chuyện bình
 * thường, không phải hỏng. Khi đó lùi về đếm mỗi kho của trang này và nói rõ
 * trong `phamVi` để giao diện khỏi báo một con số dễ gây hiểu nhầm.
 *
 * Chỉ người đã đăng nhập CMS mới gọi được: danh sách file trong kho là thứ
 * không cần nói cho người lạ.
 */
export async function onRequestGet(context) {
  const denied = await requireAuth(context);
  if (denied) return denied;

  const { env } = context;

  // Khoá RIÊNG để đếm cả tài khoản, nếu có đặt.
  //
  // VÌ SAO KHÔNG DÙNG LUÔN KHOÁ CHÍNH:
  // Khoá chính có quyền GHI và XOÁ trên kho của trang này. Muốn đếm cả tài
  // khoản thì phải nới nó ra mọi kho — thành ra khoá của CMS đụng được cả dữ
  // liệu của webapp khác, và lỡ nó lộ thì mất nhiều hơn hẳn.
  //
  // Nên tách: một khoá thứ hai CHỈ ĐỌC, cấp trên mọi kho, chỉ dùng đúng cho
  // việc đếm này. Không đặt thì đoạn dưới tự lùi về đếm mỗi kho của trang.
  const envDem = env.R2_READ_ALL_ACCESS_KEY_ID && env.R2_READ_ALL_SECRET_ACCESS_KEY
    ? {
        ...env,
        R2_ACCESS_KEY_ID: env.R2_READ_ALL_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: env.R2_READ_ALL_SECRET_ACCESS_KEY,
        ACCESS_KEY_ID: env.R2_READ_ALL_ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: env.R2_READ_ALL_SECRET_ACCESS_KEY,
      }
    : env;

  try {
    // 1. Thử đếm cả tài khoản.
    //
    // Bỏ qua đường binding ở nhánh này: binding chỉ trỏ tới ĐÚNG MỘT kho, không
    // nhìn thấy kho nào khác, nên không dùng để đếm cả tài khoản được.
    let tenCacKho = null;
    try {
      tenCacKho = await s3ListBuckets(envDem);
    } catch {
      tenCacKho = null; // thiếu khoá S3 — xuống nhánh dưới
    }

    if (tenCacKho && tenCacKho.length) {
      const cacKho = [];
      let tong = 0;
      let dayDu = true;

      for (const ten of tenCacKho) {
        const kq = await demQuaS3(envDem, ten);
        const bytes = cong(kq.files);
        tong += bytes;
        if (!kq.dayDu) dayDu = false;
        cacKho.push({ ten, bytes, soFile: kq.files.length });
      }

      cacKho.sort((a, b) => b.bytes - a.bytes);

      // Kho của chính trang này, để vẫn xem được chi tiết theo thư mục.
      const khoTrang = env.R2_BUCKET_NAME || env.BUCKET_NAME || 'showcase';
      const cuaTrang = cacKho.find(k => k.ten === khoTrang) || null;

      return json({
        success: true,
        phamVi: 'taiKhoan',
        tong,
        soFile: cacKho.reduce((t, k) => t + k.soFile, 0),
        mucMienPhi: MUC_MIEN_PHI,
        conLai: Math.max(0, MUC_MIEN_PHI - tong),
        phanTram: (tong / MUC_MIEN_PHI) * 100,
        cacKho,
        khoTrang: cuaTrang,
        demDayDu: dayDu,
      });
    }

    // 2. Khoá chỉ thấy một kho — đếm kho của trang này thôi.
    const bucket = getBucket(env);
    const kq = bucket ? await demQuaBinding(bucket) : await demQuaS3(env);
    const tong = cong(kq.files);

    return json({
      success: true,
      phamVi: 'motKho',
      tong,
      soFile: kq.files.length,
      mucMienPhi: MUC_MIEN_PHI,
      conLai: Math.max(0, MUC_MIEN_PHI - tong),
      phanTram: (tong / MUC_MIEN_PHI) * 100,
      theoThuMuc: gomTheoThuMuc(kq.files),
      demDayDu: kq.dayDu,
    });
  } catch (e) {
    return json({ success: false, error: e.message || 'Không đọc được dung lượng kho' }, 500);
  }
}
