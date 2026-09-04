import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, ArrowLeft, ArrowUp } from 'lucide-react';

export default function PostModal({ post, isOpen, onClose }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const containerRef = useRef(null);

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
      setScrollProgress(0);
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
    }
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isOpen || !post) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container with Reading Progress Bar */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onScroll={handleScroll}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E0E12] text-white rounded-3xl overflow-y-auto shadow-2xl border border-white/15 flex flex-col z-10 no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
      >
        {/* Ultra-thin 2px Neon Laser Progress Rim */}
        <div className="sticky top-0 left-0 right-0 h-[2px] bg-white/5 z-50 rounded-t-3xl overflow-hidden pointer-events-none">
          <div
            className="h-full bg-[#C3EA39] transition-all duration-150 ease-out shadow-[0_0_8px_#C3EA39]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Sticky Top-Right Floating Close Button */}
        <div className="sticky top-0 right-0 z-[100] flex justify-end p-3.5 sm:p-6 pointer-events-none -mb-14 sm:-mb-16">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="pointer-events-auto w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#181820]/95 hover:bg-[#C3EA39] text-white hover:text-black backdrop-blur-xl transition-all border border-white/25 hover:border-[#C3EA39] shadow-2xl cursor-pointer active:scale-90 hover:scale-105 touch-manipulation"
            aria-label="Đóng bài viết"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Article Body */}
        <article className="p-5 sm:p-10 md:p-14 max-w-3xl mx-auto w-full space-y-6 sm:space-y-8">
          
          {/* Article Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-white/50">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {post.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.readTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold text-white leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-[#C3EA39] font-mono leading-relaxed border-l-2 border-[#C3EA39] pl-4 py-1.5 bg-[#C3EA39]/5 rounded-r-lg">
              "{post.excerpt}"
            </p>
          </div>

          {/* Featured Image */}
          {post.coverImage && (
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-auto object-cover max-h-[420px]"
              />
            </div>
          )}

          {/* Formatted Content */}
          <div className="max-w-none text-base text-white/80 font-light leading-relaxed space-y-6">
            {post.content.split('\n\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl sm:text-2xl font-display font-bold text-white pt-4 text-[#C3EA39]">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }

              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="p-4 rounded-xl bg-white/5 border-l-4 border-[#C3EA39] text-base text-white font-mono">
                    {trimmed.replace('> ', '')}
                  </blockquote>
                );
              }

              if (trimmed.startsWith('- ')) {
                const items = trimmed.split('\n');
                return (
                  <ul key={idx} className="list-disc list-inside space-y-2 text-sm sm:text-base text-white/70">
                    {items.map((it, i) => (
                      <li key={i}>
                        {it.replace('- ', '')}
                      </li>
                    ))}
                  </ul>
                );
              }

              if (trimmed.startsWith('1. ')) {
                const items = trimmed.split('\n');
                return (
                  <ol key={idx} className="list-decimal list-inside space-y-2 text-sm sm:text-base text-white/70">
                    {items.map((it, i) => (
                      <li key={i}>
                        {it.replace(/^\d+\.\s*/, '')}
                      </li>
                    ))}
                  </ol>
                );
              }

              return (
                <p key={idx} className="text-sm sm:text-base leading-relaxed">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Tags & Footer */}
          <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 text-white/60"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <button
              onClick={onClose}
              className="text-xs font-mono text-[#C3EA39] hover:underline uppercase tracking-wider cursor-pointer"
            >
              ĐÓNG BÀI VIẾT
            </button>
          </div>

        </article>

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
