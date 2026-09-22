import React from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowUpRight, Code2 } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';
import SmartImage from './SmartImage';
import { thuocTinhTai } from '../utils/responsiveImage';

/**
 * Mục giới thiệu ứng dụng tự viết.
 *
 * Logo bên trái, diễn giải bên phải, nút tải ở dưới. Trên điện thoại thì logo
 * nằm trên, chữ nằm dưới — hai cột cạnh nhau ở bề ngang 375px là chữ bị ép
 * thành cột giấy dó, đọc không nổi.
 *
 * TỰ ẨN KHI CHƯA ĐIỀN:
 * Mục này chỉ hiện khi đã có tên app HOẶC phần diễn giải. Không có luật đó thì
 * ngay khi đưa code lên, trang thật mọc ra một khung rỗng nằm chình ình dưới
 * mục "Về tui" cho tới lúc chủ trang kịp vào CMS điền. Điền tới đâu hiện tới
 * đó thì không bao giờ có khoảnh khắc trống đó.
 */
export default function VibecodeSection() {
  const { profile } = usePortfolioData();

  const tenApp = (profile?.vibecodeAppName || '').trim();
  const dienGiai = (profile?.vibecodeDesc || '').trim();
  const logo = (profile?.vibecodeLogo || '').trim();
  const diaChi = (profile?.vibecodeUrl || '').trim();
  const tagline = (profile?.vibecodeTagline || '').trim();
  const chuNut = (profile?.vibecodeButtonText || '').trim() || 'TẢI VỀ';
  const soMuc = (profile?.vibecodeNumber || '').trim();
  const tieuDe = (profile?.vibecodeTitle || '').trim() || '#Vibecode vui vẻ';

  // Chưa điền gì thì coi như mục này không tồn tại.
  if (!tenApp && !dienGiai) return null;

  return (
    <section
      id="vibecode"
      className="pt-6 sm:pt-10 pb-14 sm:pb-20 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Vệt sáng nền, cùng công thức với các mục khác cho liền mạch */}
      <div
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[520px] h-[340px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.07) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">

        {/* Tiêu đề mục — dựng y hệt các mục khác để nhìn thành một hệ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            {/* Bỏ trống ô số mục trong CMS thì không dựng thẻ này luôn, để
                tiêu đề tự dịch sát mép trái. */}
            {soMuc && (
              <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
                {soMuc}
              </span>
            )}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {tieuDe}
            </h2>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-white/10 bg-[#121216] p-6 sm:p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 sm:gap-8 md:gap-10">

            {/* TRÁI: logo app */}
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                {logo ? (
                  <SmartImage
                    src={logo}
                    alt={tenApp ? `Logo ${tenApp}` : 'Logo ứng dụng'}
                    sizes="160px"
                    {...thuocTinhTai(logo, false)}
                    decoding="async"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className="w-full h-full object-contain select-none"
                  />
                ) : (
                  /* Chưa tải logo thì để một icon thay chỗ, không để ô trống
                     rỗng trông như ảnh vỡ. */
                  <Code2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#C3EA39]/60" />
                )}
              </div>
            </div>

            {/* PHẢI: diễn giải + nút tải */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              {tenApp && (
                <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                  {tenApp}
                </h3>
              )}

              {tagline && (
                <p className="mt-1.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-[#C3EA39]">
                  {tagline}
                </p>
              )}

              {/* `whitespace-pre-line` để xuống dòng trong ô CMS ra đúng xuống
                  dòng ngoài trang — không có nó thì cả đoạn dính thành một khối. */}
              {dienGiai && (
                <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-white/70 whitespace-pre-line">
                  {dienGiai}
                </p>
              )}

              {/* Chưa dán link thì không dựng nút: nút bấm không đi đâu còn tệ
                  hơn là không có nút. */}
              {diaChi && (
                <div className="mt-5 sm:mt-6 flex justify-center md:justify-start">
                  <a
                    href={diaChi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{chuNut}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
