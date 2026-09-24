/**
 * Sinh bản thu nhỏ cho những ảnh tải lên từ TRƯỚC khi CMS có tính năng đó.
 *
 * VẤN ĐỀ NÓ GIẢI QUYẾT:
 * Ảnh tải lên bây giờ được sinh kèm bản 480px và 1440px, trình duyệt tự chọn
 * bản nhẹ nhất đủ nét. Ảnh cũ chỉ có một file duy nhất, nên trang đành gửi ảnh
 * gốc cho mọi người — kể cả điện thoại. Đo trên kho thật: 114 ảnh như vậy,
 * tổng 41 MB, trong khi nếu có bản thu nhỏ thì khách chỉ tải 3,3 MB.
 *
 * NÓ LÀM GÌ:
 *   1. Đọc portfolio.json, lọc ra ảnh chưa có phần đánh dấu `.rs...` trong tên
 *   2. Tải từng ảnh về, sinh bản 480px và 1440px
 *   3. Đẩy lên R2 dưới tên MỚI có phần đánh dấu
 *   4. Ghi lại portfolio.json trỏ sang tên mới
 *
 * NÓ KHÔNG LÀM GÌ:
 *   - KHÔNG xoá gì cả. Ảnh cũ nằm nguyên trong kho, muốn lùi lại thì đổi
 *     portfolio.json về là xong (bản cũ được lưu lại ở scripts/../sao-luu).
 *   - KHÔNG đụng vào GIF. Nén GIF là mất ảnh động.
 *   - KHÔNG nén lại ảnh WebP còn nguyên cỡ. Nén lại một ảnh đã nén là mất chất
 *     thêm một lần nữa mà chẳng được bao nhiêu; giữ nguyên byte gốc.
 *
 * CHẠY:
 *   node scripts/doi-anh-cu.mjs          # chỉ xem sẽ làm gì, không ghi gì
 *   node scripts/doi-anh-cu.mjs --that   # làm thật
 *
 * Cần `npm install sharp` và khoá R2 trong .env.local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const GOC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LAM_THAT = process.argv.includes('--that');

// Phải khớp RESPONSIVE_WIDTHS trong src/utils/responsiveImage.js.
const CAC_CO = [480, 1440];

// CMS thu ảnh về tối đa 2560px lúc tải lên; ảnh cũ cũng theo đúng mức đó.
const CO_TOI_DA = 2560;

// Chất lượng WebP, khớp với imageOptimizer.js.
const CHAT_LUONG = 90;

// Làm mấy ảnh cùng lúc. Cao quá thì R2 bắt đầu từ chối, thấp quá thì chờ lâu.
const CUNG_LUC = 4;

// ---------------------------------------------------------------------------

function docEnv() {
  const p = path.join(GOC, '.env.local');
  if (!fs.existsSync(p)) throw new Error('Không thấy .env.local');
  const env = {};
  for (const dong of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const i = dong.indexOf('=');
    if (i === -1) continue;
    // Notepad lưu file kèm một dấu vô hình ở đầu (BOM) — cắt đi.
    env[dong.slice(0, i).trim().replace(/^﻿/, '')] = dong.slice(i + 1).trim();
  }
  return env;
}

const env = docEnv();
const KHO = env.VITE_R2_BUCKET_NAME || 'showcase';
const CONG_KHAI = (env.VITE_R2_PUBLIC_URL || 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev').replace(/\/+$/, '') + '/';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

/** Mọi địa chỉ ảnh nằm trong dữ liệu, không trùng lặp. */
function gomAnh(data) {
  const ra = new Set();
  const di = (o) => {
    if (!o) return;
    if (Array.isArray(o)) o.forEach(di);
    else if (typeof o === 'object') Object.values(o).forEach(di);
    else if (typeof o === 'string' && /^https?:.*\.(webp|png|jpe?g|gif)/i.test(o)) ra.add(o.split('?')[0]);
  };
  di(data);
  return [...ra];
}

const daCoBanNho = (u) => /\.rs[\d-]+\./.test(u);
const laGif = (u) => /\.gif$/i.test(u);

