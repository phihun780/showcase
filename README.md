# Portfolio Phi Hùng

Trang giới thiệu tác phẩm, kèm CMS tự quản lý nội dung. React + Vite, chạy trên
Cloudflare Pages, ảnh và dữ liệu để trên Cloudflare R2.

---

## Mở lại để làm tiếp

```bash
git clone https://github.com/phihun780/showcase.git
cd showcase
npm install
npm run dev
```

Cần Node 20 trở lên (xem `.node-version`). Trang chạy ở http://localhost:5173

Muốn sửa nội dung thì vào http://localhost:5173/cms — hỏi mã PIN.

> **Cẩn thận:** CMS chạy ở máy cũng ghi thẳng lên kho R2 **thật**. Sửa ở localhost
> là trang thật đổi theo ngay, không có "bản nháp". Chạy `npm run sao-luu` trước
> khi định làm gì lớn.

### Chìa khoá

Sao chép `.env.example` thành `.env.local` rồi điền. File này **không** nằm trong
git, nên máy mới là phải lấy lại:

| Biến | Lấy ở đâu |
|---|---|
| `VITE_R2_ACCOUNT_ID` | Cloudflare → R2 → Overview |
| `VITE_R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage API Tokens |
| `VITE_R2_SECRET_ACCESS_KEY` | như trên (chỉ hiện đúng một lần lúc tạo) |
| `VITE_R2_BUCKET_NAME` | tên bucket, hiện đang là `showcase` |

Trên Cloudflare Pages còn hai biến nữa, đặt ở Settings → Variables and Secrets:
`CMS_PASSWORD` (mã PIN vào CMS) và `CMS_TOKEN_SECRET` (chuỗi bí mật dài, dùng để
ký vé đăng nhập).

---

## Ba thứ nằm ở ba nơi

Đây là chỗ dễ nhầm nhất khi quay lại sau một thời gian.

| Thứ | Ở đâu | Có trong git không |
|---|---|---|
| Code | GitHub `phihun780/showcase` | **Có** |
| Nội dung: `portfolio.json` + toàn bộ ảnh | Cloudflare R2 | **Không** |
| Chìa khoá, mã PIN | `.env.local` ở máy + biến trên Cloudflare | **Không** |

Nghĩa là: đẩy code lên git **không** sao lưu nội dung. Mất tài khoản Cloudflare
hay xoá nhầm bucket là code còn nguyên mà trang trống trơn.

### Sao lưu nội dung

```bash
npm run sao-luu
```

Tải `portfolio.json` và toàn bộ ảnh (kể cả các bản thu nhỏ) về `sao-luu/<ngày>/`,
giữ nguyên cấu trúc thư mục như trên kho. Chỉ đọc, không ghi gì lên R2, không cần
chìa khoá.

Thư mục `sao-luu/` không nằm trong git (nặng). Chép nó sang ổ cứng ngoài hoặc
Google Drive thì mới thật sự là bản lưu.

---

## Đưa lên trang thật

```bash
git push origin main
```

Cloudflare Pages tự build từ nhánh `main`. Không có bước nào thủ công.

---

## Sơ đồ thư mục

```
src/
  components/         giao diện trang công khai
    CMS/              trang quản trị
  utils/              R2, tối ưu ảnh, đường dẫn, bộ nhớ tạm
  context/            nơi giữ dữ liệu cho cả trang
functions/            chạy trên máy chủ Cloudflare
  _middleware.js      chèn thẻ preview cho Zalo/Facebook (chúng không chạy JS)
  api/                đăng nhập CMS, đọc/ghi dữ liệu, tải lên, xoá, tải ảnh về
scripts/sao-luu.mjs   sao lưu nội dung
```

Đường dẫn riêng: `/du-an/<tên-dự-án>` và `/brand/<tên-brand>` — copy gửi được,
mở ra đúng bài viết đó.

---

## Vài chỗ dễ vấp

- **Ảnh tải lên** được nén sang WebP và sinh sẵn các bản 480/960/1440px. Ảnh tải
  lên từ trước khi có tính năng này thì chưa có bản thu nhỏ, trang tự dùng ảnh gốc.
- **GIF** không được nén (nén là mất ảnh động). 9 file GIF hiện chiếm 40% tổng
  dung lượng ảnh của cả trang.
- **`functions/` không chạy khi `npm run dev`** — Vite không hiểu Cloudflare
  Functions. `vite.config.js` có bản mô phỏng riêng cho lúc chạy ở máy, nên sửa
  API là phải sửa **cả hai chỗ**.
- **Thẻ preview mạng xã hội** chỉ kiểm được trên trang thật, localhost không chạy.
