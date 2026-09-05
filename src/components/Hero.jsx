import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, MapPin } from 'lucide-react';
import { profile } from '../data/profile';
import { usePortfolioData } from '../context/PortfolioDataContext';
import PhotoshopSimulator from './PhotoshopSimulator';

export default function Hero() {
  const { marqueeItems, profile: contextProfile } = usePortfolioData();
  const currentProfile = contextProfile || profile;
  const [isSwapped, setIsSwapped] = useState(false);

  const rawItems = marqueeItems && marqueeItems.length > 0 ? marqueeItems : [
    "UI/UX PRODUCT DESIGN",
    "BRAND IDENTITY",
    "DESIGN SYSTEMS",
    "2 NĂM KINH NGHIỆM",
    "FIGMA & SPLINE 3D",
    "MOBILE APP EXPERIENCES",
    "EDITORIAL & PACKAGING"
  ];

  // Repeat items so each track is guaranteed to fill any ultra-wide screen (>= 16 items)
  const repeatCount = Math.max(2, Math.ceil(16 / (rawItems.length || 1)));
  const items = Array(repeatCount).fill(rawItems).flat();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSwapped((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen w-full max-w-full flex flex-col justify-between pt-24 sm:pt-28 lg:pt-24 pb-6 sm:pb-8 overflow-hidden touch-pan-y">
      
      {/* Subtle Ambient Background Lime Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#C3EA39]/10 blur-[180px] rounded-full pointer-events-none" />

      {/* Main 2-Column Balanced Content Block: Left Info + Right Photoshop Simulator */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10 w-full flex-1 flex flex-col justify-center py-4 sm:py-6 lg:-translate-y-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 xl:gap-8 items-center">
          
          {/* LEFT COLUMN: Main Info & Brand Headline (Untouched & Bold) */}
          <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center pr-0 lg:pr-2">
            
            {/* Top Tagline: Buôn Ma Thuột */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2.5 mb-5 sm:mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-mono text-white/90 backdrop-blur-md hover:border-[#C3EA39]/40 transition-colors">
                <MapPin className="w-4 h-4 text-[#C3EA39]" />
                <span>{profile.location}</span>
              </span>
            </motion.div>

            {/* Big Clean SHOW / CASE Headline with 5s Alternating Fill/Stroke */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 sm:mb-8"
            >
              <h1 className="text-[4.5rem] xs:text-[5.5rem] sm:text-8xl md:text-8xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black tracking-tighter uppercase leading-[0.88] select-none">
                <span
                  className={`block transition-all duration-700 ease-in-out ${
                    !isSwapped
                      ? 'text-[#C3EA39]'
                      : 'text-transparent [-webkit-text-stroke:2px_#C3EA39] sm:[-webkit-text-stroke:2.5px_#C3EA39]'
                  }`}
                >
                  SHOW
                </span>
                <span
                  className={`block mt-1 transition-all duration-700 ease-in-out ${
                    !isSwapped
                      ? 'text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.85)] sm:[-webkit-text-stroke:2.5px_rgba(255,255,255,0.85)]'
                      : 'text-white'
                  }`}
                >
                  CASE<span className="text-[#C3EA39] [-webkit-text-stroke:0px]">.</span>
                </span>
              </h1>

              {/* Enhanced & Legible Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-[15px] sm:text-base text-white/80 font-normal max-w-lg leading-relaxed"
              >
                {currentProfile?.subtitle || "Đây là nơi mình lưu giữ các sản phẩm được làm ra trong thời gian qua, bạn ghé rồi thì xem qua thử nhaaa ^^"}
              </motion.p>
            </motion.div>

            {/* Clean Action Button: Dạo xem 1 vòng */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center"
            >
              <button
                onClick={() => {
                  const target = document.getElementById('cover-banner') || document.getElementById('random-work') || document.getElementById('work');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
                  }
                }}
                className="px-5 py-2.5 sm:px-7 sm:py-3.5 md:px-8 md:py-4 rounded-full bg-[#C3EA39] hover:bg-[#b0d62e] active:scale-95 text-black font-bold text-xs sm:text-sm md:text-base tracking-wide flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-[#C3EA39]/20 transition-all cursor-pointer select-none"
              >
                <span>Dạo xem 1 vòng</span>
                <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
              </button>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Interactive Adobe Illustrator Design Simulation */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center lg:items-end w-full max-w-full overflow-hidden">
            <div className="w-full max-w-full flex justify-center lg:justify-end overflow-hidden">
              <PhotoshopSimulator />
            </div>
          </div>

        </div>

      </div>

      {/* Artistic Tilted Marquee Strip (100% Seamless Infinite Loop) */}
      <div className="relative w-full max-w-full overflow-hidden py-3 sm:py-5 mt-4 sm:mt-0 translate-y-1 sm:-translate-y-6 pointer-events-none">
        <div className="-rotate-1 sm:-rotate-1.5 py-3 sm:py-3.5 bg-[#0D0D12] border-y border-[#C3EA39]/60 shadow-2xl text-[#C3EA39] font-mono font-extrabold text-xs sm:text-sm tracking-widest uppercase select-none overflow-hidden w-full max-w-full">
          <div className="animate-marquee whitespace-nowrap flex items-center pointer-events-auto">
            {/* Loop Segment 1 */}
            <div className="flex items-center gap-8 pr-8 shrink-0">
              {items.map((item, idx) => (
                <span key={`group1-${idx}`} className="flex items-center gap-3">
                  <span className="text-white/40 font-normal">✦</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>

            {/* Loop Segment 2 (Duplicate for Seamless Infinite Loop) */}
            <div className="flex items-center gap-8 pr-8 shrink-0">
              {items.map((item, idx) => (
                <span key={`group2-${idx}`} className="flex items-center gap-3">
                  <span className="text-white/40 font-normal">✦</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