/** "anh.png" + [480,1440,1920] -> "anh.rs480-1440-1920.webp" */
function tenMoi(key, thang) {
  const dot = key.lastIndexOf('.');
  const than = dot === -1 ? key : key.slice(0, dot);
  return `${than}.rs${thang.join('-')}.webp`;
}

async function day(key, body, kieu) {
  await s3.send(new PutObjectCommand({
    Bucket: KHO,
    Key: key,
    Body: body,
    ContentType: kieu,
    CacheControl: 'public, max-age=31536000',
  }));
}

async function lamMotAnh(url) {
  const key = url.startsWith(CONG_KHAI) ? url.slice(CONG_KHAI.length) : null;
  if (!key) return { url, bo: 'không nằm trong kho của trang' };

  const res = await fetch(url);
  if (!res.ok) return { url, bo: `tải về lỗi ${res.status}` };
  const goc = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(goc).metadata();
  const rongGoc = meta.width || 0;
  if (!rongGoc) return { url, bo: 'không đọc được kích thước' };

  const rongChinh = Math.min(rongGoc, CO_TOI_DA);

  // Chỉ sinh bản NHỎ HƠN hẳn ảnh chính. Ảnh vốn đã nhỏ thì thêm bản thu nhỏ
  // chẳng được gì, mà còn rác thêm file trong kho.
  const coCanSinh = CAC_CO.filter(w => w <= rongChinh * 0.9);
  if (coCanSinh.length === 0) {
    return { url, bo: `ảnh nhỏ sẵn (${rongGoc}px), không cần bản thu nhỏ` };
  }

  const thang = [...coCanSinh, rongChinh];
  const keyMoi = tenMoi(key, thang);

  // Ảnh chính: WebP còn nguyên cỡ thì GIỮ NGUYÊN BYTE, không nén lại.
  // Nén lại ảnh đã nén là mất chất thêm một lần mà gần như không nhẹ hơn.
  const giuNguyen = meta.format === 'webp' && rongGoc <= CO_TOI_DA;
  const anhChinh = giuNguyen
    ? goc
    : await sharp(goc).resize({ width: rongChinh, withoutEnlargement: true })
        .webp({ quality: CHAT_LUONG }).toBuffer();

  const banNho = await Promise.all(coCanSinh.map(async (w) => ({
    w,
    buf: await sharp(goc).resize({ width: w, withoutEnlargement: true })
      .webp({ quality: CHAT_LUONG }).toBuffer(),
  })));

  const ketQua = {
    url,
    urlMoi: CONG_KHAI + keyMoi,
    rongGoc,
    giuNguyen,
    cuGoc: goc.length,
    coChinh: anhChinh.length,
    banNho: banNho.map(b => ({ w: b.w, co: b.buf.length })),
  };

  if (!LAM_THAT) return ketQua;

  await day(keyMoi, anhChinh, 'image/webp');
  for (const b of banNho) {
    await day(keyMoi.replace(/\.rs([\d-]+)\.webp$/, `.rs$1.${b.w}w.webp`), b.buf, 'image/webp');
  }
  return ketQua;
}

// ---------------------------------------------------------------------------

const kb = (n) => (n / 1024).toFixed(0).padStart(6);

