// Sao lưu toàn bộ nội dung trang về máy.
//
// VÌ SAO CẦN:
// Code nằm trên GitHub nên an toàn. Nhưng NỘI DUNG thì không: portfolio.json và
// toàn bộ ảnh nằm trên Cloudflare R2, không có trong git. Mất tài khoản
// Cloudflare, xoá nhầm bucket, hay ngưng trả tiền là mất sạch — code còn nguyên
// mà trang thì trống trơn.
//
// Script này chỉ ĐỌC, không ghi gì lên R2, và không cần chìa khoá: kho để công
// khai nên tải thẳng từ địa chỉ công khai là được.
//
// Chạy:  node scripts/sao-luu.mjs
// Kết quả: thư mục sao-luu/<ngày>/ gồm portfolio.json và mọi ảnh, giữ nguyên
// cấu trúc thư mục như trên kho.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const KHO = 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';
const CUNG_LUC = 8;          // tải mấy ảnh một lúc

const ngay = new Date().toISOString().slice(0, 10);
const thuMuc = path.join('sao-luu', ngay);

// Gom mọi địa chỉ ảnh nằm rải rác trong dữ liệu, ở bất kỳ độ sâu nào.
function gomAnh(x, ra = new Set()) {
  if (typeof x === 'string') {
    if (x.startsWith(KHO)) ra.add(x.split('?')[0]);
  } else if (Array.isArray(x)) {
    for (const v of x) gomAnh(v, ra);
  } else if (x && typeof x === 'object') {
    for (const v of Object.values(x)) gomAnh(v, ra);
  }
  return ra;
}

// Mỗi ảnh gốc còn kèm vài bản thu nhỏ, tên suy ra từ chính tên file.
function themBanThuNho(urls) {
  const ra = new Set(urls);
  for (const u of urls) {
    const m = u.match(/\.rs([\d-]+)\.([a-zA-Z0-9]+)$/);
    if (!m) continue;
    const cacCo = m[1].split('-').map(Number).filter(Boolean);
    const lonNhat = Math.max(...cacCo);
    for (const w of cacCo) {
      if (w === lonNhat) continue;            // bản lớn nhất chính là ảnh gốc
      ra.add(u.replace(/\.([a-zA-Z0-9]+)$/, `.${w}w.$1`));
    }
  }
  return [...ra];
}

async function taiMot(url) {
  const key = url.slice(KHO.length + 1);
  const dich = path.join(thuMuc, key);

  if (existsSync(dich)) return { key, bo_qua: true };

  const res = await fetch(url);
  if (!res.ok) return { key, loi: res.status };

  await mkdir(path.dirname(dich), { recursive: true });
  await writeFile(dich, Buffer.from(await res.arrayBuffer()));
  return { key, byte: (await readFile(dich)).length };
}

async function chay() {
  console.log(`Sao lưu vào  ${thuMuc}\n`);

  const res = await fetch(`${KHO}/data/portfolio.json?t=${Date.now()}`);
  if (!res.ok) {
    console.error(`Không đọc được portfolio.json (${res.status}). Dừng.`);
    process.exit(1);
  }
  const duLieu = await res.json();

  await mkdir(path.join(thuMuc, 'data'), { recursive: true });
  await writeFile(
    path.join(thuMuc, 'data', 'portfolio.json'),
    JSON.stringify(duLieu, null, 2)
  );
  console.log('  data/portfolio.json  ✓\n');

  const danhSach = themBanThuNho([...gomAnh(duLieu)]);
  console.log(`${danhSach.length} file ảnh (đã tính cả các bản thu nhỏ)\n`);

  let xong = 0, boQua = 0, loi = 0, tong = 0;

  for (let i = 0; i < danhSach.length; i += CUNG_LUC) {
    const lo = await Promise.all(danhSach.slice(i, i + CUNG_LUC).map(taiMot));
    for (const k of lo) {
      if (k.bo_qua) { boQua++; continue; }
      if (k.loi) { loi++; console.warn(`  ✗ ${k.key} (${k.loi})`); continue; }
      xong++; tong += k.byte;
    }
    process.stdout.write(`\r  ${xong + boQua + loi}/${danhSach.length}`);
  }

  console.log(`\n\nXong: ${xong} file mới, ${boQua} đã có sẵn, ${loi} lỗi`);
  console.log(`Dung lượng tải về: ${(tong / 1048576).toFixed(1)} MB`);
  if (loi > 0) {
    console.log('\nCác file lỗi thường là ảnh đã xoá khỏi kho nhưng còn sót địa chỉ trong dữ liệu.');
  }
}

chay().catch(err => {
  console.error('\nHỏng:', err.message);
  process.exit(1);
});
