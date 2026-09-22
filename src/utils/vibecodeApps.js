// Danh sách app tự viết ở mục Nội dung 5.
//
// VÌ SAO CÓ FILE NÀY:
// Lúc đầu mục này chỉ chứa ĐÚNG MỘT app, các ô nằm thẳng trong `profile`:
// vibecodeAppName, vibecodeDesc, vibecodeLogo... Giờ đổi sang danh sách nhiều
// app (`profile.vibecodeApps`), nhưng trên kho R2 đang có dữ liệu thật viết
// theo kiểu cũ.
//
// Hàm dưới đây đọc được cả hai kiểu: có danh sách thì dùng danh sách, chưa có
// thì dựng tạm một app từ mấy ô kiểu cũ. Nhờ vậy đẩy code mới lên là trang vẫn
// hiện đúng app đang có, không cần ai vào CMS bấm gì trước.
//
// Mấy ô kiểu cũ CỐ Ý không xoá khỏi portfolio.json: giữ lại thì lỡ phải lùi về
// bản code cũ, nội dung vẫn còn nguyên ở đó.

/** Một app rỗng, dùng khi bấm "Thêm app" trong CMS. */
export function appRong() {
  return {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    tagline: '',
    desc: '',
    logo: '',
    url: '',
    buttonText: '',
    gallery: [],
  };
}

function chuanHoa(app, thuTu) {
  const g = Array.isArray(app?.gallery) ? app.gallery : [];
  return {
    // App viết theo kiểu cũ không có id. Dựng một id theo thứ tự để React có
    // khoá ổn định — dùng chỉ số mảng làm khoá thì xoá một app ở giữa là mấy
    // app sau bị React nhận nhầm sang dữ liệu của nhau.
    id: (app?.id && String(app.id)) || `app-${thuTu}`,
    name: (app?.name || '').trim(),
    tagline: (app?.tagline || '').trim(),
    desc: (app?.desc || '').trim(),
    logo: (app?.logo || '').trim(),
    url: (app?.url || '').trim(),
    buttonText: (app?.buttonText || '').trim(),
    gallery: g.filter(u => typeof u === 'string' && u.trim()),
  };
}

/**
 * Danh sách app để hiển thị, đã lọc sạch.
 *
 * App chưa có TÊN lẫn DIỄN GIẢI thì bỏ qua — đó là ô vừa bấm "Thêm app" mà
 * chưa điền gì, không có lý do gì để nó hiện ra ngoài trang thành một thẻ trống.
 */
export function docDanhSachApp(profile) {
  const ds = Array.isArray(profile?.vibecodeApps) ? profile.vibecodeApps : null;

  if (ds && ds.length) {
    return ds.map(chuanHoa).filter(a => a.name || a.desc);
  }

  // Chưa có danh sách -> dựng từ mấy ô kiểu cũ.
  const cu = chuanHoa({
    id: 'app-cu',
    name: profile?.vibecodeAppName,
    tagline: profile?.vibecodeTagline,
    desc: profile?.vibecodeDesc,
    logo: profile?.vibecodeLogo,
    url: profile?.vibecodeUrl,
    buttonText: profile?.vibecodeButtonText,
    gallery: profile?.vibecodeGallery,
  }, 0);

  return (cu.name || cu.desc) ? [cu] : [];
}

/**
 * Danh sách để SỬA trong CMS — khác bản hiển thị ở chỗ giữ nguyên cả app chưa
 * điền gì, vì đó chính là ô người ta vừa tạo ra để điền vào.
 */
export function docDanhSachAppDeSua(profile) {
  const ds = Array.isArray(profile?.vibecodeApps) ? profile.vibecodeApps : null;
  if (ds && ds.length) return ds.map(chuanHoa);

  const cu = docDanhSachApp(profile);
  return cu.length ? cu : [appRong()];
}
