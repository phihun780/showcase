// Chèn nội dung SEO từ CMS vào HTML ngay trên máy chủ.
//
// VÌ SAO CẦN FILE NÀY:
// Facebook, Zalo, Messenger, LinkedIn, Google... KHÔNG chạy JavaScript khi đọc
// một đường link. Chúng chỉ tải file HTML thô rồi đọc các thẻ <meta> trong đó.
// Website này vẽ giao diện bằng JavaScript, nên mọi thứ CMS sửa (tiêu đề, mô tả,
// ảnh preview, favicon) đều xảy ra SAU khi các trang mạng xã hội đã đọc xong —
// nghĩa là chúng không bao giờ nhìn thấy.
//
// File này chạy trên máy chủ Cloudflare: nó đọc nội dung bạn đã lưu trong CMS
// rồi thay thẳng vào HTML TRƯỚC KHI gửi đi. Nhờ vậy thứ bạn chỉnh trong CMS
// chính là thứ hiện ra khi chia sẻ link.

const CACHE_MS = 60 * 1000; // đọc lại nội dung CMS tối đa 1 phút/lần

// Giữ DỮ LIỆU THÔ chứ không giữ SEO đã dựng sẵn: cùng một lần đọc phải phục vụ
// được cả trang chủ lẫn từng trang dự án.
let cache = { at: 0, data: null };

const IMAGE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function imageTypeOf(url) {
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  return IMAGE_TYPES[ext] || 'image/png';
}

// Chỉ nhận ảnh có địa chỉ đầy đủ https:// — ảnh base64 hoặc đường dẫn tương đối
// đều không dùng được cho preview mạng xã hội.
function usableImage(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value.trim())
    ? value.trim()
    : null;
}

function buildSeo(profile, origin) {
  const name = (profile.name || '').trim();

  const title =
    (profile.tabTitle || '').trim() ||
    (name ? `${name} — Showcase | Portfolio` : 'Phi Hùng — Showcase | Portfolio');

  const description = (profile.metaDescription || '').trim() || 'Thiết kế không chỉ là thiết kế, mà còn là thiết kế...';
  const image = usableImage(profile.ogImage) || `${origin}/og-image.png`;
  const favicon = usableImage(profile.favicon) || `${origin}/favicon.png`;

  return { title, description, image, imageType: imageTypeOf(image), favicon, origin, url: `${origin}/` };
}

// Đường dẫn riêng của dự án: /du-an/<slug>
const PROJECT_ROUTE = '/du-an';

// PHẢI khớp từng ký tự với slugifyTitle trong src/utils/projectUrl.js.
// Lệch một chút là link chia sẻ không tìm ra dự án và rơi về thẻ mặc định.
function slugifyTitle(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function projectSlug(project) {
  if (!project) return '';
  return slugifyTitle(project.title) || String(project.id || '');
}

// Lấy slug từ đường dẫn, trả null nếu không phải trang dự án.
function slugFromPath(pathname) {
  const clean = (pathname || '').replace(/\/+$/, '');
  if (!clean.toLowerCase().startsWith(`${PROJECT_ROUTE}/`)) return null;
  const slug = clean.slice(PROJECT_ROUTE.length + 1);
  return slug ? decodeURIComponent(slug).toLowerCase() : null;
}

// Thẻ preview riêng cho một dự án: tiêu đề dự án + ảnh cover của chính nó.
// Nhờ vậy dán link vào Zalo/Messenger sẽ ra đúng ảnh dự án, không phải ảnh
// chung của cả trang.
function buildProjectSeo(project, profile, origin) {
  const nen = buildSeo(profile, origin);
  const ten = (project.title || '').trim();
  const title = ten ? `${ten} — ${(profile.name || 'Phi Hùng').trim()}` : nen.title;
  const description = (project.subtitle || '').trim() || nen.description;
  const image = usableImage(project.coverImage) || nen.image;

  return {
    ...nen,
    title,
    description,
    image,
    imageType: imageTypeOf(image),
    url: `${origin}${PROJECT_ROUTE}/${projectSlug(project)}`,
  };
}

const PUBLIC_R2_URL = 'https://pub-0ad262edfb6a4345a3bd61b2110c549c.r2.dev';

function getBucket(env) {
  return env.PORTFOLIO_ASSETS || env.showcase || env.BUCKET || env.R2 || env.SHOWCASE || null;
}

async function loadData(env) {
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
      console.error('Middleware bucket get error:', e);
    }
  }

  if (!rawJson) {
    try {
      const res = await fetch(`${PUBLIC_R2_URL}/data/portfolio.json?t=${Date.now()}`);
      if (res.ok) {
        rawJson = await res.text();
      }
    } catch (e) {
      console.error('Middleware fallback fetch error:', e);
    }
  }

  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson);
    cache = { at: Date.now(), data: parsed };
    return parsed;
  } catch {
    return null; // hỏng thì cứ dùng thẻ mặc định trong index.html
  }
}

class MetaRewriter {
  constructor(values) {
    this.values = values;
  }

  element(el) {
    const key = el.getAttribute('property') || el.getAttribute('name');
    const value = key ? this.values[key] : undefined;
    if (value) el.setAttribute('content', value);
  }
}

class TitleRewriter {
  constructor(title) {
    this.title = title;
  }

  element(el) {
    if (this.title) el.setInnerContent(this.title);
  }
}

class IconRewriter {
  constructor(href) {
    this.href = href;
  }

  element(el) {
    if (!this.href) return;
    el.setAttribute('href', this.href);
    el.setAttribute('type', imageTypeOf(this.href));
  }
}

export async function onRequest(context) {
  const response = await context.next();

  // Chỉ đụng vào trang HTML — ảnh, JS, CSS và các đường /api/* đi thẳng qua.
  if (!(response.headers.get('content-type') || '').includes('text/html')) {
    return response;
  }

  const { origin, pathname } = new URL(context.request.url);
  const data = await loadData(context.env);
  if (!data) return response;

  const profile = data.profile || {};
  const slug = slugFromPath(pathname);
  const duAn = slug && Array.isArray(data.projects)
    ? data.projects.find(p => projectSlug(p) === slug)
    : null;

  // Link dự án -> thẻ preview của chính dự án đó. Còn lại dùng thẻ chung.
  const seo = duAn ? buildProjectSeo(duAn, profile, origin) : buildSeo(profile, origin);

  const values = {
    'og:title': seo.title,
    'twitter:title': seo.title,
    description: seo.description,
    'og:description': seo.description,
    'twitter:description': seo.description,
    'og:image': seo.image,
    'twitter:image': seo.image,
    'og:image:type': seo.imageType,
    'og:url': seo.url,
  };

  const rewritten = new HTMLRewriter()
    .on('title', new TitleRewriter(seo.title))
    .on('meta', new MetaRewriter(values))
    .on('link[rel~="icon"]', new IconRewriter(seo.favicon))
    .on('link[rel="canonical"]', {
      element: el => el.setAttribute('href', seo.url),
    })
    .transform(response);

  // Không cho lưu bản HTML cũ ở bộ nhớ đệm, để sửa CMS xong là preview đổi ngay.
  const headers = new Headers(rewritten.headers);
  headers.set('Cache-Control', 'no-cache, must-revalidate');

  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  });
}
