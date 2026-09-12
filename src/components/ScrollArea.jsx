import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Vùng cuộn có thanh chỉ báo tự vẽ.
 *
 * VÌ SAO PHẢI TỰ VẼ:
 * Chromium từ bản 121 ưu tiên thuộc tính chuẩn `scrollbar-width` và bỏ qua toàn
 * bộ `::-webkit-scrollbar` khi thuộc tính đó được đặt. Đo thực tế trên chính dự
 * án này: `scrollbar-width: thin` cho ra 10px, còn `::-webkit-scrollbar{width:4px}`
 * không có tác dụng gì. Nghĩa là không cách nào chỉnh thanh trượt gốc cho mảnh
 * hơn, và trên Windows nó còn kèm hai nút mũi tên ở hai đầu.
 *
 * Nên: ẩn hẳn thanh gốc, tự vẽ một thanh mảnh 3px.
 *
 * Thanh chỉ báo chỉ để NHÌN, không kéo được — danh sách ngắn, cuộn bằng lăn
 * chuột hoặc vuốt là đủ. Bỏ phần kéo thả giúp tránh hẳn một mảng trạng thái
 * phức tạp mà gần như không ai dùng tới.
 */
export default function ScrollArea({ className = '', innerClassName = '', children }) {
  const boxRef = useRef(null);
  const thumbRef = useRef(null);

  // Ghi thẳng vào DOM, không qua state: hàm này chạy mỗi lần cuộn.
  const veLai = useCallback(() => {
    const box = boxRef.current;
    const thumb = thumbRef.current;
    if (!box || !thumb) return;

    const { scrollTop, scrollHeight, clientHeight } = box;
    const duThua = scrollHeight - clientHeight;

    // Không đủ nội dung để cuộn thì giấu luôn thanh đi.
    if (duThua <= 1) {
      thumb.style.opacity = '0';
      return;
    }
    thumb.style.opacity = '';

    const CAO_TOI_THIEU = 28;
    const cao = Math.max(CAO_TOI_THIEU, (clientHeight / scrollHeight) * clientHeight);
    const tren = (scrollTop / duThua) * (clientHeight - cao);

    thumb.style.height = `${cao}px`;
    thumb.style.transform = `translateY(${tren}px)`;

    // Vệt mờ chỉ đặt ở phía CÒN nội dung bị khuất. Để mờ cố định cả hai mép thì
    // khi đang ở đầu danh sách, viền của hàng đang chọn bị ăn mất một phần —
    // trông như lỗi hiển thị chứ không ra chủ đích.
    const oDau = scrollTop <= 1;
    const oCuoi = scrollTop >= duThua - 1;
    const tren_ = oDau ? '#000 0' : 'transparent 0, #000 16px';
    const duoi_ = oCuoi ? '#000 100%' : '#000 calc(100% - 16px), transparent 100%';
    box.style.maskImage = `linear-gradient(to bottom, ${tren_}, ${duoi_})`;
    box.style.webkitMaskImage = box.style.maskImage;
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    veLai();
    box.addEventListener('scroll', veLai, { passive: true });

    // Nội dung hoặc khung đổi kích thước (đổi dự án, xoay máy) -> tính lại.
    const ro = new ResizeObserver(veLai);
    ro.observe(box);
    if (box.firstElementChild) ro.observe(box.firstElementChild);

    return () => {
      box.removeEventListener('scroll', veLai);
      ro.disconnect();
    };
  }, [veLai, children]);

  return (
    <div className={`relative group/scroll ${className}`}>
      <div
        ref={boxRef}
        className={`h-full overflow-y-auto no-native-scrollbar ${innerClassName}`}
      >
        {children}
      </div>

      {/* Rãnh + con trượt. pointer-events-none để không chắn chuột lên danh sách. */}
      <div className="pointer-events-none absolute top-2 bottom-2 right-0 w-[3px] rounded-full bg-white/[0.06]">
        <div
          ref={thumbRef}
          className="w-full rounded-full bg-white/20 group-hover/scroll:bg-[#C3EA39]/70 transition-colors duration-300"
        />
      </div>
    </div>
  );
}
