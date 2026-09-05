import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function RandomWorkSection() {
  const { randomWorks, profile } = usePortfolioData();
  const [currentIndex, setCurrentIndex] = useState(0);

  const works = randomWorks || [];
  const safeIndex = currentIndex < works.length ? currentIndex : 0;
  const currentItem = works[safeIndex];

  // Auto rotate every 7s
  useEffect(() => {
    if (works.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % works.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [works.length]);

  return (
    <section id="random" className="pt-10 sm:pt-16 pb-10 sm:pb-16 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y">
      
      {/* Background Subtle Lime Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[550px] h-[400px] bg-[#C3EA39]/5 blur-[180px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Pure Clean Typography (5 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-3"
          >
            {/* Header: 01 Tùm lum tà la */}
            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
                {profile?.section01Number || '01'}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {profile?.section01Title || 'Tùm lum tà la'}
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-md pt-0.5">
              {profile?.section01Subtitle || 'Những sản phẩm này được làm ra lúc rảnh rỗi và có hứng làm gì đó...'}
            </p>
          </motion.div>

          {/* RIGHT COLUMN: Big Square Rotating Showcase (7 Cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[560px] sm:max-w-[620px] lg:max-w-[660px] xl:max-w-[700px] aspect-square rounded-3xl overflow-hidden border border-white/10 hover:border-[#C3EA39]/40 bg-[#121216] shadow-2xl p-2.5 sm:p-3.5 group transition-all duration-500">
              
              {/* Inner Image Frame with Stacked Seamless Cross-Fade */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black border border-white/5">
                {works.length > 0 ? (
                  works.map((item, idx) => {
                    const isActive = safeIndex === idx;
                    return (
                      <div
                        key={item.id || idx}
                        className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                          isActive
                            ? 'opacity-100 z-10'
                            : 'opacity-0 z-0 pointer-events-none'
                        }`}
                      >
                        <img
                          src={item.image}
                          alt={item.title || `Random Artwork ${idx + 1}`}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-1.5 text-white/40">
                    <span className="text-3xl">✦</span>
                    <p className="font-display font-medium text-sm text-white/70">Chưa có tác phẩm ngẫu hứng</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>

        </div>

      </div>

    </section>
  );
}