async function chay() {
  console.log(LAM_THAT ? '>>> LÀM THẬT — sẽ ghi lên R2\n' : '>>> CHỈ XEM THỬ, không ghi gì (thêm --that để làm thật)\n');

  const data = await (await fetch(`${CONG_KHAI}data/portfolio.json?t=${Date.now()}`)).json();
  const canLam = gomAnh(data).filter(u => !daCoBanNho(u) && !laGif(u));
  console.log(`Có ${canLam.length} ảnh cần sinh bản thu nhỏ.\n`);

  const xong = [];
  const boQua = [];
  const hong = [];

  for (let i = 0; i < canLam.length; i += CUNG_LUC) {
    const lo = canLam.slice(i, i + CUNG_LUC);
    const kq = await Promise.all(lo.map(async (u) => {
      try { return await lamMotAnh(u); }
      catch (e) { return { url: u, loi: e.message || String(e) }; }
    }));

    for (const r of kq) {
      if (r.loi) { hong.push(r); console.log(`  ✗ ${r.url.split('/').pop().slice(0, 44)} — ${r.loi}`); }
      else if (r.bo) { boQua.push(r); console.log(`  – ${r.url.split('/').pop().slice(0, 44)} — ${r.bo}`); }
      else {
        xong.push(r);
        const nhoNhat = Math.min(...r.banNho.map(b => b.co));
        console.log(`  ✓ ${kb(r.cuGoc)} KB → ${kb(r.coChinh)} KB chính, ${kb(nhoNhat)} KB bản nhỏ nhất   ${r.url.split('/').pop().slice(0, 40)}`);
      }
    }
    console.log(`    … ${Math.min(i + CUNG_LUC, canLam.length)}/${canLam.length}`);
  }

  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  const cuTong = xong.reduce((a, b) => a + b.cuGoc, 0);

  // Khách tải bản NÀO là do bề ngang khung ảnh quyết định, không phải ảnh
  // chính. Cộng theo từng cỡ mới ra đúng thứ người ta thật sự tải về — cộng
  // theo ảnh chính thì ra con số vô nghĩa, vì hiếm khung nào dùng tới nó.
  const theoCo = (w) => xong.reduce((a, b) => {
    const ban = b.banNho.find(x => x.w === w);
    // Ảnh không có bản cỡ đó (vì vốn đã hẹp hơn) thì đành lấy ảnh chính.
    return a + (ban ? ban.co : b.coChinh);
  }, 0);

  const themVaoKho = xong.reduce((a, b) => a + b.coChinh + b.banNho.reduce((x, y) => x + y.co, 0), 0);

  console.log('\n──────────────────────────────────────────────');
  console.log(`Làm được       : ${xong.length}`);
  console.log(`Bỏ qua         : ${boQua.length}`);
  console.log(`Hỏng           : ${hong.length}`);
  console.log('');
  console.log(`Khách ĐANG tải           : ${mb(cuTong)}  (ảnh gốc, ai cũng phải tải)`);
  console.log(`Sau khi đổi, điện thoại  : ${mb(theoCo(480))}`);
  console.log(`Sau khi đổi, màn hình lớn: ${mb(theoCo(1440))}`);
  console.log(`Kho tăng thêm            : ${mb(themVaoKho)}`);

  if (hong.length) {
    console.log('\nCÓ ẢNH HỎNG — không ghi lại portfolio.json. Sửa xong rồi chạy lại.');
    return;
  }
  if (!LAM_THAT) {
    console.log('\nMới là xem thử. Thêm --that để làm thật.');
    return;
  }

  // Đổi địa chỉ trong dữ liệu. Thay trên chuỗi JSON thô để bắt được mọi chỗ
  // nhắc tới cùng một tấm ảnh — ảnh bìa và ảnh trong bộ sưu tập hay là một.
  let tho = JSON.stringify(data);
  for (const r of xong) tho = tho.split(r.url).join(r.urlMoi);
  const moi = JSON.parse(tho);
  moi.updatedAt = new Date().toISOString();

  const luu = path.join(GOC, 'sao-luu', `doi-anh-${Date.now()}`);
  fs.mkdirSync(luu, { recursive: true });
  fs.writeFileSync(path.join(luu, 'portfolio-truoc-khi-doi.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(path.join(luu, 'bang-doi-dia-chi.json'), JSON.stringify(xong.map(r => ({ cu: r.url, moi: r.urlMoi })), null, 2));

  await day('data/portfolio.json', JSON.stringify(moi), 'application/json');

  console.log(`\nĐã ghi lại portfolio.json.`);
  console.log(`Bản trước khi đổi và bảng đối chiếu để ở: ${path.relative(GOC, luu)}`);
}

chay().catch(e => { console.error('\nLỖI:', e.message || e); process.exit(1); });
