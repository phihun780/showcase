import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowUp } from 'lucide-react';
import SmartImage from './SmartImage';
import ImageViewer from './ImageViewer';

/**
 * Chi tiết một brand đã làm việc cùng.
 *
 * Dựng theo ĐÚNG khung của ProjectModal — cùng hộp, cùng vạch tiến độ, cùng nút
 * đóng, cùng lề trong, cùng cách xếp ảnh dọc, cùng chân trang. Khác đúng phần
 * ruột: tiêu đề là tên brand + năm, rồi tới lưới ảnh kiểu Pinterest.
 */
export default function ClientMemoryModal({ client, isOpen, initialIndex = 0, onClose }) {
  const containerRef = useRef(null);
  const footerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [footerTrongTam, setFooterTrongTam] = useState(false);

  // Ảnh đang xem to. Giữ thêm một bản trong ref vì bộ bắt phím bên dưới nằm
  // trong effect chỉ phụ thuộc [isOpen, onClose] — đọc state trực tiếp thì nó
  // đọc phải giá trị cũ của lần dựng đầu.
  const [anhDangXem, setAnhDangXem] = useState(null);   // số thứ tự, hoặc null
  const anhDangXemRef = useRef(null);
  const datAnhDangXem = (i) => { anhDangXemRef.current = i; setAnhDangXem(i); };

  // Số ảnh cũng để trong ref vì cùng lý do: hàm này bị bộ bắt phím giữ lại từ
  // lần dựng cũ, đọc biến thường thì đọc phải số của brand trước.
  const soAnhRef = useRef(0);
  const doiAnh = (buoc) => {
    const tong = soAnhRef.current;
    const hienTai = anhDangXemRef.current;
    if (!tong || hienTai === null) return;
    datAnhDangXem((hienTai + buoc + tong) % tong);   // qua hết thì quay vòng
  };

  // Đã tải xong tấm nào — dùng để bỏ khung giữ chỗ, xem chú thích ở lưới ảnh.
  const [daTai, setDaTai] = useState({});

  const ten = client?.clientName || 'Brand';

  // Tính trước mọi lần return sớm: hook phải chạy đủ và đúng thứ tự ở mọi lần
  // dựng. useMemo để mảng giữ nguyên danh tính, không thì effect bên dưới chạy
  // lại mỗi lần vẽ.
  const images = useMemo(() => Array.from(new Set([
    client?.coverImage,
    ...(Array.isArray(client?.gallery) ? client.gallery : []),
  ].filter(Boolean))), [client]);

  // Ghi vào ref trong effect chứ không ghi thẳng lúc dựng — ghi lúc dựng là
  // việc phụ ngoài luồng, React có thể dựng thử rồi bỏ.
  useEffect(() => { soAnhRef.current = images.length; }, [images.length]);

  // Đưa về đầu bài mỗi khi MỞ hoặc khi đổi brand.
  //
  // Tách riêng khỏi effect gắn sự kiện bên dưới, và chỉ phụ thuộc vào hai giá
  // trị nguyên thuỷ. Trước đây việc đặt lại nằm chung với effect có `onClose`
  // trong danh sách phụ thuộc, nên mỗi lần thẻ cha vẽ lại là bài viết bị kéo
  // về đầu — mà thẻ cha thì tự vẽ lại mỗi 3.5 giây.
  useEffect(() => {
    if (!isOpen) return;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setScrollProgress(0);
    setShowBackToTop(false);
    setDaTai({});
    anhDangXemRef.current = null;
    setAnhDangXem(null);
  }, [isOpen, client?.id]);

  useEffect(() => {
    if (!isOpen) return;

    // Một bộ bắt phím duy nhất cho cả bài viết lẫn ô xem ảnh.
    //
    // Gộp vào một chỗ là có chủ đích: nếu ô xem ảnh tự gắn thêm một bộ nữa trên
    // `window` thì cả hai cùng nghe Esc, bên nào chạy trước là chuyện của thứ tự
    // gắn — rất dễ thành bấm Esc một cái đóng luôn cả hai.
    const handleKeyDown = (e) => {
      const dangXemAnh = anhDangXemRef.current !== null;

      if (e.key === 'Escape') {
        if (dangXemAnh) datAnhDangXem(null);   // đóng ảnh trước, bài viết ở lại
        else onClose();
        return;
      }

      if (!dangXemAnh) return;
      if (e.key === 'ArrowRight') doiAnh(1);
      if (e.key === 'ArrowLeft') doiAnh(-1);
    };

    // Lăn chuột ở vùng nền tối bên ngoài hộp thì vẫn cuộn được bài viết.
    // Giống modal dự án: không có cái này thì lăn ra ngoài mép là đứng im.
    const handleGlobalWheel = (e) => {
      if (anhDangXemRef.current !== null) return;   // đang xem ảnh thì đứng yên
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        e.preventDefault();
        containerRef.current.scrollTop += e.deltaY;
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleGlobalWheel, { passive: false });

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [isOpen, onClose]);

  // Chân trang lọt vào tầm nhìn thì cho nút "Lên đầu" rút lui — xem chú thích
  // đầy đủ ở ProjectModal. Hai modal giữ y hệt một cách hành xử.
  useEffect(() => {
    if (!isOpen) return;
    const moc = footerRef.current;
    const khung = containerRef.current;
    if (!moc || !khung) return;

    const ob = new IntersectionObserver(
      ([muc]) => setFooterTrongTam(muc.isIntersecting),
      { root: khung, threshold: 0 }
    );
    ob.observe(moc);
    return () => ob.disconnect();
  }, [isOpen, client?.id]);

  // Mở từ một ảnh cụ thể thì cuộn tới đúng ảnh đó.
  useEffect(() => {
    if (!isOpen || !initialIndex) return;
    const el = document.getElementById(`client-anh-${initialIndex}`);
    if (el) el.scrollIntoView({ block: 'start' });
  }, [isOpen, initialIndex, client?.id]);

  if (!isOpen || !client) return null;

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight > clientHeight) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100)));
      setShowBackToTop(scrollTop > 220);
    }
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const noiDung = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn">

      {/* Nền bấm để đóng */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        onClick={onClose}
      />

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onScroll={handleScroll}
        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0E0E12] text-white rounded-3xl overflow-y-auto shadow-2xl border border-white/15 flex flex-col z-10 no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {/* Vạch tiến độ cuộn mảnh ở mép trên */}
        <div className="sticky top-0 left-0 right-0 h-[2px] bg-white/5 z-50 rounded-t-3xl overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[#C3EA39] transition-all duration-150 ease-out shadow-[0_0_8px_#C3EA39]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Nút đóng luôn nổi ở góc phải */}
        <div className="sticky top-0 right-0 z-[100] flex justify-end p-3.5 sm:p-6 pointer-events-none -mb-14 sm:-mb-16">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="pointer-events-auto w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#181820]/95 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/25 hover:border-[#C3EA39] shadow-2xl cursor-pointer active:scale-90 hover:scale-105 touch-manipulation"
            aria-label="Đóng popup"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-5 sm:p-10 md:p-14 space-y-6 sm:space-y-10">

          {/* Tên brand + dịch vụ + ghi chú */}
          <div className="pr-14 sm:pr-16 space-y-1.5 sm:space-y-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold uppercase text-white tracking-tight leading-snug">
              {ten}
            </h2>

            {(client.year || '').trim() && (
              <div className="font-mono text-xs sm:text-sm text-[#C3EA39]">{client.year}</div>
            )}

            {/* Mô tả — để trống trong CMS thì ẩn hẳn dòng này */}
            {(client.note || '').trim() && (
              <p className="text-xs sm:text-sm md:text-base text-white/70 font-light leading-relaxed max-w-3xl">
                {client.note}
              </p>
            )}
          </div>

          {/* Lưới ảnh kiểu Pinterest.
              Dùng `columns-*` của CSS: mỗi tấm giữ đúng tỉ lệ gốc của nó, cao
              thấp khác nhau, rồi tự xếp khít vào các cột — không cắt xén ảnh
              tấm nào. Đổi lại thứ tự đọc là xuống hết cột này mới sang cột kia,
              đúng như Pinterest. Lưới CSS thì xếp theo hàng nên phải ép mọi ô
              cao bằng nhau, tức là phải cắt ảnh — không hợp ở đây. */}
          {images.length > 0 && (
            <div className="columns-2 md:columns-3 gap-4 sm:gap-5">
              {images.map((url, idx) => {
                const xong = !!daTai[idx];
                return (
                  <button
                    key={idx}
                    id={`client-anh-${idx}`}
                    type="button"
                    onClick={() => datAnhDangXem(idx)}
                    aria-label={`Xem lớn ấn phẩm ${idx + 1} của ${ten}`}
                    /* `break-inside-avoid` để một tấm không bị cắt đôi giữa hai
                       cột. Chưa tải xong thì giữ sẵn một khung 3/4 cho có chỗ,
                       không thì mọi tấm đều cao 0 và dồn hết vào cột đầu, tải
                       xong lại nhảy loạn lên. */
                    className={`group/a block w-full mb-4 sm:mb-5 break-inside-avoid relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] cursor-zoom-in transition-all duration-300 hover:border-[#C3EA39]/50 focus-visible:outline-none focus-visible:border-[#C3EA39] focus-visible:ring-2 focus-visible:ring-[#C3EA39]/60 ${xong ? '' : 'aspect-[3/4]'}`}
                  >
                    <SmartImage
                      src={url}
                      alt={`${ten} — ấn phẩm ${idx + 1}`}
                      /* Ô lưới hẹp hơn nhiều so với bài viết: 3 cột trong hộp
                         rộng ~880px là khoảng 280px mỗi ô. */
                      sizes="(min-width: 768px) 290px, 45vw"
                      onLoad={() => setDaTai(t => (t[idx] ? t : { ...t, [idx]: true }))}
                      onError={() => setDaTai(t => (t[idx] ? t : { ...t, [idx]: true }))}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      loading={idx < 6 ? 'eager' : 'lazy'}
                      decoding="async"
                      className={`select-none transition-[opacity,transform] duration-500 group-hover/a:scale-[1.03] ${
                        xong ? 'w-full h-auto opacity-100' : 'absolute inset-0 w-full h-full object-cover opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Chân trang */}
          <div ref={footerRef} className="pt-6 sm:pt-8 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-mono text-white/50 hover:text-[#C3EA39] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">QUAY LẠI DANH SÁCH</span>
                <span className="sm:hidden">QUAY LẠI</span>
              </button>

              <span className="hidden sm:block w-px h-3 bg-white/15 shrink-0" />
              <button
                type="button"
                onClick={scrollToTop}
                className="hidden sm:flex text-xs font-mono text-white/50 hover:text-[#C3EA39] transition-colors items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>LÊN ĐẦU</span>
              </button>
            </div>

          </div>

        </div>

        {/* Nút lên đầu.
            `self-end mr-6 -mt-12` giống hệt modal dự án. Bản trước dùng
            `left-[calc(100%-5.5rem)]`: vô dụng với thẻ nằm trong luồng, mà lại
            bị flex kéo giãn thành một thanh dài hết chiều ngang hộp. */}
        <AnimatePresence>
          {showBackToTop && !footerTrongTam && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={scrollToTop}
              className="sticky bottom-5 self-end mr-6 z-30 px-3.5 py-2 rounded-full bg-[#121216]/90 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 hover:border-[#C3EA39] backdrop-blur-xl shadow-2xl flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer hover:scale-105 -mt-12"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lên đầu</span>
            </motion.button>
          )}
        </AnimatePresence>

      </motion.div>

      <AnimatePresence>
        {anhDangXem !== null && images[anhDangXem] && (
          <ImageViewer
            src={images[anhDangXem]}
            alt={`${ten} — ấn phẩm ${anhDangXem + 1}`}
            index={anhDangXem}
            total={images.length}
            onClose={() => datAnhDangXem(null)}
            onPrev={() => doiAnh(-1)}
            onNext={() => doiAnh(1)}
          />
        )}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(noiDung, document.body) : noiDung;
}
