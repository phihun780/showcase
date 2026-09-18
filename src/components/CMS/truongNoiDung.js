// DANH MỤC MỌI CHỮ TRÊN TRANG, XẾP THEO ĐÚNG THỨ TỰ NHÌN THẤY.
//
// VÌ SAO LÀ DỮ LIỆU CHỨ KHÔNG PHẢI JSX:
// Trước đây mỗi ô nhập là một khối JSX viết tay ~12 dòng. 37 ô thành hơn 400
// dòng gần như giống hệt nhau, và thêm một ô mới là chép tay một lần nữa. Mô tả
// bằng dữ liệu thì thêm một ô chỉ là thêm một dòng ở đây.
//
// `k` là tên trường trong `profile` — đúng cái mà trang đọc ra để hiển thị.

/** Ba ô lặp lại ở đầu mỗi mục: số, tiêu đề, mô tả phụ. */
const dauMuc = (so, ten, vdSo, vdTen) => [
  { k: so, nhan: 'Số mục', vd: vdSo, co: 2, kieu: 'ma' },
  { k: ten, nhan: 'Tiêu đề mục', vd: vdTen, co: 10, dam: true },
];

export const CAC_MUC = [
  {
    id: 'header',
    ten: 'Thanh đầu trang',
    mo: 'Chữ ở thanh trên cùng và tên các nút menu',
    truong: [
      { k: 'headerTitle1', nhan: 'Dòng chữ nhỏ bên trái', vd: 'PORTFOLIO // SHOWCASE', co: 6 },
      { k: 'headerTitle2', nhan: 'Tên hiển thị', vd: 'PHI HÙNG', co: 6 },
      { k: 'headerNavWork', nhan: 'Nút menu 1', vd: 'Khu trưng bày', co: 4 },
      { k: 'headerNavClients', nhan: 'Nút menu 2', vd: 'Bạn đồng hành', co: 4 },
      { k: 'headerNavAbout', nhan: 'Nút menu 3', vd: 'Về tui', co: 4 },
    ],
  },
  {
    id: 'hero',
    ten: 'Phần mở đầu',
    mo: 'Chữ lớn đầu trang, mô tả và nút bấm',
    truong: [
      { k: 'location', nhan: 'Địa chỉ (nhãn nhỏ trên cùng)', vd: 'Tp. Buôn Ma Thuột, Đắk Lắk', co: 12 },
      { k: 'heroTitleRow1', nhan: 'Chữ lớn — dòng trên', vd: 'SHOW', co: 6, dam: true },
      { k: 'heroTitleRow2', nhan: 'Chữ lớn — dòng dưới', vd: 'CASE.', co: 6, dam: true },
      { k: 'subtitle', nhan: 'Mô tả dưới chữ lớn', vd: 'Đây là nơi mình lưu giữ…', co: 12, dong: 3 },
      { k: 'heroCtaText', nhan: 'Chữ trên nút bấm', vd: 'Dạo chơi 1 vòng', co: 12 },
    ],
  },
  {
    id: 'banner',
    ten: 'Băng ảnh đầu trang',
    mo: 'Ảnh góc rộng và thanh trượt so sánh Before/After',
    khoiAnh: 'banner',
    truong: [],
  },
  {
    id: 'muc01',
    ten: '01 · Cụm ảnh xoay',
    mo: 'Tiêu đề mục và những tấm ảnh khách kéo xoay',
    khoiAnh: 'tuongAnh',
    truong: [
      ...dauMuc('section01Number', 'section01Title', '01', 'Lúc rảnh rỗi'),
      { k: 'section01Subtitle', nhan: 'Mô tả phụ (bỏ trống thì ẩn)', vd: '', co: 12, dong: 2 },
      { k: 'showcaseWallHint', nhan: 'Dòng gợi ý dưới cụm ảnh', vd: 'Kéo để xoay · Bấm để xem lớn', co: 12 },
    ],
  },
  {
    id: 'muc02',
    ten: '02 · Khu trưng bày',
    mo: 'Tiêu đề mục và danh sách dự án',
    khoiAnh: 'duAn',
    truong: [
      ...dauMuc('section02Number', 'section02Title', '02', 'Khu trưng bày'),
      { k: 'section02Subtitle', nhan: 'Mô tả phụ (bỏ trống thì ẩn)', vd: '', co: 12, dong: 2 },
      { k: 'emptyProjects', nhan: 'Chữ hiện khi chưa có dự án nào', vd: 'Chưa có dự án nào', co: 12 },
    ],
  },
  {
    id: 'muc03',
    ten: '03 · Bạn đồng hành',
    mo: 'Tiêu đề mục và danh sách thương hiệu',
    khoiAnh: 'brand',
    truong: [
      ...dauMuc('sectionClientsNumber', 'sectionClientsTitle', '03', 'Bạn đồng hành'),
      { k: 'sectionClientsSubtitle', nhan: 'Mô tả phụ (bỏ trống thì ẩn)', vd: '', co: 12, dong: 2 },
      { k: 'emptyClients', nhan: 'Chữ hiện khi chưa có brand nào', vd: 'Chưa có bạn đồng hành nào', co: 12 },
    ],
  },
  {
    id: 'muc04',
    ten: '04 · Về tui',
    mo: 'Ảnh chân dung, giới thiệu, hành trình, liên hệ, CV',
    khoiAnh: 'veTui',
    truong: [
      ...dauMuc('section04Number', 'section04Title', '04', 'Về tui'),
      { k: 'email', nhan: 'Email liên hệ', vd: 'ten@example.com', co: 6 },
      { k: 'status', nhan: 'Trạng thái (bỏ trống thì ẩn)', vd: 'Đang nhận dự án', co: 6 },
      { k: 'emptyAvatar', nhan: 'Chữ hiện khi chưa có ảnh đại diện', vd: 'Chưa có ảnh đại diện', co: 12 },
    ],
  },
  {
    id: 'baiViet',
    ten: 'Trong bài viết',
    mo: 'Các nút khi khách mở một dự án hay một brand',
    truong: [
      { k: 'articleBack', nhan: 'Nút quay lại', vd: 'QUAY LẠI DANH SÁCH', co: 6 },
      { k: 'articleBackShort', nhan: 'Nút quay lại (điện thoại)', vd: 'QUAY LẠI', co: 6 },
      { k: 'articleShare', nhan: 'Nút chia sẻ', vd: 'CHIA SẺ', co: 4 },
      { k: 'articleCopied', nhan: 'Báo đã chép link', vd: 'ĐÃ CHÉP LINK', co: 4 },
      { k: 'articleTop', nhan: 'Nút lên đầu', vd: 'LÊN ĐẦU', co: 4 },
      { k: 'articleNextProject', nhan: 'Nút sang dự án tiếp theo', vd: 'DỰ ÁN TIẾP THEO', co: 12 },
    ],
  },
  {
    id: 'marquee',
    ten: 'Dải chữ chạy',
    mo: 'Băng chữ chạy ngang không ngừng',
    khoiAnh: 'marquee',
    truong: [],
  },
  {
    id: 'footer',
    ten: 'Chân trang',
    mo: 'Chữ ở đáy trang',
    truong: [
      { k: 'footerTagline', nhan: 'Chữ lớn', vd: 'ShowCase', co: 6 },
      { k: 'footerCopyright', nhan: 'Dòng bản quyền', vd: 'Phi Hùng', co: 6 },
    ],
  },
  {
    id: 'caiDat',
    ten: 'Cài đặt chung',
    mo: 'Tên tab, thẻ chia sẻ mạng xã hội, hiệu ứng nền',
    khoiAnh: 'caiDat',
    truong: [
      { k: 'tabTitle', nhan: 'Tên tab trình duyệt', vd: 'Phi Hùng — Showcase | Portfolio', co: 12 },
      { k: 'metaDescription', nhan: 'Mô tả cho Google & mạng xã hội', vd: '', co: 12, dong: 3 },
      { k: 'favicon', nhan: 'Địa chỉ ảnh favicon (icon tab)', vd: 'https://…/favicon.png', co: 6 },
      { k: 'ogImage', nhan: 'Địa chỉ ảnh preview khi gửi link', vd: 'https://…/og-image.png', co: 6 },
    ],
  },
];

/** Mọi trường chữ, gom phẳng — dùng để dò xem có bỏ sót trường nào không. */
export const MOI_TRUONG = CAC_MUC.flatMap(m => m.truong.map(t => t.k));
