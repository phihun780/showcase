import React from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ShowcaseWall from './ShowcaseWall';

/**
 * MỤC 01 — cụm ảnh 3D kéo xoay.
 *
 * Chỗ này trước là "Tùm lum tà la": một khung vuông, ảnh tự đổi 7 giây một lần,
 * xem thụ động. Giờ thay bằng cụm xoay kéo được.
 *
 * Giữ nguyên `id="random"` để mấy đường dẫn cũ dạng `#random` còn dùng được, dù
 * hiện tại không có menu nào trỏ tới.
 */
export default function ShowcaseWallSection() {
  const { showcaseWall, profile } = usePortfolioData();
  const anh = Array.isArray(showcaseWall) ? showcaseWall : [];

  // Chưa thêm ảnh nào thì không dựng cả mục, khỏi để lại một khoảng trống.
  if (anh.length === 0) return null;

  return (
    <section
      id="random"
      className="pt-10 sm:pt-16 pb-10 sm:pb-16 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Quầng sáng nền */}
      <div
        className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[550px] h-[400px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.06) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
              {profile?.section01Number || '01'}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {profile?.section01Title || 'Lúc rảnh rỗi'}
            </h2>
          </div>

          {/* Mô tả phụ — để trống trong CMS thì ẩn luôn. */}
          {(profile?.section01Subtitle || '').trim() && (
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-2xl pt-0.5">
              {profile.section01Subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <ShowcaseWall items={anh} hint={profile?.showcaseWallHint} />
        </motion.div>
      </div>
    </section>
  );
}
