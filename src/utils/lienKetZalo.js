// Biến số điện thoại thành đường dẫn Zalo mở được.
//
// VÌ SAO CẦN:
// Các ô liên kết khác đều điền địa chỉ đầy đủ (https://...). Riêng Zalo thì thứ
// người ta nhớ là SỐ ĐIỆN THOẠI, không ai nhớ "zalo.me/..." cả. Nên ô Zalo cho
// phép gõ mỗi số, chỗ này lo phần còn lại.
//
// Vẫn nhận địa chỉ đầy đủ như thường — ai có trang Zalo OA hay link mời kết bạn
// riêng thì dán thẳng vào, không bị đụng tới.

/** Ô này có phải Zalo không? Nhận biết theo tên nút người dùng đặt. */
export function laZalo(soc) {
  return String(soc?.name || '').trim().toLowerCase().includes('zalo');
}

/**
 * Trả về địa chỉ mở được từ thứ người dùng gõ vào.
 *
 *   "0901234567"        -> https://zalo.me/0901234567
 *   "090 123 45 67"     -> https://zalo.me/0901234567     (bỏ khoảng trắng)
 *   "+84901234567"      -> https://zalo.me/0901234567     (+84 thành 0)
 *   "zalo.me/abcxyz"    -> https://zalo.me/abcxyz         (thêm https)
 *   "https://zalo.me/x" -> giữ nguyên
 *   ""                  -> chuỗi rỗng (nơi gọi tự quyết định ẩn nút đi)
 */
export function duongDanZalo(giaTri) {
  const tho = String(giaTri || '').trim();
  if (!tho) return '';

  // Đã là địa chỉ đầy đủ thì để yên.
  if (/^https?:\/\//i.test(tho)) return tho;
  if (/^zalo\.me\//i.test(tho)) return `https://${tho}`;

  // Bỏ mọi thứ người ta hay chen vào giữa số: khoảng trắng, chấm, gạch, ngoặc.
  let so = tho.replace(/[\s.\-()]/g, '');

  // Số Việt Nam viết kiểu quốc tế: +84 hoặc 0084 đều là số 0 ở đầu.
  so = so.replace(/^(\+84|0084|84(?=\d{9}$))/, '0');

  // Còn lại toàn chữ số thì coi là số điện thoại.
  if (/^\d{8,15}$/.test(so)) return `https://zalo.me/${so}`;

  // Không đoán được thì trả lại nguyên văn, để người dùng tự thấy mà sửa.
  return tho;
}

/** Địa chỉ cuối cùng của một ô liên kết bất kỳ. Chỉ ô Zalo mới được xử lý thêm. */
export function duongDanLienKet(soc) {
  return laZalo(soc) ? duongDanZalo(soc?.url) : String(soc?.url || '');
}
