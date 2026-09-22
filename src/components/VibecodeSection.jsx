import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowUpRight, Code2 } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';
import SmartImage from './SmartImage';
import { thuocTinhTai, chonAnhUuTien } from '../utils/responsiveImage';
import ImageViewer from './ImageViewer';

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

  // Ảnh chụp màn hình app. Lọc bỏ ô rỗng ngay ở đây để mọi chỗ bên dưới đếm
  // được cùng một con số — số tấm vẽ ra phải khớp với số tấm nút qua lại trong
  // khung xem lớn đi qua, không thì bấm mũi tên rơi vào ô trống.
  //
  // KHÔNG bọc useMemo: đây là một cái lọc trên vài phần tử, rẻ hơn nhiều so với
  // việc giữ bộ nhớ đệm, mà useMemo ở đây còn làm React Compiler bỏ qua không
  // tối ưu cả component.
  const anh = (Array.isArray(profile?.vibecodeGallery) ? profile.vibecodeGallery : [])
    .filter(u => typeof u === 'string' && u.trim());

  // Ba tấm đầu được ưu tiên tải, còn lại chờ cuộn tới. Suất ưu tiên nhảy qua
  // GIF vì GIF nặng gấp hàng chục lần — xem ghi chú ở chonAnhUuTien.
  const anhUuTien = chonAnhUuTien(anh, 3);

  const [anhDangXem, datAnhDangXem] = useState(null);
  const dangMoAnh = anhDangXem !== null;
  const soAnh = anh.length;

  // Nhận bước nhảy chứ không nhận chỉ số đích, và cập nhật theo kiểu hàm, nên
  // không cần biết tấm nào đang mở. Nhờ vậy dùng được cả ngoài JSX lẫn trong
  // effect bắt phím mà không kéo theo phụ thuộc nào.
  const doiAnh = (buoc) => {
    if (!soAnh) return;
    datAnhDangXem(i => (i + buoc + soAnh) % soAnh);
  };

  // ImageViewer CỐ Ý không tự bắt phím (xem ghi chú trong file đó): ở những chỗ
  // khác nó nằm trong một bài viết đã có sẵn bộ bắt phím. Mục này không có thẻ
  // cha nào như vậy nên phải tự lo, không thì mở ảnh lên bấm Esc không đóng.
  useEffect(() => {
    if (!dangMoAnh) return;

    const batPhim = (e) => {
      if (e.key === 'Escape') datAnhDangXem(null);
      else if (e.key === 'ArrowLeft') datAnhDangXem(i => (i - 1 + soAnh) % soAnh);
      else if (e.key === 'ArrowRight') datAnhDangXem(i => (i + 1) % soAnh);
    };
    window.addEventListener('keydown', batPhim);

    // Khoá cuộn nền: không khoá thì lăn chuột lúc đang xem ảnh làm trang chạy
    // ngầm phía sau, đóng ra là lạc mất chỗ cũ.
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', batPhim);
      document.body.style.overflow = 'unset';
    };
  }, [dangMoAnh, soAnh]);

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
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121216] p-6 sm:p-8 md:p-10"
        >
          {/* Vệt sáng quét ngang. Nằm TRÊN nội dung nên chữ cũng sáng lên một
              nhịp khi vệt đi qua — đó mới giống ánh sáng lướt qua mặt thẻ. Để
              dưới thì chỉ thấy nền nhấp nháy, chữ đứng im, nhìn rời rạc.
              `pointer-events-none` để nó không nuốt cú bấm vào nút Tải về. */}
          <div
            aria-hidden="true"
            className="vet-sang pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20"
          />

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

              {/* Dải ảnh chụp app — vuông nhỏ, nằm giữa phần mô tả và nút tải.
                  Bấm một tấm là mở khung xem lớn.

                  Vuông chứ không theo tỉ lệ thật của ảnh: đây là dải xem trước,
                  mọi ô bằng nhau thì hàng mới thẳng. Tấm nào cao hay ngang thì
                  `object-cover` cắt bớt cho vừa ô, bấm vào vẫn thấy nguyên tấm.

                  Căn giữa trên điện thoại cho khớp với chữ (cột này đang
                  `text-center md:text-left`). */}
              {anh.length > 0 && (
                <div className="mt-4 sm:mt-5 flex flex-wrap justify-center md:justify-start gap-2 sm:gap-2.5">
                  {anh.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => datAnhDangXem(idx)}
                      aria-label={`Xem lớn ảnh ${idx + 1} của ${tenApp || 'ứng dụng'}`}
                      className="group/a relative block w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 cursor-zoom-in transition-all duration-300 hover:border-[#C3EA39]/60 focus-visible:outline-none focus-visible:border-[#C3EA39] focus-visible:ring-2 focus-visible:ring-[#C3EA39]/60"
                    >
                      <SmartImage
                        src={url}
                        alt={`${tenApp || 'Ứng dụng'} — ảnh ${idx + 1}`}
                        sizes="72px"
                        {...thuocTinhTai(url, anhUuTien.has(idx))}
                        decoding="async"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                        className="w-full h-full object-cover select-none transition-transform duration-500 group-hover/a:scale-[1.08]"
                      />
                    </button>
                  ))}
                </div>
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

      <AnimatePresence>
        {dangMoAnh && (
          <ImageViewer
            src={anh[anhDangXem]}
            alt={`${tenApp || 'Ứng dụng'} — ảnh ${anhDangXem + 1}`}
            index={anhDangXem}
            total={anh.length}
            onClose={() => datAnhDangXem(null)}
            onPrev={() => doiAnh(-1)}
            onNext={() => doiAnh(1)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
