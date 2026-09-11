import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, SlidersHorizontal, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';
import BeforeAfterSlider from './BeforeAfterSlider';
import SmartImage from './SmartImage';
import { extractEmbedSrc, extractJuxtaposeUid } from '../utils/juxtaposeUtils';

// Khung banner bám theo đúng tỷ lệ của ảnh, thay vì đóng cứng 16/9 - 21/9.
//
// VÌ SAO: khung cố định + object-cover nghĩa là ảnh nào không đúng tỷ lệ đó sẽ
// bị xén. Với ảnh 2048x762 (tỷ lệ 2.69) thì khung 16/9 trên mobile xén mất 34%
// bề ngang — chữ hai bên mép banner bị cắt cụt.
//
// Chặn trên/dưới để một tấm ảnh vuông hay quá dài cũng không làm vỡ bố cục.
const RATIO_MIN = 1.6;
const RATIO_MAX = 3.2;

function clampRatio(r) {
  if (!Number.isFinite(r) || r <= 0) return null;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));
}

// Ảnh đại diện cho tỷ lệ của một banner. Banner nhúng iframe thì không đo được.
function measurableImage(banner) {
  if (!banner) return null;
  if (banner.beforeImage && banner.afterImage) return banner.afterImage;
  const isEmbed = banner.type === 'embed' || Boolean(banner.embedCode || banner.embedUrl);
  if (isEmbed) return null;
  return banner.image || null;
}

