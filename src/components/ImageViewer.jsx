import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Xem một tấm ảnh ở cỡ lớn nhất màn hình cho phép.
 *
 * Cố ý để trống: không tim, không tải về, không chia sẻ — chỉ có ảnh, nút đóng,
 * và lối qua lại nếu có nhiều tấm.
 *
 * KHÔNG tự bắt phím ở đây. Thẻ cha đã có sẵn một bộ bắt phím cho cả bài viết;
 * thêm một bộ nữa trên `window` thì hai bên cùng nghe phím Esc, và thứ tự chạy
 * phụ thuộc vào bên nào gắn trước — đóng ảnh xong đóng luôn cả bài viết. Cha
 * gọi `onClose` / `onPrev` / `onNext` là đủ.
 *
 * `src` để nguyên bản gốc chứ không dùng bản thu nhỏ: đây đúng là lúc người xem
 * muốn nhìn rõ chi tiết.
 */
export default function ImageViewer({ src, alt, index, total, onClose, onPrev, onNext }) {
  if (!src) return null;

  const nhieuAnh = total > 1;

  const noiDung = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      /* Cao hơn bài viết (z-99999) một bậc để nằm đè lên trên. */
      className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-2xl flex items-center justify-center"
      onClick={onClose}
    >
      {/* Nút đóng */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-20 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#181820]/95 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/25 hover:border-[#C3EA39] shadow-2xl cursor-pointer active:scale-90 hover:scale-105 touch-manipulation"
        aria-label="Đóng ảnh"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>

      {nhieuAnh && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center bg-[#181820]/80 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/20 hover:border-[#C3EA39] cursor-pointer active:scale-90 touch-manipulation"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center bg-[#181820]/80 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/20 hover:border-[#C3EA39] cursor-pointer active:scale-90 touch-manipulation"
            aria-label="Ảnh sau"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-[#181820]/80 backdrop-blur-xl border border-white/15 font-mono text-[11px] text-white/70 pointer-events-none">
            {index + 1} / {total}
          </div>
        </>
      )}

      {/* Bấm vào chính tấm ảnh thì KHÔNG đóng — chỉ bấm ra vùng tối mới đóng. */}
      <motion.img
        key={src}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        decoding="async"
        className="max-w-[94vw] max-h-[92vh] w-auto h-auto object-contain select-none rounded-lg shadow-2xl"
      />
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(noiDung, document.body) : noiDung;
}
