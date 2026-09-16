import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowUp, ExternalLink } from 'lucide-react';

/**
 * Chi tiết một brand đã làm việc cùng.
 *
 * Dựng theo ĐÚNG khung của ProjectModal — cùng hộp, cùng vạch tiến độ, cùng nút
 * đóng, cùng lề trong, cùng cách xếp ảnh dọc, cùng chân trang. Khác đúng phần
 * ruột: tiêu đề là tên brand + dịch vụ/năm, và nút phải là "Xem thêm" thay cho
 * "DỰ ÁN TIẾP THEO".
 */
export default function ClientMemoryModal({ client, isOpen, initialIndex = 0, onClose }) {
  const containerRef = useRef(null);
  const footerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [footerTrongTam, setFooterTrongTam] = useState(false);

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
  }, [isOpen, client?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Lăn chuột ở vùng nền tối bên ngoài hộp thì vẫn cuộn được bài viết.
    // Giống modal dự án: không có cái này thì lăn ra ngoài mép là đứng im.
    const handleGlobalWheel = (e) => {
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

  const ten = client.clientName || 'Brand';
  const images = Array.from(new Set([
    client.coverImage,
    ...(Array.isArray(client.gallery) ? client.gallery : []),
  ].filter(Boolean)));

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

            {(client.service || client.year) && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs sm:text-sm text-[#C3EA39]">
                {client.service && <span>{client.service}</span>}
                {client.service && client.year && <span className="text-white/25">·</span>}
                {client.year && <span>{client.year}</span>}
              </div>
            )}

            {client.note && (
              <p className="text-xs sm:text-sm md:text-base text-white/70 font-light leading-relaxed max-w-3xl">
                {client.note}
              </p>
            )}
          </div>

          {/* Các ảnh đã làm, xếp dọc */}
          {images.length > 0 && (
            <div className="space-y-6 sm:space-y-8">
              {images.map((url, idx) => (
                <div
                  key={idx}
                  id={`client-anh-${idx}`}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl relative group"
                >
                  <img
                    src={url}
                    alt={`${ten} — ấn phẩm ${idx + 1}`}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-auto object-cover select-none group-hover:scale-[1.01] transition-transform duration-500"
                  />
                </div>
              ))}
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

            {client.link && (
              <a
                href={client.link.startsWith('http') ? client.link : `https://${client.link}`}
                target="_blank"
                rel="noopener noreferrer"
                /* Không `uppercase`: chữ để thường theo ý anh. Bỏ luôn tracking-wider
                   vì giãn chữ rộng vốn để cứu chữ hoa, đặt lên chữ thường thì rời rạc. */
                className="px-5 py-2.5 rounded-full bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
              >
                <span>Xem thêm</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
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
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(noiDung, document.body) : noiDung;
}
