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

Hai biến nữa **không bắt buộc**, chỉ cho ô "dung lượng R2" trong CMS:
`VITE_R2_READ_ALL_ACCESS_KEY_ID` và `VITE_R2_READ_ALL_SECRET_ACCESS_KEY`.

Hạn mức 10 GB miễn phí tính cho **cả tài khoản** chứ không phải từng kho. Muốn
ô đó hiện tổng của mọi kho thì tạo thêm một khoá R2 quyền **Admin Read only**
(Cloudflare → R2 → Account Details → API Tokens → Manage → Create), rồi điền
vào hai biến đó — ở `.env.local` cho máy, và ở Settings → Variables and Secrets
trên Cloudflare cho trang thật (bỏ tiền tố `VITE_`). Không điền thì ô đó chỉ
đếm kho của trang này và nói rõ ra.

**Phải là `Admin Read only`, không phải `Object Read only`.** Theo tài liệu
Cloudflare, chỉ quyền Admin mới *liệt kê được danh sách bucket*; quyền Object
chỉ đọc được object trong những bucket đã chỉ định sẵn — mà muốn tính tổng thì
trước hết phải biết tài khoản có những bucket nào.

> **Thêm biến trên Cloudflare xong phải TRIỂN KHAI LẠI.** Biến môi trường chỉ
> được nạp vào lúc dựng bản mới, nên thêm xong mà không đẩy commit hay bấm
> *Retry deployment* thì trang thật vẫn chạy bằng bộ biến cũ — nhìn vào tưởng
> khoá sai. Áp dụng cho **mọi** biến, không riêng hai biến này.

Cố ý tách khỏi khoá chính: khoá chính có quyền ghi và xoá, nới nó ra mọi kho là
CMS đụng được cả dữ liệu của webapp khác.

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
public/
  fonts/              font .woff2 trang thật dùng (do scripts/dung-font.py dựng)
  robots.txt          cho phép Google đọc, chỉ chỗ sitemap
  _headers            bảo trình duyệt giữ font lại một năm
functions/            chạy trên máy chủ Cloudflare
  _middleware.js      chèn thẻ preview cho Zalo/Facebook, và trả /sitemap.xml
  _noi-dung.js        đọc nội dung CMS + dựng slug (dùng chung, đừng chép ra)
  api/                đăng nhập CMS, đọc/ghi dữ liệu, tải lên, xoá, tải ảnh về
  api/dung-luong.js   đếm dung lượng kho R2, hiện trong thanh bên của CMS
scripts/sao-luu.mjs   sao lưu nội dung
scripts/dung-font.py  dựng font .woff2 từ .ttf trong font-web/
```

`/sitemap.xml` được dựng ngay lúc có người hỏi, từ chính nội dung trong CMS —
thêm một dự án là nó tự có thêm dòng mới, không phải sửa tay.

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
  Riêng `/sitemap.xml` thì `vite.config.js` có mô phỏng, xem thử được ở máy.
- **Font nằm trong `public/fonts/`, không gọi sang Google nữa.** Muốn đổi font
  hoặc thêm độ đậm thì sửa `scripts/dung-font.py` rồi chạy lại:

  ```bash
  pip install fonttools brotli
  python scripts/dung-font.py
  ```

  Thư mục nguồn `font-web/` **không** nằm trong git — máy mới phải tải lại từ
  Google Fonts trước khi chạy script. File `.woff2` dựng xong thì có trong git,
  nên chỉ việc `npm run dev` là chạy được, không cần bước nào cả.

  `public/_headers` bảo trình duyệt giữ font lại một năm, nên **đổi ruột font mà
  giữ nguyên tên file là máy khách cũ vẫn dùng bản cũ**. Đổi font thì đổi cả tên.
