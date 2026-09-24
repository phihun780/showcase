# Phi Hùng — Showcase

Trang giới thiệu tác phẩm thiết kế, kèm một CMS tự viết để chủ trang tự sửa mọi
thứ mà không cần đụng vào code.

**→ [phihun.pages.dev](https://phihun.pages.dev)**

---

## Có gì bên trong

**Tự quản lý nội dung.** Một trang quản trị riêng ở `/cms`: thêm dự án, thêm
brand, đổi ảnh, sửa từng dòng chữ trên trang — kể cả tiêu đề các mục và chữ trên
nút bấm. Không có gì phải sửa trong code để đổi nội dung.

**Ảnh tự tối ưu.** Tải ảnh lên là tự nén sang WebP và sinh sẵn bản 480px cho
điện thoại, 1440px cho màn hình lớn. Trình duyệt tự chọn bản nhẹ nhất đủ nét.

**Link chia sẻ ra đúng bài.** Mỗi dự án và mỗi brand có đường dẫn riêng
(`/du-an/<tên>`, `/brand/<tên>`). Dán vào Zalo hay Facebook thì hiện đúng tiêu
đề và ảnh của bài đó, không phải ảnh chung của cả trang.

**Hiệu ứng theo mùa.** Tuyết rơi, hoa Tết, Trung thu, mưa, Giáng sinh, Quốc
khánh — bật tắt trong CMS. Chạy sau nội dung nên không tranh chỗ với bài viết,
và tự tắt khi máy người xem bật chế độ giảm chuyển động.

**Theo dõi kho ảnh.** Một mục trong CMS đếm dung lượng đang dùng trên Cloudflare
R2 so với mức miễn phí, chia theo từng kho.

---

## Làm bằng gì

| | |
|---|---|
| Giao diện | React 19, Vite, Tailwind CSS 4, Framer Motion |
| Máy chủ | Cloudflare Pages Functions |
| Ảnh & dữ liệu | Cloudflare R2 |

---

## Chạy thử

```bash
npm install
npm run dev
```

Cần Node 20 trở lên. Trang chạy ở `http://localhost:5173`.

Phần CMS cần khoá Cloudflare R2 riêng — chép `.env.example` thành `.env.local`
rồi điền vào.

---

Thiết kế và code bởi **Phi Hùng**.
