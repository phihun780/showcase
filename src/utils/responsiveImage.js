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

/**
 * Bản LỚN NHẤT mà trang chịu gửi xuống trình duyệt.
 *
 * Không có cách nào chặn được việc tải ảnh: muốn hiện lên màn hình thì trình
 * duyệt phải có file trong tay, tab Network luôn nhìn thấy. Nhưng có thể quyết
 * định gửi xuống bản NÀO — ô xem ảnh rộng nhất cũng chỉ chừng 1200px, nên không
 * việc gì phải đưa bản gốc 2560px cho mọi người xem.
 *
 * Ảnh chưa có bản thu nhỏ (tải lên trước khi có tính năng này) thì đành dùng
 * ảnh gốc, y như cũ.
 */
export function anhXemToiDa(url, tran = 1440) {
  const co = availableWidths(url);
  if (co.length === 0) return url;
  const vua = co.filter(w => w <= tran);
  if (vua.length === 0) return url;
  return variantUrl(url, Math.max(...vua));
}

const LA_GIF = /\.gif(\?|#|$)/i;

/**
 * Thuộc tính tải cho một tấm ảnh: tải ngay hay chờ, và giành đường truyền tới
 * mức nào.
 *
 * VÌ SAO KHÔNG CHỈ DỰA VÀO VỊ TRÍ:
 * Ảnh nằm đầu thì tải ngay là đúng — khách mở ra thấy liền, không phải nhìn ô
 * trống. Nhưng luật đó chỉ đúng khi mọi tấm nặng xấp xỉ nhau.
 *
 * GIF không được nén (nén là mất ảnh động) nên nặng hơn ảnh thường hàng chục
 * lần — trang này có tấm 21 MB và tấm 48 MB. Một tấm như vậy mà được xếp cùng
 * hạng ưu tiên với ảnh thường thì nó chiếm sạch đường truyền, 90 tấm nhẹ phía
 * sau xếp hàng chờ theo, và khách ngồi nhìn lưới trống.
 *
 * NÓI RÕ GIỚI HẠN — `lazy` KHÔNG chặn được ảnh ở đầu trang:
 * Trình duyệt chỉ hoãn những tấm nằm hẳn dưới màn hình. Tấm GIF 21 MB của brand
 * An Khang Foods nằm ở ô thứ 2, ngay trong màn hình đầu, nên vẫn tải. `low` chỉ
 * làm nó xuống hàng CUỐI, không làm nó biến mất.
 *
 * Nghĩa là: cách này giúp 90 tấm còn lại hiện ra trước thay vì chờ nhau, chứ
 * KHÔNG làm trang nhẹ đi. Muốn nhẹ thật thì phải đổi GIF sang video.
 *
 * KHÔNG đụng gì tới file ảnh: GIF vẫn nguyên si, nét y như cũ.
 */
export function thuocTinhTai(url, uuTien) {
  if (typeof url === 'string' && LA_GIF.test(url)) {
    return { loading: 'lazy', fetchPriority: 'low' };
  }
  return { loading: uuTien ? 'eager' : 'lazy', fetchPriority: uuTien ? 'high' : 'auto' };
}

/**
 * Chọn ra những tấm được ưu tiên tải ngay — BỎ QUA GIF.
 *
 * Dùng cùng với thuocTinhTai. Nếu cứ ưu tiên theo vị trí thuần tuý thì bài nào
 * mở đầu bằng GIF (dự án BLOOMORY chẳng hạn) sẽ không còn tấm nào được ưu tiên,
 * vì GIF luôn bị đẩy xuống hàng cuối — mở ra là một khoảng trống chờ.
 *
 * Nên suất ưu tiên nhảy qua GIF và rơi vào tấm nhẹ kế tiếp. Khách vẫn thấy ảnh
 * ngay, còn GIF thong thả về sau.
 */
export function chonAnhUuTien(danhSach, soLuong) {
  const uuTien = new Set();
  if (!Array.isArray(danhSach)) return uuTien;
  for (let i = 0; i < danhSach.length && uuTien.size < soLuong; i++) {
    const url = danhSach[i];
    if (typeof url === 'string' && LA_GIF.test(url)) continue;
    uuTien.add(i);
  }
  return uuTien;
}
