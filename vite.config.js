import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

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
  let bucket = 'showcase';
  let publicUrl = 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';

  return {
    name: 'r2-dev-api',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '');
      const accountId = env.VITE_R2_ACCOUNT_ID || 'a0650e4cdd588f8cab25b3a13a282dc4';
      const accessKeyId = env.VITE_R2_ACCESS_KEY_ID || '72d7fdbd4e7fa547975af270f37f0800';
      const secretAccessKey = env.VITE_R2_SECRET_ACCESS_KEY || '1af43a02ad0fa9c1219416cc9bd4f467fc0f47efb84e3107b2af0e04737fef2d';
      bucket = env.VITE_R2_BUCKET_NAME || 'showcase';
      publicUrl = env.VITE_R2_PUBLIC_URL || 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';

      if (accountId && accessKeyId && secretAccessKey) {
        s3 = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId, secretAccessKey },
        });
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        // 1. /api/auth
        if (req.url === '/api/auth' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, token: 'dev-token' }));
        }

        // 2. /api/data (Save portfolio data)
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

