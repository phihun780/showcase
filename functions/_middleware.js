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

import {
  PROJECT_ROUTE,
  CLIENT_ROUTE,
  loadData,
  projectSlug,
  clientSlug,
  slugFromPath,
  buildSitemap,
} from './_noi-dung.js';

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

// Thẻ preview riêng cho một brand. Brand không có ô mô tả ngắn riêng nên mô tả
// lấy từ ghi chú; ảnh lấy tấm đầu trong bộ ảnh (cũng là tấm mới nhất).
function buildClientSeo(client, profile, origin) {
  const nen = buildSeo(profile, origin);
  const ten = (client.clientName || '').trim();
  const title = ten ? `${ten} — ${(profile.name || 'Phi Hùng').trim()}` : nen.title;
  const description = (client.note || '').trim() || nen.description;
  const anhDau = Array.isArray(client.gallery) ? client.gallery[0] : null;
  const image = usableImage(client.coverImage) || usableImage(anhDau) || nen.image;

  return {
    ...nen,
    title,
    description,
    image,
    imageType: imageTypeOf(image),
    url: `${origin}${CLIENT_ROUTE}/${clientSlug(client)}`,
  };
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
  const { origin, pathname } = new URL(context.request.url);

  // BAN DO TRANG cho Google: /sitemap.xml
  //
  // Danh sach du an va brand nam trong CMS nen thay doi luon — khong the viet
  // san mot file tinh trong public/. Dung o day thi them mot du an la sitemap
  // tu co them dong moi, khong phai nho gi ca.
  //
  // VI SAO NAM TRONG _middleware CHU KHONG PHAI functions/sitemap.xml.js:
  // middleware chac chan chay truoc moi thu, con public/_redirects dang co luat
  // `/* /index.html 200` nuot sach duong dan la. Dat o day la khong phai doan
  // xem luat nao thang.
  if (pathname === '/sitemap.xml') {
    const data = await loadData(context.env);
    if (data) {
      return new Response(buildSitemap(data, origin), {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          // Google khong can ban moi tinh tung phut; mot gio la du.
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    // Doc noi dung that bai thi bao 503 de Google quay lai sau, chu khong tra
    // ve sitemap rong — rong nghia la "trang khong co gi", sai han su that.
    return new Response('Chua doc duoc noi dung trang', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const response = await context.next();

  // Chỉ đụng vào trang HTML — ảnh, JS, CSS và các đường /api/* đi thẳng qua.
  if (!(response.headers.get('content-type') || '').includes('text/html')) {
    return response;
  }

  // Trang CMS: bao Google dung dua vao ket qua tim kiem.
  //
  // Day KHONG phai bao mat — ai go thang /cms van vao duoc man hinh nhap ma, va
  // von di nen nhu vay: cai giu cua la ma PIN cung bo khoa khi nhap sai nhieu
  // lan, chu khong phai viec giau duong dan. Chi la khong co ly do gi de dia
  // chi trang quan tri nam trong ket qua tim kiem cua nguoi la.
  //
  // Co tinh KHONG ghi "/cms" vao robots.txt: file do ai cung doc duoc, viet vao
  // la chi duong cho nguoi to mo thay vi giau di.
  if (pathname === '/cms' || pathname.startsWith('/cms/')) {
    const ra = new Response(response.body, response);
    ra.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return ra;
  }

  const data = await loadData(context.env);
  if (!data) return response;

  const profile = data.profile || {};

  const slugDuAn = slugFromPath(pathname, PROJECT_ROUTE);
  const duAn = slugDuAn && Array.isArray(data.projects)
    ? data.projects.find(p => projectSlug(p) === slugDuAn)
    : null;

  const slugBrand = slugFromPath(pathname, CLIENT_ROUTE);
  const brand = slugBrand && Array.isArray(data.clients)
    ? data.clients.find(c => clientSlug(c) === slugBrand)
    : null;

  // Link dự án / link brand -> thẻ preview của chính nó. Còn lại dùng thẻ chung.
  const seo = duAn
    ? buildProjectSeo(duAn, profile, origin)
    : brand
      ? buildClientSeo(brand, profile, origin)
      : buildSeo(profile, origin);

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
