import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ProjectModal from './ProjectModal';

export default function WorkSection() {
  const { projects } = usePortfolioData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeProjectModal, setActiveProjectModal] = useState(null);

  const safeIndex = selectedIndex < projects.length ? selectedIndex : 0;
  const currentProject = projects[safeIndex] || projects[0] || {};

  const handleNextProject = () => {
    const nextIdx = (selectedIndex + 1) % projects.length;
    setSelectedIndex(nextIdx);
    setActiveProjectModal(projects[nextIdx]);
  };

  const MIN_SLOTS = 4;
  const placeholderCount = Math.max(0, MIN_SLOTS - projects.length);
  const isScrollable = projects.length > MIN_SLOTS;

  return (
    <section id="work" className="pt-8 sm:pt-16 pb-8 sm:pb-16 scroll-mt-16 relative overflow-hidden">
      
      {/* Ambient background glow mapped to stage */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[350px] bg-[#C3EA39]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {/* Section Header with Reveal Motion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-[#C3EA39]">
              02
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Dự án của tui
            </h2>
          </div>
        </motion.div>

        {/* 1-SECTION INTERACTIVE STAGE OR EMPTY STATE */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center font-mono font-bold text-lg">
              ✦
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">Chưa có dự án nào</h3>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            
            {/* Left: Clean Project Selector List (5 Cols) - Perfectly matching right preview height */}
            <div
              className={`lg:col-span-5 flex flex-col ${
                isScrollable
                  ? 'h-full max-h-[360px] sm:max-h-[430px] overflow-y-auto custom-scrollbar pr-1.5 space-y-2.5'
                  : 'justify-between gap-2.5 sm:gap-3 h-full'
              }`}
            >
              {/* Actual Projects */}
              {projects.map((item, idx) => {
                const isActive = selectedIndex === idx;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => setSelectedIndex(idx)}
                    className={`cursor-pointer rounded-2xl transition-all duration-300 relative overflow-hidden ${
                      isScrollable ? 'py-3.5 px-5 min-h-[64px]' : 'flex-1 py-3 sm:py-3.5 px-5 sm:px-6'
                    } flex items-center justify-between ${
                      isActive
                        ? 'bg-[#141418] border-2 border-[#C3EA39] shadow-lg shadow-[#C3EA39]/5'
                        : 'bg-[#121216]/60 border border-white/5 hover:border-white/20 hover:bg-[#141418]/80'
                    }`}
                  >
                    {/* Left: Index & Project Title */}
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold text-xs ${isActive ? 'text-[#C3EA39]' : 'text-white/40'}`}>
                        {idx < 9 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <h3 className={`font-bold text-sm sm:text-base uppercase tracking-tight transition-colors ${
                        isActive ? 'text-white' : 'text-white/60'
                      }`}>
                        {item.title}
                      </h3>
                    </div>

                    {/* Right: Year */}
                    <span className={`font-mono text-xs transition-colors ${
                      isActive ? 'text-[#C3EA39] font-bold' : 'text-white/40'
                    }`}>
                      {item.year}
                    </span>
                  </motion.div>
                );
              })}

              {/* Placeholder slots if less than 4 projects */}
              {!isScrollable && Array.from({ length: placeholderCount }).map((_, pIdx) => {
                const slotNum = projects.length + pIdx + 1;
                const numStr = slotNum < 10 ? `0${slotNum}` : `${slotNum}`;

                return (
                  <div
                    key={`placeholder-slot-${slotNum}`}
                    className="rounded-2xl transition-all duration-300 relative overflow-hidden flex-1 flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border border-dashed border-white/10 bg-[#121216]/30 select-none cursor-default"
                  >
                    {/* Left: Slot Number & Text [Đang thực hiện...] */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-white/25">
                        {numStr}
                      </span>
                      <span className="font-mono text-xs sm:text-sm tracking-wide font-medium text-white/30">
                        Đang thực hiện...
                      </span>
                    </div>

                    {/* Right: Subtle Monochrome SOON badge */}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md border border-white/10 text-white/25 lowercase bg-white/[0.02]">
                      soon
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right: Clean Visual Showcase Canvas (7 Cols) - LOCKED 16:10 ASPECT RATIO */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center h-full"
            >
              <div
                onClick={() => setActiveProjectModal(currentProject)}
                className="group cursor-pointer relative aspect-[16/10] w-full rounded-3xl overflow-hidden bg-black border-2 border-white/10 hover:border-[#C3EA39] transition-all duration-500 shadow-2xl flex flex-col justify-end p-6 sm:p-8"
              >
                {/* Dynamic Project Image */}
                {currentProject.coverImage && (
                  <img
                    key={currentProject.coverImage}
                    src={currentProject.coverImage}
                    alt={currentProject.title}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-700 ease-out animate-fadeIn"
                  />
                )}

                {/* Gradient Vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                {/* Bottom Clean Project Info */}
                <div className="relative z-10 space-y-1.5">
                  <h3 className="text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight group-hover:text-[#C3EA39] transition-colors">
                    {currentProject.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 font-light max-w-lg line-clamp-1">
                    {currentProject.subtitle}
                  </p>
                </div>

              </div>
            </motion.div>

          </div>
        )}

      </div>

      {/* Case Study Modal */}
      <ProjectModal
        project={activeProjectModal}
        isOpen={Boolean(activeProjectModal)}
        onClose={() => setActiveProjectModal(null)}
        onSelectNextProject={handleNextProject}
      />
    </section>
  );
}
