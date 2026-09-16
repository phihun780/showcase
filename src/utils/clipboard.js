// Chép chuỗi vào bộ nhớ tạm, trả về true/false.
//
// navigator.clipboard là cách chuẩn nhưng nó TỪ CHỐI khi trang không có focus,
// hoặc khi trang chạy http:// thay vì https://. Nên phải có đường lui: tạo một
// ô textarea ẩn, bôi đen rồi gọi execCommand('copy') — cách cũ nhưng chạy được
// ở những chỗ API mới bị chặn.
export async function chepVaoBoNhoTam(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* rơi xuống cách dự phòng bên dưới */ }

  try {
    const o = document.createElement('textarea');
    o.value = text;
    o.setAttribute('readonly', '');
    // Đặt ngoài tầm nhìn nhưng VẪN nằm trong layout — display:none thì không bôi đen được.
    o.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
    document.body.appendChild(o);
    o.select();
    o.setSelectionRange(0, text.length);
    const xong = document.execCommand('copy');
    document.body.removeChild(o);
    return xong;
  } catch {
    return false;
  }
}
