// Đọc nội dung CMS và dựng đường dẫn — dùng chung cho _middleware.js (thẻ
// preview mạng xã hội) và sitemap.xml.js (bản đồ trang cho Google).
//
// VÌ SAO TÁCH RA: cả hai đều phải biến tên dự án thành slug y hệt nhau. Chép
// hàm slugify ra hai chỗ là sớm muộn cũng lệch, mà lệch thì link chia sẻ trỏ
// một đằng, Google index một nẻo. Một bản duy nhất thì không lệch được.

export const PROJECT_ROUTE = '/du-an';
export const CLIENT_ROUTE = '/brand';

const PUBLIC_R2_URL = 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';
const CACHE_MS = 60 * 1000; // đọc lại nội dung CMS tối đa 1 phút/lần

// Giữ DỮ LIỆU THÔ chứ không giữ kết quả đã dựng sẵn: cùng một lần đọc phải
// phục vụ được cả thẻ preview lẫn sitemap.
let cache = { at: 0, data: null };

// PHẢI khớp từng ký tự với slugifyTitle trong src/utils/projectUrl.js (brand
// cũng dùng chung hàm đó).
export function slugifyTitle(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function projectSlug(project) {
  if (!project) return '';
  return slugifyTitle(project.title) || String(project.id || '');
}

export function clientSlug(client) {
  if (!client) return '';
  return slugifyTitle(client.clientName) || String(client.id || '');
}

// Lấy slug từ đường dẫn theo một tiền tố cho trước, trả null nếu không khớp.
export function slugFromPath(pathname, route) {
  const clean = (pathname || '').replace(/\/+$/, '');
  if (!clean.toLowerCase().startsWith(`${route}/`)) return null;
  const slug = clean.slice(route.length + 1);
  return slug ? decodeURIComponent(slug).toLowerCase() : null;
}

function getBucket(env) {
  return env.PORTFOLIO_ASSETS || env.showcase || env.BUCKET || env.R2 || env.SHOWCASE || null;
}

export async function loadData(env = {}) {
  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  const bucket = getBucket(env);
  let rawJson = null;

  if (bucket) {
    try {
      const object = await bucket.get('data/portfolio.json');
      if (object) {
        rawJson = await object.text();
      }
    } catch (e) {
      console.error('Lỗi đọc bucket:', e);
    }
  }

  if (!rawJson) {
    try {
      const res = await fetch(`${PUBLIC_R2_URL}/data/portfolio.json?t=${Date.now()}`);
      if (res.ok) {
        rawJson = await res.text();
      }
    } catch (e) {
      console.error('Lỗi tải nội dung dự phòng:', e);
    }
  }

  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson);
    cache = { at: Date.now(), data: parsed };
    return parsed;
  } catch {
    return null;
  }
}

function xmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// portfolio.json chỉ có MỘT mốc updatedAt cho cả kho, không ghi riêng từng dự
// án. Nên mọi trang dùng chung mốc đó — đúng với sự thật là "nội dung trang sửa
// lần cuối lúc này", chứ không bịa ra ngày riêng cho từng bài.
function lastmodOf(data) {
  const raw = data && data.updatedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Dựng sitemap.xml từ nội dung CMS.
 *
 * Liệt kê trang chủ + mọi trang dự án + mọi trang brand. KHÔNG có /cms: trang
 * quản trị đã gắn X-Robots-Tag noindex ở _middleware.js, đưa vào đây là tự mâu
 * thuẫn với chính mình.
 */
export function buildSitemap(data, origin) {
  const lastmod = lastmodOf(data);
  const urls = [{ loc: `${origin}/`, priority: '1.0', changefreq: 'weekly' }];

  const projects = Array.isArray(data && data.projects) ? data.projects : [];
  for (const p of projects) {
    const slug = projectSlug(p);
    if (!slug) continue;
    urls.push({
      loc: `${origin}${PROJECT_ROUTE}/${encodeURIComponent(slug)}`,
      priority: '0.8',
      changefreq: 'monthly',
    });
  }

  const clients = Array.isArray(data && data.clients) ? data.clients : [];
  for (const c of clients) {
    const slug = clientSlug(c);
    if (!slug) continue;
    urls.push({
      loc: `${origin}${CLIENT_ROUTE}/${encodeURIComponent(slug)}`,
      priority: '0.6',
      changefreq: 'monthly',
    });
  }

  const than = urls
    .map(u => {
      const dong = [
        `    <loc>${xmlText(u.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
      ].filter(Boolean);
      return `  <url>\n${dong.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${than}\n</urlset>\n`;
}
