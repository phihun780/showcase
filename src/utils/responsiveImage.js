// Ảnh phản hồi theo kích thước màn hình (responsive images)
//
// VÌ SAO CẦN FILE NÀY:
// Kho R2 chỉ lưu file tĩnh, không tự thu nhỏ ảnh được, và Cloudflare Image
// Resizing (/cdn-cgi/image/...) không có trên tên miền .pages.dev. Nghĩa là
// điện thoại hiển thị ảnh rộng 350px vẫn phải tải nguyên tấm 1920px.
//
// CÁCH GIẢI QUYẾT:
// Lúc tải lên, CMS tạo sẵn vài bản thu nhỏ và đặt tên theo quy ước. Tên file
// tự nói nó có sẵn những cỡ nào, nên không cần thêm trường dữ liệu nào trong
// portfolio.json, và ảnh cũ (không có đánh dấu) vẫn chạy y như trước.
//
//   Ảnh gốc:   tenanh.rs480-960-1440-1920.webp   (1920 = chiều rộng ảnh gốc)
//   Bản nhỏ:   tenanh.rs480-960-1440-1920.480w.webp
//              tenanh.rs480-960-1440-1920.960w.webp
//              tenanh.rs480-960-1440-1920.1440w.webp
//
// Số CUỐI CÙNG luôn là chiều rộng của chính ảnh gốc — nhờ vậy ảnh gốc cũng là
// một ứng viên trong srcset cho màn hình lớn / retina, mà không cần nhân bản.
//
// Trình duyệt đọc srcset rồi tự chọn bản nhẹ nhất đủ nét cho màn hình của nó.

// Các cỡ sẽ tạo khi tải ảnh lên. Chỉ tạo bản NHỎ HƠN ảnh gốc — phóng to ảnh
// lên chỉ làm file nặng thêm mà không nét hơn.
export const RESPONSIVE_WIDTHS = [480, 960, 1440];

const MARKER = /\.rs([\d-]+)\.([a-zA-Z0-9]+)$/;

/**
 * Ghép phần đánh dấu vào tên file gốc.
 * ("anh.webp", [480,960]) -> "anh.rs480-960.webp"
 */
export function withResponsiveMarker(fileName, widths) {
  if (!widths || widths.length === 0) return fileName;
  const dot = fileName.lastIndexOf('.');
  const stem = dot === -1 ? fileName : fileName.slice(0, dot);
  const ext = dot === -1 ? 'webp' : fileName.slice(dot + 1);
  return `${stem}.rs${widths.join('-')}.${ext}`;
}

/**
 * Đường dẫn của một bản thu nhỏ cụ thể. Cỡ lớn nhất chính là ảnh gốc nên trả
 * về nguyên url, không có file riêng cho nó.
 * ("anh.rs480-960-1920.webp", 480) -> "anh.rs480-960-1920.480w.webp"
 */
export function variantUrl(url, width) {
  const m = url.match(MARKER);
  if (!m) return url;
  const widths = availableWidths(url);
  if (width >= Math.max(...widths)) return url;
  return url.replace(MARKER, `.rs$1.${width}w.$2`);
}

/**
 * Đọc danh sách cỡ có sẵn từ tên file. Trả về [] nếu ảnh không có bản thu nhỏ.
 */
export function availableWidths(url) {
  if (typeof url !== 'string') return [];
  const m = url.match(MARKER);
  if (!m) return [];
  return m[1]
    .split('-')
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0);
}

/**
 * Dựng chuỗi srcset. Trả về undefined nếu ảnh chưa có bản thu nhỏ — khi đó
 * <img> chạy đúng như cũ với mỗi thuộc tính src.
 */
export function buildSrcSet(url) {
  const widths = availableWidths(url);
  if (widths.length < 2) return undefined;
  return widths.map(w => `${variantUrl(url, w)} ${w}w`).join(', ');
}
