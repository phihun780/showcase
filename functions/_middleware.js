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

let cache = { at: 0, key: '', data: null };

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

  return { title, description, image, imageType: imageTypeOf(image), favicon, origin };
}

async function loadSeo(env, origin) {
  if (!env.PORTFOLIO_ASSETS) return null;

  if (cache.data && cache.key === origin && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const object = await env.PORTFOLIO_ASSETS.get('data/portfolio.json');
    if (!object) return null;

    const parsed = JSON.parse(await object.text());
    const seo = buildSeo(parsed?.profile || {}, origin);
    cache = { at: Date.now(), key: origin, data: seo };
    return seo;
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

  const origin = new URL(context.request.url).origin;
  const seo = await loadSeo(context.env, origin);
  if (!seo) return response;

  const values = {
    'og:title': seo.title,
    'twitter:title': seo.title,
    description: seo.description,
    'og:description': seo.description,
    'twitter:description': seo.description,
    'og:image': seo.image,
    'twitter:image': seo.image,
    'og:image:type': seo.imageType,
    'og:url': `${origin}/`,
  };

  const rewritten = new HTMLRewriter()
    .on('title', new TitleRewriter(seo.title))
    .on('meta', new MetaRewriter(values))
    .on('link[rel~="icon"]', new IconRewriter(seo.favicon))
    .on('link[rel="canonical"]', {
      element: el => el.setAttribute('href', `${origin}/`),
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
