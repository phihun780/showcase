/**
 * Kiểm hàm xoá thư mục (s3DeleteFolder) bằng một kho R2 GIẢ.
 *
 * VÌ SAO CÓ FILE NÀY:
 * Hàm đó xoá thật, xoá là mất, nên không thể lấy kho thật ra mà thử. Bản giả
 * bên dưới bắt chước đúng cách S3 phân trang — trả khoá theo thứ tự từ điển,
 * thẻ đánh dấu là khoá cuối đã trả — nên chạy được mọi tình huống khó mà không
 * đụng tới một file nào.
 *
 * Bản trước của hàm này hỏng 5 trong 6 tình huống dưới đây: thư mục quá 1000
 * file thì xoá dở rồi báo thành công, dấu gạch cuối làm nó xoá 0 file cũng báo
 * thành công, tên file có dấu & thì xoá nhầm khoá, và lệnh xoá thất bại vẫn
 * được đếm là xong.
 *
 * CHẠY:  npm run thu-xoa
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

// Thư mục dự án có dấu cách, nên phải đổi bằng fileURLToPath —
// `new URL(...).pathname` mã hoá dấu cách thành %20 và mở file không ra.
const GOC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NGUON = path.join(GOC, 'functions', 'api', '_s3.js');
let src = readFileSync(NGUON, 'utf8');

// Cắt bỏ phần ký AWS — chỉ giữ logic phân trang/xoá, thay s3Request và
// s3DeleteObject bằng bản giả.
src = src.replace(/export async function s3Request[\s\S]*?\n}\n/, '');
src = src.replace(/export async function s3PutObject[\s\S]*?\n}\n/, '');
src = src.replace(/export async function s3GetObject[\s\S]*?\n}\n/, '');
src = src.replace(/export async function s3DeleteObject[\s\S]*?\n}\n/, '');
src = src.replace(/export async function s3ListBuckets[\s\S]*?\n}\n/, '');
src = src.replace(/^import .*$/gm, '');

const gia = `
let KHO, GOI_LIET_KE, DA_XOA, EP_LOI_XOA;
export function datKho(k, epLoi = new Set()) { KHO = [...k]; GOI_LIET_KE = 0; DA_XOA = []; EP_LOI_XOA = epLoi; }
export function ketQua() { return { conLai: [...KHO], daXoa: [...DA_XOA], soLanLietKe: GOI_LIET_KE }; }

// Giả lập ĐÚNG cách S3 phân trang: trả khoá theo thứ tự từ điển, và thẻ đánh
// dấu là KHOÁ CUỐI đã trả — trang sau lấy những khoá lớn hơn nó.
//
// Bản đầu tui giả lập bằng chỉ số trong mảng, nhưng mảng co lại sau mỗi lần
// xoá nên chỉ số lệch và bài kiểm báo sai. S3 thật không có chuyện đó: khoá đã
// xoá nằm TRƯỚC thẻ, nên đi tiếp vẫn đúng.
async function s3Request({ queryParams }) {
  GOI_LIET_KE++;
  const tienTo = queryParams.prefix || '';
  const the = queryParams['continuation-token'] || '';
  const khop = KHO.filter(k => k.startsWith(tienTo)).sort();
  const conLai = the ? khop.filter(k => k > the) : khop;
  const lo = conLai.slice(0, 1000);
  const con = conLai.length > 1000;
  const xml = '<?xml version="1.0"?><ListBucketResult>'
    + lo.map(k => '<Contents><Key>' + k.replace(/&/g, '&amp;') + '</Key><Size>1</Size></Contents>').join('')
    + '<IsTruncated>' + con + '</IsTruncated>'
    + (con ? '<NextContinuationToken>' + lo[lo.length - 1] + '</NextContinuationToken>' : '')
    + '</ListBucketResult>';
  return { ok: true, status: 200, text: async () => xml };
}

async function s3DeleteObject(env, key) {
  if (EP_LOI_XOA.has(key)) return { ok: false, status: 500 };
  const i = KHO.indexOf(key);
  if (i >= 0) KHO.splice(i, 1);
  DA_XOA.push(key);
  return { ok: true, status: 204 };
}
`;

// File tạm để ngoài repo cho khỏi lẫn vào mã nguồn.
const tam = path.join(os.tmpdir(), '_s3-gia-' + Date.now() + '.mjs');
writeFileSync(tam, gia + src);
const M = await import(pathToFileURL(tam).href + '?t=' + Date.now());

const kq = [];
const thu = (ten, dat, dung) => kq.push({ ten, dat, dung });

// 1. Thư mục 2500 file — đúng trường hợp bản cũ làm sai
{
  const files = Array.from({ length: 2500 }, (_, i) => `projects/abc/f${i}.webp`);
  files.push('projects/abc-xyz/khac.webp');   // KHÔNG được đụng tới
  files.push('projects/khac/nua.webp');
  M.datKho(files);
  const r = await M.s3DeleteFolder({}, 'projects/abc');
  const s = M.ketQua();
  thu('2500 file: xoá hết, không đụng thư mục tên gần giống',
    `success=${r.success} count=${r.count} sốLầnLiệtKê=${s.soLanLietKe} cònLại=${s.conLai.length}`,
    r.success === true && r.count === 2500 && s.conLai.length === 2
      && s.conLai.includes('projects/abc-xyz/khac.webp'));
}

// 2. Dấu gạch cuối — bản cũ trả về count 0
{
  M.datKho(['projects/abc/1.webp', 'projects/abc/2.webp']);
  const r = await M.s3DeleteFolder({}, 'projects/abc/');
  thu('truyền vào "projects/abc/" có dấu gạch cuối',
    `success=${r.success} count=${r.count}`, r.success === true && r.count === 2);
}

// 3. Tên file có ký tự &
{
  M.datKho(['projects/abc/a&b.webp', 'projects/abc/c.webp']);
  await M.s3DeleteFolder({}, 'projects/abc');
  const s = M.ketQua();
  thu('tên file có dấu &', `đãXoá=${JSON.stringify(s.daXoa)}`,
    s.daXoa.includes('projects/abc/a&b.webp'));
}

// 4. Một file xoá hỏng — phải báo thất bại
{
  M.datKho(['projects/abc/1.webp', 'projects/abc/2.webp'], new Set(['projects/abc/2.webp']));
  const r = await M.s3DeleteFolder({}, 'projects/abc');
  thu('một file xoá hỏng', `success=${r.success} count=${r.count} lỗi=${r.loi}`,
    r.success === false && r.count === 1 && r.loi === 1);
}

// 5. Thư mục rỗng
{
  M.datKho(['projects/khac/1.webp']);
  const r = await M.s3DeleteFolder({}, 'projects/abc');
  thu('thư mục rỗng', `success=${r.success} count=${r.count}`,
    r.success === true && r.count === 0);
}

// 6. Tiền tố rỗng — không được xoá cả kho
{
  M.datKho(['a.webp', 'b.webp']);
  const r = await M.s3DeleteFolder({}, '///');
  const s = M.ketQua();
  thu('tiền tố rỗng: phải từ chối, không xoá gì',
    `success=${r.success} cònLại=${s.conLai.length}`,
    r.success === false && s.conLai.length === 2);
}

let tot = 0;
for (const t of kq) {
  console.log((t.dung ? '  OK  ' : '  SAI ') + t.ten);
  console.log('        ' + t.dat);
  if (t.dung) tot++;
}
console.log('');
console.log(tot + '/' + kq.length + ' đạt');
if (tot !== kq.length) process.exit(1);
