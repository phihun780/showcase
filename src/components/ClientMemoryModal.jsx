import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ChevronLeft, ChevronRight, Building2, Calendar, Tag, MessageSquareQuote, Layers } from 'lucide-react';

export default function ClientMemoryModal({ client, isOpen, initialIndex = 0, onClose }) {
  const [activeImageIndex, setActiveImageIndex] = useState(initialIndex);

  useEffect(() => {
    setActiveImageIndex(initialIndex);
  }, [initialIndex, client?.id]);

  // Lock body scroll and handle keyboard navigation
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft') {
          setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
        if (e.key === 'ArrowRight') {
          setActiveImageIndex((prev) => (prev + 1) % images.length);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !client) return null;

  const images = Array.from(new Set([
    client.coverImage,
    ...(Array.isArray(client.gallery) ? client.gallery : [])
  ].filter(Boolean)));

  const currentImage = images[activeImageIndex] || client.coverImage;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/92 backdrop-blur-lg overflow-y-auto animate-fadeIn select-none">
      
      {/* Click Backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-6xl max-h-[95vh] flex flex-col lg:flex-row bg-[#101014] border border-white/15 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp my-auto"
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-40 w-9 h-9 rounded-full bg-black/80 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 hover:border-[#C3EA39] flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Đóng (ESC)"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT: Cinema Image Stage (Large view + Next/Prev + Bottom thumbnails) */}
        <div className="lg:w-8/12 bg-black flex flex-col justify-between relative overflow-hidden min-h-[340px] sm:min-h-[480px] lg:min-h-[600px]">
          
          {/* Main Visual Photo Container */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-5">
            <img
              key={currentImage}
              src={currentImage}
              alt={client.clientName}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              loading="eager"
              decoding="async"
              className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-2xl animate-fadeIn"
            />

            {/* Prev / Next Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-xl z-20"
                  title="Ảnh trước (Mũi tên trái)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/75 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-xl z-20"
                  title="Ảnh tiếp theo (Mũi tên phải)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Photo Counter Badge */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-4 z-20 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white/90 font-mono text-xs border border-white/15 shadow-lg">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Bottom Thumbnails Dock */}
          {images.length > 1 && (
            <div className="p-3 bg-[#0a0a0d] border-t border-white/10 flex items-center justify-center gap-2.5 overflow-x-auto no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx ? 'border-[#C3EA39] scale-105 shadow-md shadow-[#C3EA39]/30 ring-2 ring-[#C3EA39]/20' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Client Info, Story, Deliverables info & Actions */}
        <div className="lg:w-4/12 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-6 bg-[#121216]">
          
          <div className="space-y-5">
            
            {/* Header: Logo + Client Name + Year */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-white/10 pr-6">
              {client.logo ? (
                <img 
                  src={client.logo} 
                  alt={client.clientName} 
                  className="w-12 h-12 rounded-2xl object-cover border border-white/15 bg-white/5 p-1 shrink-0 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono font-bold text-lg shrink-0 shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
              )}

              <div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight leading-tight">
                  {client.clientName}
                </h3>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-[#C3EA39] font-semibold">
                    <Tag className="w-3 h-3" />
                    {client.service || 'Graphic Design'}
                  </span>
                  {client.year && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="text-xs font-mono text-white/50 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {client.year}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Deliverables Count Note */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono text-white/70">
              <Layers className="w-4 h-4 text-[#C3EA39]" />
              <span>Tổng số: <strong className="text-white">{images.length} ấn phẩm</strong> trong bộ sưu tập</span>
            </div>

            {/* Souvenir Note */}
            {client.note && (
              <div className="space-y-2">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-[#C3EA39]" />
                  <span>Kỷ niệm & Chia sẻ</span>
                </span>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white/85 text-xs sm:text-sm leading-relaxed font-light whitespace-pre-line">
                  {client.note}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            {client.link ? (
              <a
                href={client.link.startsWith('http') ? client.link : `https://${client.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm tracking-wide flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-105 cursor-pointer"
              >
                <span>Ghé thăm trang của khách</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs font-mono text-white/40">✦ Kỷ niệm đồng hành</span>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-all cursor-pointer ml-auto"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
