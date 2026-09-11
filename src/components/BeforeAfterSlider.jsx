import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import SmartImage from './SmartImage';

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = '',
  afterLabel = '',
  initialPosition = 50,
  className = '',
  // Bề ngang ảnh sẽ chiếm trên màn hình, để trình duyệt chọn đúng cỡ.
  sizes = '100vw',
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const clipRef = useRef(null);      // khung cắt ảnh "Trước"
  const counterRef = useRef(null);   // lớp kéo ngược để ảnh đứng yên
  const dividerRef = useRef(null);   // vạch chia + tay nắm

  // Vị trí sống trong lúc kéo. React KHÔNG dựng lại giao diện theo cái này.
  const posRef = useRef(initialPosition);
  const rectRef = useRef(null);      // kích thước khung, đo 1 lần lúc chạm xuống

  // Ghi thẳng vào DOM, và CHỈ dùng transform.
  //
  // VÌ SAO KHÔNG DÙNG clip-path VÀ left:
  //   clip-path -> Safari phải VẼ LẠI cả tấm ảnh 2048px mỗi khung hình
  //   left: %   -> đổi vị trí bắt trình duyệt TÍNH LẠI LAYOUT mỗi khung hình
  // Cả hai đều chạy trên CPU nên trên điện thoại là giật cục, nhảy từng nấc.
  //
  // transform thì trình duyệt đẩy thẳng xuống GPU: không vẽ lại, không tính
  // lại layout, chỉ dịch chuyển lớp đã có sẵn.
  //
  // CÁCH CẮT BẰNG TRANSFORM: khung ngoài (overflow hidden) dịch sang TRÁI d%,
  // lớp trong dịch sang PHẢI đúng d% để ảnh đứng nguyên tại chỗ. Phần ảnh lòi
  // ra khỏi khung ngoài bị cắt -> còn lại đúng dải bên trái rộng pos%.
  const paint = useCallback((pos) => {
    const d = 100 - pos;
    if (clipRef.current) clipRef.current.style.transform = `translateX(-${d}%)`;
    if (counterRef.current) counterRef.current.style.transform = `translateX(${d}%)`;
    if (dividerRef.current) dividerRef.current.style.transform = `translateX(${pos}%)`;
  }, []);

  // Vẽ NGAY trong sự kiện, không qua requestAnimationFrame.
  // Trình duyệt vốn đã gộp pointermove theo nhịp khung hình, nên bọc thêm rAF
  // chỉ đẩy phần vẽ sang khung sau — tức là thêm một khung trễ, đúng thứ làm
  // thanh trượt có cảm giác chạy sau ngón tay. Ghi style không bắt tính lại
  // layout ngay; trình duyệt tự dồn lại xử lý một lần trước khi vẽ.
  const moveTo = useCallback((clientX) => {
    const rect = rectRef.current;
    if (!rect || !rect.width) return;
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    posRef.current = pos;
    paint(pos);
  }, [paint]);

  // Gỡ listener của lần kéo hiện tại.
  const detachRef = useRef(null);

  const handlePointerDown = (e) => {
    // Đo khung MỘT lần ở đây thay vì mỗi lần ngón tay di chuyển. Gọi
    // getBoundingClientRect() trong pointermove buộc trình duyệt tính lại
    // layout liên tục — chính là thứ gây cảm giác kéo bị trễ.
    rectRef.current = containerRef.current?.getBoundingClientRect() || null;
    moveTo(e.clientX);
    setIsDragging(true);

    // Giữ con trỏ/ngón tay bám vào phần tử này kể cả khi trượt ra ngoài.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* trình duyệt cũ */ }

    // Gắn listener NGAY tại đây, không qua useEffect. Nếu chờ effect thì phải
    // đợi React render xong mới gắn được, và những lần ngón tay nhúc nhích
    // sớm nhất sẽ rơi mất — cảm giác là thanh trượt "đơ" một nhịp lúc bắt đầu.
    detachRef.current?.();

    const onMove = (ev) => moveTo(ev.clientX);
    const onUp = () => {
      detachRef.current?.();
      setIsDragging(false);
      // Chốt lại vào state để React và DOM khớp nhau sau khi thả tay.
      setPosition(posRef.current);
    };
    // Khung có thể đổi kích thước giữa chừng (xoay ngang máy) -> đo lại.
    const onResize = () => {
      rectRef.current = containerRef.current?.getBoundingClientRect() || null;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', onResize);

    detachRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
      detachRef.current = null;
    };
  };

  // Dọn sạch nếu component bị gỡ giữa lúc đang kéo.
  useEffect(() => () => detachRef.current?.(), []);

  // Nếu React dựng lại giao diện giữa lúc đang kéo (vd banner tự đổi slide),
  // style inline sẽ quay về giá trị cũ trong state — vẽ đè lại ngay để không giật.
  useLayoutEffect(() => {
    paint(isDragging ? posRef.current : position);
  }, [position, isDragging, paint]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative w-full h-full overflow-hidden select-none cursor-ew-resize touch-none ${className}`}
    >
      {/* 1. Background Image (After / Right Image) */}
      <SmartImage
        src={afterImage}
        alt={afterLabel || 'Sau (After)'}
        sizes={sizes}
        draggable={false}
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      {afterLabel && (
        <span className="absolute bottom-4 right-4 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-mono pointer-events-none z-10 border border-white/10 shadow-lg">
          {afterLabel}
        </span>
      )}

      {/* 2. Foreground Image (Before / Left Image - Clipped by Slider) */}
      <div
        ref={clipRef}
        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
        style={{
          transform: `translateX(-${100 - position}%)`,
          // Chỉ báo trước lúc đang kéo; để thường trực sẽ giữ một lớp GPU
          // riêng suốt thời gian trang mở, tốn bộ nhớ vô ích.
          willChange: isDragging ? 'transform' : undefined,
        }}
      >
        {/* Kéo ngược lại đúng bằng khung ngoài, để ảnh đứng yên tại chỗ */}
        <div
          ref={counterRef}
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translateX(${100 - position}%)`,
            willChange: isDragging ? 'transform' : undefined,
          }}
        >
          <SmartImage
            src={beforeImage}
            alt={beforeLabel || 'Trước (Before)'}
            sizes={sizes}
            draggable={false}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {beforeLabel && (
            <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-mono pointer-events-none z-10 border border-white/10 shadow-lg">
              {beforeLabel}
            </span>
          )}
        </div>
      </div>

      {/* 3. Divider Line & Interactive Handle */}
      {/* Lớp bọc rộng bằng cả khung: translateX theo % ở đây là % của BỀ NGANG
          KHUNG, nên dịch đúng vị trí. Nếu đặt transform thẳng lên vạch 2px thì
          % sẽ tính theo 2px đó — sai hoàn toàn. */}
      <div
        ref={dividerRef}
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `translateX(${position}%)`,
          willChange: isDragging ? 'transform' : undefined,
        }}
      >
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]">
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black shadow-2xl border-2 border-black/80 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform">
            <div className="flex items-center gap-0.5 text-[9px] font-bold text-black select-none">
              <span>◀</span>
              <span>▶</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
