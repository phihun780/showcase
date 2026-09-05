import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, ArrowUp, Layers } from 'lucide-react';

export default function ProjectModal({ project, isOpen, onClose, onSelectNextProject }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const containerRef = useRef(null);

  const gallery = project?.gallery || [];
  const galleryCount = gallery.length;

  // Reset scroll to top whenever the project changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollProgress(0);
    setActiveImageIndex(0);
    setShowBackToTop(false);
  }, [project?.id, project?.title]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleGlobalWheel = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        e.preventDefault();
        containerRef.current.scrollTop += e.deltaY;
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('wheel', handleGlobalWheel, { passive: false });
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      setScrollProgress(0);
      setActiveImageIndex(0);
      setShowBackToTop(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, [isOpen, onClose]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight > clientHeight) {
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
      setShowBackToTop(scrollTop > 220);

      // Determine active image index
      if (galleryCount > 0) {
        const itemIdx = Math.min(
          galleryCount - 1,
          Math.floor((scrollTop / (scrollHeight - clientHeight)) * galleryCount)
        );
        setActiveImageIndex(itemIdx);
      }
    }
  };

  const scrollToImage = (idx) => {
    const el = document.getElementById(`project-gallery-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextProjectClick = (e) => {
    e?.stopPropagation();
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollProgress(0);
    setActiveImageIndex(0);
    setShowBackToTop(false);
    onSelectNextProject?.();
  };

  if (!isOpen || !project) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn">
      
      {/* Clickable Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Modal Dialog Container (100% Clean Seamless Canvas) */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onScroll={handleScroll}
        className="relative w-full max-w-6xl max-h-[90vh] bg-[#0E0E12] text-white rounded-3xl overflow-y-auto shadow-2xl border border-white/15 flex flex-col z-10 no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {/* Ultra-thin 2px Neon Laser Progress Rim along top edge */}
        <div className="sticky top-0 left-0 right-0 h-[2px] bg-white/5 z-50 rounded-t-3xl overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[#C3EA39] transition-all duration-150 ease-out shadow-[0_0_8px_#C3EA39]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Sticky Top-Right Floating Close Button - Always visible, perfect on mobile */}
        <div className="sticky top-0 right-0 z-[100] flex justify-end p-3.5 sm:p-6 pointer-events-none -mb-14 sm:-mb-16">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="pointer-events-auto w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#181820]/95 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/25 hover:border-[#C3EA39] shadow-2xl cursor-pointer active:scale-90 hover:scale-105 touch-manipulation"
            aria-label="Đóng popup"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Content: Title + Subtitle -> Full Image Gallery */}
        <div className="p-5 sm:p-10 md:p-14 space-y-6 sm:space-y-10">
          
          {/* Title & Subtitle */}
          <div className="pr-14 sm:pr-16 space-y-1.5 sm:space-y-2">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold uppercase text-white tracking-tight leading-snug">
              {project.title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-white/70 font-light leading-relaxed max-w-3xl">
              {project.subtitle}
            </p>
          </div>

          {/* Visual Showcase: Gallery Images */}
          {galleryCount > 0 && (
            <div className="space-y-6 sm:space-y-8">
              {gallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  id={`project-gallery-${idx}`}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl relative group"
                >
                  <img
                    src={imgUrl}
                    alt={`${project.title} visual ${idx + 1}`}
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

          {/* Footer Actions */}
          <div className="pt-6 sm:pt-8 border-t border-white/10 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="text-xs font-mono text-white/50 hover:text-[#C3EA39] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>QUAY LẠI DANH SÁCH</span>
            </button>

            {onSelectNextProject && (
              <button
                onClick={handleNextProjectClick}
                className="px-5 py-2.5 rounded-full bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
              >
                <span>DỰ ÁN TIẾP THEO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Floating Quick Action: Back to Top */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={scrollToTop}
              className="sticky bottom-5 self-end mr-6 z-30 px-3.5 py-2 rounded-full bg-[#121216]/90 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 hover:border-[#C3EA39] backdrop-blur-xl shadow-2xl flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer hover:scale-105 -mt-12"
              title="Cuộn lên đầu trang"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lên đầu</span>
            </motion.button>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
