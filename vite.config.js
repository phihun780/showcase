import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, ListBucketsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];

  let start = 0;
  while (true) {
    const boundaryIdx = buffer.indexOf(boundaryBuf, start);
    if (boundaryIdx === -1) break;

    const nextBoundaryIdx = buffer.indexOf(boundaryBuf, boundaryIdx + boundaryBuf.length);
    if (nextBoundaryIdx === -1) break;

    const partBuffer = buffer.slice(boundaryIdx + boundaryBuf.length + 2, nextBoundaryIdx - 2);
    const headerEndIdx = partBuffer.indexOf('\r\n\r\n');
    if (headerEndIdx !== -1) {
      const headerStr = partBuffer.slice(0, headerEndIdx).toString('latin1');
      const data = partBuffer.slice(headerEndIdx + 4);

      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const filenameMatch = headerStr.match(/filename="([^"]+)"/);
      const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

      parts.push({
        name: nameMatch ? nameMatch[1] : undefined,
        filename: filenameMatch ? filenameMatch[1] : undefined,
        type: typeMatch ? typeMatch[1].trim() : undefined,
        data,
      });
    }
    start = nextBoundaryIdx;
  }
  return parts;
}

function r2DevPlugin() {
  let s3 = null;
  let s3Dem = null;   // khoa chi-doc, dung cho /api/dung-luong
  let bucket = 'showcase';
  let publicUrl = 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';

  return {
    name: 'r2-dev-api',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '');
      // Notepad lưu file kèm một dấu vô hình ở đầu (BOM), làm tên biến đầu tiên
      // sai đi và khoá coi như mất. Nên dò cả tên có dấu đó.
      const doc = (ten) => env[ten] || env[`﻿${ten}`];
      // KHÔNG viết khoá vào đây — file này nằm trong repo công khai.
      // Chỉ lấy từ .env.local (file đó đã nằm trong .gitignore).
      const accountId = doc('VITE_R2_ACCOUNT_ID');
      const accessKeyId = doc('VITE_R2_ACCESS_KEY_ID');
      const secretAccessKey = doc('VITE_R2_SECRET_ACCESS_KEY');

      if (!accountId || !accessKeyId || !secretAccessKey) {
        console.warn(
          '[R2] Thiếu khoá trong .env.local — CMS ở máy sẽ không lưu được gì. ' +
          'Chép .env.example thành .env.local rồi điền khoá lấy từ Cloudflare.'
        );
      }
      bucket = doc('VITE_R2_BUCKET_NAME') || 'showcase';
      publicUrl = doc('VITE_R2_PUBLIC_URL') || 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';

      if (accountId && accessKeyId && secretAccessKey) {
        s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });
      }

      // Khoa RIENG chi de DEM dung luong ca tai khoan. Co y tach khoi khoa
      // chinh: khoa chinh co quyen ghi va xoa, noi no ra moi kho la CMS dung
      // duoc ca du lieu cua webapp khac. Khong dat thi dem moi kho cua trang.
      const docHetKey = doc('VITE_R2_READ_ALL_ACCESS_KEY_ID');
      const docHetSecret = doc('VITE_R2_READ_ALL_SECRET_ACCESS_KEY');
      if (accountId && docHetKey && docHetSecret) {
        s3Dem = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: docHetKey, secretAccessKey: docHetSecret },
        });
      }

      // Ban do trang cho Google. Tren Cloudflare viec nay do
      // functions/_middleware.js lo, nhung `npm run dev` khong chay functions —
      // nen dung chung ham buildSitemap o day de xem thu duoc ngay o may.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || req.url.split('?')[0] !== '/sitemap.xml') return next();
        try {
          const { loadData, buildSitemap } = await import('./functions/_noi-dung.js');
          const data = await loadData({});
          if (!data) {
            res.statusCode = 503;
            res.end('Chua doc duoc noi dung trang');
            return;
          }
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(buildSitemap(data, `http://${req.headers.host}`));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e && e.message ? e.message : e));
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        // 1. /api/auth
        // GET: man hinh dang nhap hoi ma PIN dai may so. O may thi cu 4.
        if (req.url === '/api/auth' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ length: 4 }));
        }
        // POST: o may thi go so nao cung vao duoc — day la localhost, khong ra ngoai.
        if (req.url === '/api/auth' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, token: 'dev-token' }));
        }

        // /api/dung-luong — dung luong dang dung tren R2
        //
        // Ban chay that do functions/api/dung-luong.js lo. O may thi dung
        // chinh S3 client san co. Thu dem ca tai khoan truoc; khoa nao chi
        // thay mot kho thi lui ve dem kho cua trang nay.
        if (req.url && req.url.split('?')[0] === '/api/dung-luong' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (!s3) {
            res.statusCode = 503;
            return res.end(JSON.stringify({ success: false, error: 'Thieu khoa R2 trong .env.local' }));
          }

          // 1000 chu khong phai 1024 — khop cach Cloudflare hien thi.
          const MUC = 10 * 1000 * 1000 * 1000;

          // Co khoa chi-doc thi dung no, khong thi dung khoa chinh.
          const may = s3Dem || s3;

          const demKho = async (ten) => {
            const files = [];
            let token;
            for (let vong = 0; vong < 50; vong++) {
              const kq = await may.send(new ListObjectsV2Command({
                Bucket: ten, MaxKeys: 1000, ContinuationToken: token,
              }));
              for (const o of kq.Contents || []) files.push({ key: o.Key, size: o.Size || 0 });
              if (!kq.IsTruncated) return { files, dayDu: true };
              token = kq.NextContinuationToken;
            }
            return { files, dayDu: false };
          };

          try {
            let tenCacKho = null;
            try {
              const r = await may.send(new ListBucketsCommand({}));
              tenCacKho = (r.Buckets || []).map(b => b.Name);
            } catch {
              tenCacKho = null; // khoa chi co quyen tren mot kho
            }

            if (tenCacKho && tenCacKho.length) {
              const cacKho = [];
              let tong = 0, dayDu = true;
              for (const ten of tenCacKho) {
                const kq = await demKho(ten);
                const bytes = kq.files.reduce((t, f) => t + f.size, 0);
                tong += bytes;
                if (!kq.dayDu) dayDu = false;
                cacKho.push({ ten, bytes, soFile: kq.files.length });
              }
              cacKho.sort((a, b) => b.bytes - a.bytes);

              return res.end(JSON.stringify({
                success: true, phamVi: 'taiKhoan', tong,
                soFile: cacKho.reduce((t, k) => t + k.soFile, 0),
                mucMienPhi: MUC, conLai: Math.max(0, MUC - tong),
                phanTram: (tong / MUC) * 100,
                cacKho, khoTrang: cacKho.find(k => k.ten === bucket) || null,
                demDayDu: dayDu,
              }));
            }

            const kq = await demKho(bucket);
            const tong = kq.files.reduce((t, f) => t + f.size, 0);
            const nhom = new Map();
            for (const f of kq.files) {
              const i = f.key.indexOf('/');
              const ten = i === -1 ? '(ngoai thu muc)' : f.key.slice(0, i);
              const cu = nhom.get(ten) || { ten, bytes: 0, soFile: 0 };
              cu.bytes += f.size; cu.soFile += 1;
              nhom.set(ten, cu);
            }

            return res.end(JSON.stringify({
              success: true, phamVi: 'motKho', tong, soFile: kq.files.length,
              mucMienPhi: MUC, conLai: Math.max(0, MUC - tong),
              phanTram: (tong / MUC) * 100,
              theoThuMuc: [...nhom.values()].sort((a, b) => b.bytes - a.bytes),
              demDayDu: kq.dayDu,
            }));
          } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ success: false, error: String(e.message || e) }));
          }
        }

        // 2. /api/data (Read & Save portfolio data)
        if (req.url && (req.url === '/api/data' || req.url.startsWith('/api/data?')) && req.method === 'GET') {
          if (s3) {
            try {
              const resObj = await s3.send(new GetObjectCommand({
                Bucket: bucket,
                Key: 'data/portfolio.json',
              }));
              const text = await resObj.Body.transformToString();
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              return res.end(text);
            } catch (err) {
              console.warn('R2 Dev Get Data error:', err.message);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ empty: true }));
        }

        if (req.url === '/api/data' && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          const body = Buffer.concat(buffers).toString();

          if (s3) {
            try {
              await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: 'data/portfolio.json',
                Body: body,
                ContentType: 'application/json',
              }));
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('R2 Dev Save Data error:', err);
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        // 3. /api/upload
        if (req.url === '/api/upload' && req.method === 'POST') {
          try {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            const totalBuffer = Buffer.concat(buffers);

            const contentTypeHeader = req.headers['content-type'] || '';
            const boundaryMatch = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

            if (boundaryMatch) {
              const boundary = boundaryMatch[1] || boundaryMatch[2];
              const parts = parseMultipart(totalBuffer, boundary);

              const filePart = parts.find(p => p.filename || p.name === 'file');
              const keyPart = parts.find(p => p.name === 'key');
              const ctPart = parts.find(p => p.name === 'contentType');

              const key = keyPart ? keyPart.data.toString().trim() : `uploads/${Date.now()}.webp`;
              const fileContentType = ctPart ? ctPart.data.toString().trim() : (filePart?.type || 'image/webp');
              const fileData = filePart ? filePart.data : totalBuffer;

              if (s3) {
                await s3.send(new PutObjectCommand({
                  Bucket: bucket,
                  Key: key.replace(/^\/+/, ''),
                  Body: fileData,
                  ContentType: fileContentType,
                }));
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({
                success: true,
                url: `${publicUrl}/${key.replace(/^\/+/, '')}`,
                key: key,
              }));
            }
          } catch (err) {
            console.error('R2 Dev Upload error:', err);
            res.statusCode = 500;
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }

        // 4. /api/delete
        if (req.url === '/api/delete' && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          const body = JSON.parse(Buffer.concat(buffers).toString() || '{}');

          if (s3) {
            try {
              if (body.key) {
                let key = body.key;
                if (key.includes(publicUrl)) key = key.replace(publicUrl, '').replace(/^\/+/, '');
                else if (key.includes('.r2.dev/')) key = key.split('.r2.dev/')[1];
                await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key.replace(/^\/+/, '') }));
              } else if (Array.isArray(body.keys) && body.keys.length > 0) {
                const objects = body.keys.map(k => {
                  let key = k;
                  if (key.includes(publicUrl)) key = key.replace(publicUrl, '').replace(/^\/+/, '');
                  else if (key.includes('.r2.dev/')) key = key.split('.r2.dev/')[1];
                  return { Key: key.replace(/^\/+/, '') };
                });
                await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }));
              }
            } catch (err) {
              console.warn('R2 Dev Delete error:', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        // 4b. /api/tai-anh — tải một tấm ảnh trong kho về máy.
        //
        // Kho R2 không gửi kèm header CORS nên trang không đọc được file bằng
        // fetch. Đọc hộ ở đây rồi trả về kèm Content-Disposition: attachment.
        // Bản chạy thật nằm ở functions/api/tai-anh.js.
        if (req.url && req.url.startsWith('/api/tai-anh') && req.method === 'GET') {
          const key = (new URL(req.url, 'http://localhost').searchParams.get('key') || '')
            .trim()
            .replace(/^\/+/, '');

          // Cùng bộ luật với bản chạy thật (functions/api/tai-anh.js): chỉ các
          // thư mục của CMS. Để dev dễ dãi hơn thì có lỗi chỉ lộ ra khi đã lên
          // trang thật.
          const thuMucChoPhep = ['projects', 'cover_banners', 'random_works', 'showcase_wall', 'profile', 'clients', 'uploads'];
          const hopLe =
            key &&
            !key.includes('..') &&
            /^[a-zA-Z0-9._/-]+$/.test(key) &&
            key.split('/').length >= 2 &&
            thuMucChoPhep.includes(key.split('/')[0]);

          if (!s3 || !hopLe) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Đường dẫn ảnh không hợp lệ' }));
          }

          try {
            const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            const ten = key.split('/').pop() || 'anh';
            res.setHeader('Content-Type', out.ContentType || 'application/octet-stream');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${ten.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ten)}`
            );
            res.setHeader('Cache-Control', 'no-store');
            return out.Body.pipe(res);
          } catch (err) {
            console.warn('R2 Dev Download error:', err);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Không tìm thấy ảnh' }));
          }
        }

        // 4c. /api/tai-cv — tải CV về máy, đường CÔNG KHAI (khách không đăng nhập).
        //
        // Bấm thẳng vào địa chỉ PDF thì trình duyệt MỞ ra xem chứ không tải về;
        // muốn tải thật phải có Content-Disposition: attachment, mà cái đó chỉ
        // đặt được ở phía máy chủ. Bản chạy thật ở functions/api/tai-cv.js.
        if (req.url && req.url.startsWith('/api/tai-cv') && req.method === 'GET') {
          try {
            const dl = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'data/portfolio.json' }));
            const chuoi = await dl.Body.transformToString();
            const duLieu = JSON.parse(chuoi);
            const cvUrl = (duLieu?.profile?.cvUrl || duLieu?.profile?.resumeUrl || '').trim();

            let key = '';
            if (cvUrl.includes('.r2.dev/')) key = cvUrl.split('.r2.dev/')[1];
            key = key.split('?')[0].replace(/^\/+/, '');

            if (!key || key.includes('..')) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'CV không nằm trong kho' }));
            }

            const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            // Tên cố định, khớp với functions/api/tai-cv.js. Tên trong kho là
            // `cv-<mốc thời gian>.pdf`, khách tải về thấy dãy số thì không hiểu gì.
            const duoi = (key.split('.').pop() || 'pdf').toLowerCase();
            const ten = `CV_Ng Dinh Phi Hung_Graphic Designer.${duoi}`;
            res.setHeader('Content-Type', out.ContentType || 'application/pdf');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${ten.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ten)}`
            );
            res.setHeader('Cache-Control', 'no-store');
            return out.Body.pipe(res);
          } catch (err) {
            console.warn('R2 Dev CV download error:', err);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Không tìm thấy file CV' }));
          }
        }

        // 5. /api/delete-folder
        if (req.url === '/api/delete-folder' && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          const body = JSON.parse(Buffer.concat(buffers).toString() || '{}');

          if (s3 && body.prefix) {
            try {
              const cleanPrefix = body.prefix.replace(/^\/+/, '').replace(/\/+$/, '');
              const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: cleanPrefix }));
              if (listed.Contents && listed.Contents.length > 0) {
                const objects = listed.Contents.map(obj => ({ Key: obj.Key }));
                await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }));
              }
            } catch (err) {
              console.warn('R2 Dev Delete Folder error:', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true }));
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    r2DevPlugin(),
  ],
});

