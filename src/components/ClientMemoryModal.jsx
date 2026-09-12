import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, ArrowUp, ExternalLink } from 'lucide-react';

/**
 * Chi tiết một brand đã làm việc cùng.
 *
 * Dùng ĐÚNG bố cục của modal dự án: tiêu đề -> các ảnh xếp dọc -> nút cuối.
 * Bản trước là kiểu xem ảnh hai cột (ảnh lớn + nút qua lại + dải thumbnail) —
 * xem được một ảnh tại một thời điểm, phải bấm qua từng cái, và trông lạc hẳn
 * so với phần còn lại của trang. Cuộn dọc đọc được liền mạch hơn nhiều.
 */
export default function ClientMemoryModal({ client, isOpen, initialIndex = 0, onClose }) {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    if (containerRef.current) containerRef.current.scrollTop = 0;
    setScrollProgress(0);
    setShowBackToTop(false);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, client?.id]);

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
      <div className="fixed inset-0" onClick={onClose} />

      <div
        ref={containerRef}
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
            aria-label="Đóng"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-5 sm:p-10 md:p-14 space-y-6 sm:space-y-10">

          {/* Tên brand + dịch vụ + ghi chú */}
          <div className="pr-14 sm:pr-16 space-y-2 sm:space-y-3">
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
              <p className="text-xs sm:text-sm md:text-base text-white/70 font-light leading-relaxed max-w-3xl pt-1">
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

          {/* Nút cuối */}
          <div className="pt-6 sm:pt-8 border-t border-white/10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-mono text-white/50 hover:text-[#C3EA39] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>QUAY LẠI</span>
            </button>

            {client.link && (
              <a
                href={client.link.startsWith('http') ? client.link : `https://${client.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
              >
                <span>XEM THÊM</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>

        {/* Nút lên đầu */}
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="sticky bottom-5 left-[calc(100%-5.5rem)] z-[100] px-3.5 py-2 rounded-full bg-[#181820]/95 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl border border-white/25 shadow-2xl text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            aria-label="Lên đầu"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lên đầu</span>
          </button>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(noiDung, document.body) : noiDung;
}
