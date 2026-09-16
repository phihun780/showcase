// Đường dẫn riêng cho từng brand: /brand/<slug>
//
// Giống hệt cách làm của dự án (xem projectUrl.js): modal vẫn là modal, nhưng
// mỗi lần mở sẽ đẩy một URL thật lên thanh địa chỉ. Nhờ vậy copy link gửi được,
// nút Back của trình duyệt đóng modal, và người nhận link mở ra là thấy đúng
// brand đó.
//
// Cloudflare Pages đã có sẵn SPA fallback trong public/_redirects
// (`/* /index.html 200`) nên mọi /brand/... đều trả về ứng dụng.

import { slugifyTitle } from './projectUrl';

export const CLIENT_ROUTE = '/brand';

// Slug của một brand. Lùi về id nếu tên không ra được chữ nào (vd toàn ký tự lạ).
export function clientSlug(client) {
  if (!client) return '';
  return slugifyTitle(client.clientName) || String(client.id || '');
}

export function clientPath(client) {
  const slug = clientSlug(client);
  return slug ? `${CLIENT_ROUTE}/${slug}` : '/';
}

export function clientUrl(client) {
  if (typeof window === 'undefined') return clientPath(client);
  return `${window.location.origin}${clientPath(client)}`;
}

// Đọc slug từ thanh địa chỉ. Trả về null nếu không phải trang brand.
export function slugFromLocation() {
  if (typeof window === 'undefined') return null;
  const path = (window.location.pathname || '').replace(/\/+$/, '');
  if (!path.toLowerCase().startsWith(`${CLIENT_ROUTE}/`)) return null;
  const slug = path.slice(CLIENT_ROUTE.length + 1);
  return slug ? decodeURIComponent(slug).toLowerCase() : null;
}

export function findClientBySlug(clients, slug) {
  if (!slug || !Array.isArray(clients)) return null;
  return clients.find(c => clientSlug(c) === slug) || null;
}
