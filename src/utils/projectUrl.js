// Đường dẫn riêng cho từng dự án: /du-an/<slug>
//
// Modal vẫn là modal, nhưng mỗi lần mở sẽ đẩy một URL thật lên thanh địa chỉ.
// Nhờ vậy: copy link gửi được, nút Back của trình duyệt đóng modal, và người
// nhận link mở ra là thấy đúng dự án đó.
//
// Cloudflare Pages đã có sẵn SPA fallback trong public/_redirects
// (`/* /index.html 200`) nên mọi /du-an/... đều trả về ứng dụng.

export const PROJECT_ROUTE = '/du-an';

// Bản slugify gọn nhẹ. Cố tình KHÔNG dùng lại hàm trong imageOptimizer.js:
// file đó kéo theo cả r2Storage (mã tải lên R2), sẽ lọt vào gói của trang công
// khai dù khách xem không bao giờ cần.
export function slugifyTitle(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // bỏ dấu tiếng Việt
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Slug của một dự án. Lùi về id nếu tiêu đề không ra được chữ nào (vd toàn ký tự lạ).
export function projectSlug(project) {
  if (!project) return '';
  return slugifyTitle(project.title) || String(project.id || '');
}

export function projectPath(project) {
  const slug = projectSlug(project);
  return slug ? `${PROJECT_ROUTE}/${slug}` : '/';
}

export function projectUrl(project) {
  if (typeof window === 'undefined') return projectPath(project);
  return `${window.location.origin}${projectPath(project)}`;
}

// Đọc slug từ thanh địa chỉ. Trả về null nếu không phải trang dự án.
export function slugFromLocation() {
  if (typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').replace(/\/+$/, '');
  if (!path.toLowerCase().startsWith(`${PROJECT_ROUTE}/`)) return null;
  const slug = path.slice(PROJECT_ROUTE.length + 1);
  return slug ? decodeURIComponent(slug).toLowerCase() : null;
}

export function findProjectBySlug(projects, slug) {
  if (!slug || !Array.isArray(projects)) return null;
  return projects.find(p => projectSlug(p) === slug) || null;
}