// Juxtapose / Image Banner Renderer
function BannerItem({ banner, isActive }) {
  const isEmbed = banner.type === 'embed' || Boolean(banner.embedCode || banner.embedUrl || banner.beforeImage);
  const embedSrc = extractEmbedSrc(banner.embedUrl || banner.embedCode || banner.image);

  // 1. Direct Before/After Slider (0% Watermark, 100% High Performance Native)
  if (banner.beforeImage && banner.afterImage) {
    return (
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
          isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        <BeforeAfterSlider
          beforeImage={banner.beforeImage}
          afterImage={banner.afterImage}
          beforeLabel={banner.beforeLabel || ''}
          afterLabel={banner.afterLabel || ''}
          /* Khung tối đa 1280px trừ lề; dưới đó chiếm trọn bề ngang */
          sizes="(min-width: 1360px) 1280px, calc(100vw - 40px)"
        />
      </div>
    );
  }

  // 2. Iframe Fallback (Taller iframe with top-offset and bottom-right shield to completely cover third-party logo)
  if (isEmbed && embedSrc) {
    return (
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out overflow-hidden ${
          isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        <iframe
          src={embedSrc}
          title={banner.title || 'Juxtapose Comparison Slider'}
          className="absolute -top-3 left-0 w-full h-[122%] border-0 bg-[#0a0a0c]"
          allowFullScreen
          loading="lazy"
        />
        {/* Corner Shield to ensure zero watermark is visible under any viewport aspect ratio */}
        <div className="absolute bottom-0 right-0 w-32 h-10 bg-[#0a0a0c] z-20 pointer-events-none" />
      </div>
    );
  }

  // 3. Standard Image Banner
  return (
    <div
      className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out pointer-events-none ${
        isActive ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
      }`}
    >
      <SmartImage
        src={banner.image}
        alt={banner.title || 'Banner'}
        sizes="(min-width: 1360px) 1280px, calc(100vw - 40px)"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        loading={isActive ? 'eager' : 'lazy'}
        decoding="async"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function CoverBannerSection() {
  const { coverBanners } = usePortfolioData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const banners = coverBanners || [];
  const safeIndex = currentIndex < banners.length ? currentIndex : 0;
  const currentBanner = banners[safeIndex];

  // Đo tỷ lệ thật của banner đang hiển thị.
  const [ratio, setRatio] = useState(null);
  const measureSrc = measurableImage(currentBanner);

  useEffect(() => {
    if (!measureSrc) {
      setRatio(null);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive && img.naturalHeight > 0) {
        setRatio(clampRatio(img.naturalWidth / img.naturalHeight));
      }
    };
    img.onerror = () => alive && setRatio(null);
    img.src = measureSrc;
    return () => { alive = false; };
  }, [measureSrc]);

  // Auto rotate: 5.5s for static images, 14s for interactive Juxtapose embeds
  useEffect(() => {
    if (banners.length <= 1) return;
    const current = banners[safeIndex];
    const isEmbed = current?.type === 'embed' || Boolean(current?.embedCode || current?.embedUrl || current?.beforeImage);
    const duration = isEmbed ? 14000 : 5500;

    const interval = setInterval(() => {
      if (!isHovered) {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }
    }, duration);
    return () => clearInterval(interval);
  }, [banners.length, safeIndex, isHovered]);

  return (
    <section 
      id="cover-banner" 
      className="pt-8 sm:pt-14 pb-4 sm:pb-8 relative w-full max-w-full overflow-hidden touch-pan-y"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Background Subtle Ambient Glow (GPU Radial Gradient) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] pointer-events-none rounded-full" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.06) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {banners.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full aspect-[21/9] rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/30 text-center flex flex-col items-center justify-center space-y-2 p-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center font-mono font-bold text-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-display font-bold text-white">Khung Slide Banner Cover</h3>
            <p className="text-xs text-white/50 max-w-sm">
              Tải ảnh banner cover hoặc dán mã nhúng Juxtapose Before/After trong CMS để hiển thị tại đây.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Widescreen Banner Container (Responsive 16:9 Mobile / 21:9 Desktop) */}
            {/* Không có tỷ lệ đo được (banner nhúng iframe) thì quay về khung mặc định.
                Cố tình KHÔNG transition aspect-ratio: đó là thuộc tính layout, animate
                nó bắt trình duyệt reflow mỗi khung hình ngay vùng hero, và nếu transition
                bị ngắt giữa chừng thì khung kẹt luôn ở tỷ lệ cũ. */}
            {/* ring thay cho border: ring là box-shadow nên KHÔNG chiếm chỗ trong
                layout. Dùng border-2 thì viền ăn mất 4px mỗi chiều của content box,
                khiến ô chứa ảnh lệch 2.13% so với aspect-ratio đặt trên border box
                — đủ để hở một sợi ảnh nền phía dưới.
                ios-rounded-clip: xem chú thích trong index.css. */}
            <div
              className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black ring-2 ring-white/10 shadow-2xl select-none group touch-pan-y ios-rounded-clip ${
                ratio ? '' : 'aspect-[16/9] sm:aspect-[21/9]'
              }`}
              style={ratio ? { aspectRatio: String(ratio) } : undefined}
            >
              
              {/* Render All Banners */}
              {banners.map((banner, idx) => (
                <BannerItem
                  key={banner.id || idx}
                  banner={banner}
                  isActive={safeIndex === idx}
                />
              ))}

              {/* Bottom Subtle Gradient Vignette for Image Banners */}
              {(!currentBanner?.type || currentBanner?.type === 'image') && !currentBanner?.beforeImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none z-20" />
              )}

              {/* Bottom Info Overlay (Title & Description) */}
              <div className="absolute bottom-4 left-5 sm:bottom-6 sm:left-8 right-8 z-30 space-y-1 pointer-events-none">
                {banners.map((banner, idx) => {
                  const isActive = safeIndex === idx;
                  if (!banner.title && !banner.subtitle) return null;
                  return (
                    <div
                      key={`info-${banner.id || idx}`}
                      className={`transition-all duration-700 ease-out ${
                        isActive
                          ? 'opacity-100 translate-y-0 relative'
                          : 'opacity-0 translate-y-2 absolute inset-0 pointer-events-none hidden'
                      }`}
                    >
                      {banner.title && (
                        <h3 className="text-lg sm:text-2xl font-bold uppercase text-white tracking-tight drop-shadow-md">
                          {banner.title}
                        </h3>
                      )}
                      {banner.subtitle && (
                        <p className="text-xs sm:text-sm text-white/75 font-light line-clamp-1 drop-shadow">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Center Pagination Indicators */}
              {banners.length > 1 && (
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 shadow-xl">
                  {banners.map((b, idx) => {
                    const isActive = safeIndex === idx;
                    const isEmbed = b.type === 'embed' || Boolean(b.embedCode || b.embedUrl || b.beforeImage);

                    return (
                      <button
                        key={`banner-dot-${idx}`}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-500 cursor-pointer flex items-center justify-center ${
                          isActive
                            ? 'w-8 bg-[#C3EA39] shadow-sm shadow-[#C3EA39]/50'
                            : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        title={isEmbed ? 'Juxtapose comparison' : `Slide ${idx + 1}`}
                        aria-label={`Chuyển tới slide ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Prev / Next Navigation Chevrons on Hover (Desktop) */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-30 cursor-pointer backdrop-blur-md hidden sm:flex"
                    aria-label="Slide trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-30 cursor-pointer backdrop-blur-md hidden sm:flex"
                    aria-label="Slide tiếp theo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

            </div>
          </motion.div>
        )}

      </div>

    </section>
  );
}
