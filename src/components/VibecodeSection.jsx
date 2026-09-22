import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowUpRight, Code2 } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';
import SmartImage from './SmartImage';
import { thuocTinhTai, chonAnhUuTien } from '../utils/responsiveImage';
import ImageViewer from './ImageViewer';
import { docDanhSachApp } from '../utils/vibecodeApps';

// Dải xem trước chỉ bày 3 ô. Nhiều hơn thì ô thứ 3 làm mờ và đè con số lên,
// bấm vào vẫn mở được cả bộ trong khung xem lớn.
//
// Ba ô là vừa: đủ để hình dung app trông ra sao, mà chưa biến khối giới thiệu
// thành một album. Ai muốn xem hết thì bấm vào là có hết.
const SO_O_BAY = 3;

/**
 * Một thẻ app: logo trái, diễn giải phải, dải ảnh và nút tải ở hàng cuối.
 *
 * Tách riêng khỏi VibecodeSection vì mục này chứa được nhiều app. Để nguyên
 * trong vòng lặp thì mỗi lần sửa bố cục phải lần trong một khối JSX dài gấp
 * đôi.
 */
function TheApp({ app, moAnh }) {
  const anh = app.gallery;
  const anhBay = anh.slice(0, SO_O_BAY);
  const soConLai = Math.max(0, anh.length - SO_O_BAY);

  // Ba tấm đầu được ưu tiên tải, còn lại chờ cuộn tới. Suất ưu tiên nhảy qua
  // GIF vì GIF nặng gấp hàng chục lần — xem ghi chú ở chonAnhUuTien.
  const anhUuTien = chonAnhUuTien(anh, SO_O_BAY);
  const chuNut = app.buttonText || 'TẢI VỀ';

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121216] p-6 sm:p-8 md:p-10"
    >
      {/* Vệt sáng quét ngang. Nằm TRÊN nội dung nên chữ cũng sáng lên một nhịp
          khi vệt đi qua — đó mới giống ánh sáng lướt qua mặt thẻ. Để dưới thì
          chỉ thấy nền nhấp nháy, chữ đứng im, nhìn rời rạc.
          `pointer-events-none` để nó không nuốt cú bấm vào nút Tải về. */}
      <div
        aria-hidden="true"
        className="vet-sang pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent z-20"
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-8 lg:gap-10">

        {/* TRÁI: logo app — 290px, đúng bằng chiều cao của cả cột phải (tên app
            + dòng ngắn + diễn giải + dải ảnh + nút tải), nên hai bên bằng nhau
            đúng bằng vạch trên và vạch dưới.

            VÌ SAO LÀ MỘT CON SỐ CỐ ĐỊNH CHỨ KHÔNG ĐO THEO CỘT PHẢI:
            CSS không làm được. Trong flex, bề rộng được tính TRƯỚC rồi mới kéo
            giãn chiều cao, nên `aspect-square` + `self-stretch` cho ra ô cao
            256px mà rộng 2px — đã thử, đo được đúng như vậy. Đo bằng JavaScript
            thì lại thành vòng lặp: logo rộng ra -> cột phải hẹp lại -> chữ
            xuống dòng nhiều hơn -> cột phải cao lên -> logo lại rộng ra nữa.

            CHIA HAI CỘT TỪ lg (1024px) CHỨ KHÔNG PHẢI md (768px): ở 768px, ô
            logo 290px còn rộng hơn cả cột chữ bên cạnh (287px) — chữ bị ép
            thành một dải hẹp, đọc rất mệt. Đo được đúng như vậy. */}
        <div className="shrink-0 mx-auto lg:mx-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-[290px] lg:h-[290px] rounded-3xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
          {app.logo ? (
            <SmartImage
              src={app.logo}
              alt={app.name ? `Logo ${app.name}` : 'Logo ứng dụng'}
              sizes="(min-width: 1024px) 290px, (min-width: 768px) 192px, 160px"
              {...thuocTinhTai(app.logo, false)}
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="w-full h-full object-contain select-none"
            />
          ) : (
            /* Chưa tải logo thì để một icon thay chỗ, không để ô trống rỗng
               trông như ảnh vỡ. */
            <Code2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#C3EA39]/60" />
          )}
        </div>

        {/* PHẢI: diễn giải + dải ảnh + nút tải */}
        <div className="flex-1 min-w-0 text-center lg:text-left">
          {app.name && (
            <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              {app.name}
            </h3>
          )}

          {app.tagline && (
            <p className="mt-1.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-[#C3EA39]">
              {app.tagline}
            </p>
          )}

          {/* `whitespace-pre-line` để xuống dòng trong ô CMS ra đúng xuống dòng
              ngoài trang — không có nó thì cả đoạn dính thành một khối. */}
          {app.desc && (
            <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-white/70 whitespace-pre-line">
              {app.desc}
            </p>
          )}

          {/* HÀNG CUỐI: dải ảnh xem trước bên trái, nút tải bên phải.
              Hai thứ này nằm CÙNG một hàng chứ không xếp chồng, để dải ảnh có
              chỗ cao lên cho bằng đáy logo. Tách làm hai dòng thì ô ảnh chỉ còn
              một nửa chiều cao đó.

              `items-end` để đáy hai bên thẳng nhau, và cùng thẳng với đáy logo.
              Dưới lg thì xếp dọc và căn giữa cho khớp với chữ. */}
          {(anh.length > 0 || app.url) && (
            <div className="mt-4 sm:mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-5">

              {/* Ô vuông chứ không theo tỉ lệ thật của ảnh: đây là dải xem
                  trước, mọi ô bằng nhau thì hàng mới thẳng. Tấm nào cao hay
                  ngang thì `object-cover` cắt bớt cho vừa ô — bấm vào vẫn thấy
                  nguyên tấm trong khung xem lớn. */}
              {anh.length > 0 && (
                <div className="flex justify-center lg:justify-start gap-2.5 sm:gap-3">
                  {anhBay.map((url, idx) => {
                    const oCuoiConNua = soConLai > 0 && idx === SO_O_BAY - 1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => moAnh(app, idx)}
                        aria-label={
                          oCuoiConNua
                            ? `Xem toàn bộ ${anh.length} ảnh của ${app.name || 'ứng dụng'}`
                            : `Xem lớn ảnh ${idx + 1} của ${app.name || 'ứng dụng'}`
                        }
                        className="group/a relative block w-20 h-20 sm:w-28 sm:h-28 lg:w-[140px] lg:h-[140px] shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 cursor-zoom-in transition-all duration-300 hover:border-[#C3EA39]/60 focus-visible:outline-none focus-visible:border-[#C3EA39] focus-visible:ring-2 focus-visible:ring-[#C3EA39]/60"
                      >
                        <SmartImage
                          src={url}
                          alt={`${app.name || 'Ứng dụng'} — ảnh ${idx + 1}`}
                          sizes="(min-width: 1024px) 140px, (min-width: 640px) 112px, 80px"
                          {...thuocTinhTai(url, anhUuTien.has(idx))}
                          decoding="async"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          className={
                            'w-full h-full object-cover select-none transition-transform duration-500 group-hover/a:scale-[1.08] ' +
                            (oCuoiConNua ? 'opacity-35' : '')
                          }
                        />

                        {/* Ô cuối: làm mờ ảnh rồi đè số còn lại lên. Vẫn để thấy
                            ảnh mờ phía sau chứ không phủ kín — có vậy mới đọc ra
                            là "còn ảnh nữa" thay vì một ô trống. */}
                        {oCuoiConNua && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white font-display font-extrabold text-base sm:text-xl lg:text-2xl">
                            +{soConLai}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chưa dán link thì không dựng nút: nút bấm không đi đâu còn tệ
                  hơn là không có nút. */}
              {app.url && (
                <div className="flex justify-center lg:justify-end shrink-0">
                  <a
                    href={app.url}
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
          )}
        </div>

      </div>
    </motion.div>
  );
}

/**
 * Mục giới thiệu các app tự viết.
 *
 * Chứa được nhiều app, mỗi app một thẻ, xếp dọc trong cùng một mục.
 *
 * TỰ ẨN KHI CHƯA ĐIỀN:
 * Không app nào có tên lẫn diễn giải thì cả mục không dựng. Không có luật đó
 * thì ngay khi đưa code lên, trang thật mọc ra một khung rỗng nằm chình ình
 * dưới mục "Về tui" cho tới lúc chủ trang kịp vào CMS điền.
 */
export default function VibecodeSection() {
  const { profile } = usePortfolioData();

  const cacApp = docDanhSachApp(profile);
  const soMuc = (profile?.vibecodeNumber || '').trim();
  const tieuDe = (profile?.vibecodeTitle || '').trim() || '#Vibecode vui vẻ';

  // Khung xem ảnh lớn dùng CHUNG cho mọi app, không để mỗi thẻ giữ một cái:
  // chỉ mở được một tấm tại một thời điểm, mà bộ bắt phím cũng chỉ cần một.
  //
  // Giữ luôn bộ ảnh của app đang mở chứ không chỉ giữ chỉ số app: mũi tên
  // trái/phải phải chạy trong đúng bộ ảnh đó, không lạc sang app bên cạnh.
  const [dangXem, datDangXem] = useState(null); // { ten, anh: [], idx }

  const moAnh = (app, idx) => datDangXem({ ten: app.name, anh: app.gallery, idx });

  const doiAnh = (buoc) =>
    datDangXem(v => (v ? { ...v, idx: (v.idx + buoc + v.anh.length) % v.anh.length } : v));

  // ImageViewer CỐ Ý không tự bắt phím (xem ghi chú trong file đó): ở những chỗ
  // khác nó nằm trong một bài viết đã có sẵn bộ bắt phím. Mục này không có thẻ
  // cha nào như vậy nên phải tự lo, không thì mở ảnh lên bấm Esc không đóng.
  useEffect(() => {
    if (!dangXem) return;

    const soAnh = dangXem.anh.length;
    const batPhim = (e) => {
      if (e.key === 'Escape') datDangXem(null);
      else if (e.key === 'ArrowLeft') datDangXem(v => (v ? { ...v, idx: (v.idx - 1 + soAnh) % soAnh } : v));
      else if (e.key === 'ArrowRight') datDangXem(v => (v ? { ...v, idx: (v.idx + 1) % soAnh } : v));
    };
    window.addEventListener('keydown', batPhim);

    // Khoá cuộn nền: không khoá thì lăn chuột lúc đang xem ảnh làm trang chạy
    // ngầm phía sau, đóng ra là lạc mất chỗ cũ.
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', batPhim);
      document.body.style.overflow = 'unset';
    };
  }, [dangXem]);

  if (cacApp.length === 0) return null;

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
            {/* Bỏ trống ô số mục trong CMS thì không dựng thẻ này luôn, để tiêu
                đề tự dịch sát mép trái. */}
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

        {/* Mỗi app một thẻ, xếp dọc trong cùng một mục */}
        <div className="space-y-5 sm:space-y-6">
          {cacApp.map(app => (
            <TheApp key={app.id} app={app} moAnh={moAnh} />
          ))}
        </div>

      </div>

      <AnimatePresence>
        {dangXem && (
          <ImageViewer
            src={dangXem.anh[dangXem.idx]}
            alt={`${dangXem.ten || 'Ứng dụng'} — ảnh ${dangXem.idx + 1}`}
            index={dangXem.idx}
            total={dangXem.anh.length}
            onClose={() => datDangXem(null)}
            onPrev={() => doiAnh(-1)}
            onNext={() => doiAnh(1)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
