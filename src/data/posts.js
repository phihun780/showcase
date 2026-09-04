export const posts = [
  {
    id: "less-but-better-ui",
    title: "Triết lý 'Less, but better' trong kỷ nguyên UI quá tải thông tin",
    excerpt: "Tại sao việc lược bỏ một nút bấm, giảm bớt một thẻ card lại khó khăn gấp mười lần việc thêm mới? Góc nhìn thực tế sau 2 năm thiết kế sản phẩm số.",
    date: "15 Tháng 02, 2025",
    readTime: "5 phút đọc",
    category: "Design Philosophy",
    tags: ["UI/UX", "Minimalism", "Design Thinking", "Product Design"],
    coverImage: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop",
    content: `
Khi mới bước chân vào ngành thiết kế, đa phần chúng ta thường có xu hướng "muốn thể hiện mọi thứ": từ những hiệu ứng bóng đổ phức tạp (glassmorphism), chuyển động bắt mắt, cho đến việc cố nhồi nhét thật nhiều tính năng lên cùng một màn hình.

Nhưng qua 2 năm làm việc thực tế cùng các Product Manager và Developers, bài học lớn nhất mà tôi nhận được là: **Mỗi pixel bạn thêm vào là một chút năng lượng chú ý mà người dùng phải tiêu hao.**

### 1. Sự can đảm của khoảng trắng (Whitespace)
Khoảng trắng không phải là không gian chết. Khoảng trắng là hơi thở của giao diện. Khi bạn để cho một tiêu đề hoặc một nút CTA chính có đủ không gian xung quanh, bạn đang gửi một thông điệp rõ ràng tới mắt người dùng: *"Đây chính là thứ bạn cần tập trung nhất lúc này"*.

### 2. Nguyên tắc 'One Screen - One Primary Goal'
Trước khi bắt đầu vẽ bất kỳ wireframe nào, câu hỏi tôi luôn tự đặt ra là:
> Nếu người dùng chỉ được làm **duy nhất một hành động** trên màn hình này, hành động đó sẽ là gì?

Nếu có hơn một câu trả lời chính, điều đó đồng nghĩa với việc màn hình đang bị quá tải và cần được tách nhỏ thành các bước (step-by-step flow).

### 3. Tối giản không phải là đơn điệu
Nhiều người nhầm lẫn thiết kế tối giản là làm cho mọi thứ trở nên nhàm chán, chỉ có chữ đen trên nền trắng. Thực tế, sự tối giản đẳng cấp nằm ở sự tinh tế trong typography, tỷ lệ khoảng cách (spacing scale) chuẩn xác đến từng pixel, và độ mượt mà của phản hồi khi người dùng chạm vào màn hình.
    `
  },
  {
    id: "two-years-designer-learnings",
    title: "2 năm làm Designer: Những điều trường lớp và khóa học online chưa từng dạy",
    excerpt: "Vượt qua hội chứng kẻ giả mạo (Imposter Syndrome), học cách giao tiếp với lập trình viên, và hiểu rằng thiết kế đẹp chưa chắc là thiết kế hiệu quả.",
    date: "28 Tháng 01, 2025",
    readTime: "7 phút đọc",
    category: "Career & Growth",
    tags: ["Career", "Personal Journey", "Communication", "Design Career"],
    coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    content: `
Tròn 2 năm kể từ ngày tôi hoàn thành case study đầu tiên trên Behance và bắt đầu công việc thiết kế chính thức. Nhìn lại chặng đường vừa qua, có những bài học xương máu mà không cuốn sách hay video hướng dẫn Figma nào đề cập tới:

### Bài học 1: 50% thời gian là thiết kế, 50% là giao tiếp
Bạn có thể làm ra một bản thiết kế lộng lẫy nhất thế giới, nhưng nếu bạn không thể giải thích được **LÝ DO TẠI SAO** bạn đưa ra quyết định đó cho Product Manager và Client, bản thiết kế ấy sẽ không bao giờ được đưa vào sản xuất.

### Bài học 2: Kết thân với Developer là siêu năng lực
Thay vì chỉ ném link Figma qua rồi hy vọng sản phẩm thực tế sẽ giống hệt, hãy ngồi lại cùng lập trình viên:
- Tìm hiểu về cách hệ thống Flexbox / Grid hoạt động.
- Hiểu được chi phí kỹ thuật (technical debt) khi tạo ra một animation quá phức tạp.
- Đặt tên Component trong Figma đồng bộ với code của Dev.

Khi hai bên hiểu ngôn ngữ của nhau, tốc độ release sản phẩm sẽ nhanh gấp đôi và độ hoàn thiện UI sẽ đạt gần như 100%.

### Bài học 3: Đừng yêu bản thiết kế của mình quá mức
Bản thiết kế đầu tiên hầu như luôn sai. Hãy vui vẻ đón nhận phản hồi từ người dùng thực tế và sẵn sàng xóa bỏ một ý tưởng bạn đã tốn 2 ngày để làm nếu nó không mang lại giá trị cho người dùng.
    `
  },
  {
    id: "design-systems-from-scratch",
    title: "Xây dựng Design System từ số 0: Bài học thực chiến cho Startup vừa & nhỏ",
    excerpt: "Cách xây dựng bộ Token màu sắc, Typography và Component linh hoạt mà không bị sa đà vào việc 'over-engineering' quá mức cần thiết.",
    date: "10 Tháng 12, 2024",
    readTime: "6 phút đọc",
    category: "Design Systems",
    tags: ["Design System", "Figma", "Tokens", "UI Engineering"],
    coverImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
    content: `
Nhiều team nhỏ thường cố gắng sao chép nguyên mẫu Design System khổng lồ như Material Design của Google hay Polaris của Shopify ngay từ ngày đầu tiên. Kết quả là mất 3 tháng xây dựng nhưng không ai duy trì nổi.

### Hãy bắt đầu từ những nguyên tử nhỏ nhất:
1. **Design Tokens (Color & Typography)**: Định nghĩa tối đa 4 cấp độ màu trung tính, 1 màu thương hiệu chính và 1 hệ thống font scale rõ ràng.
2. **Spacing 4pt / 8pt Grid**: Đưa ra quy ước khoảng cách nhất quán (4, 8, 12, 16, 24, 32, 48px) để hạn chế việc chỉnh sửa thủ công.
3. **Core Components**: Chỉ tạo Component khi nó xuất hiện ít nhất từ 3 lần trở lên trong ứng dụng (Buttons, Input fields, Badges, Modals).

Đừng biến Design System thành một gánh nặng. Hãy để nó phát triển hữu cơ cùng sự lớn mạnh của sản phẩm.
    `
  }
];
