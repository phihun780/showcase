import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { 
  Sparkles, 
  Maximize2, 
  Building2, 
  Calendar, 
  Tag, 
  HeartHandshake, 
  ExternalLink, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Quote
} from 'lucide-react';

export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  const clientList = clients || [];

  // Active Partner in Spotlight
  const [activePartnerIndex, setActivePartnerIndex] = useState(0);

  // Active Image within the Spotlight Stage
  const [activeStageImageIndex, setActiveStageImageIndex] = useState(0);

  // Cinema Lightbox Modal config
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    client: null,
    initialIndex: 0,
  });

  // Reset stage image index when active partner changes
  useEffect(() => {
    setActiveStageImageIndex(0);
  }, [activePartnerIndex]);

  // If partner index out of bounds (e.g., after deletion), reset to 0
  useEffect(() => {
    if (activePartnerIndex >= clientList.length) {
      setActivePartnerIndex(Math.max(0, clientList.length - 1));
    }
  }, [clientList.length, activePartnerIndex]);

  const activePartner = clientList[activePartnerIndex] || clientList[0];

  const currentDeliverables = activePartner ? Array.from(new Set([
    activePartner.coverImage,
    ...(Array.isArray(activePartner.gallery) ? activePartner.gallery : [])
  ].filter(Boolean))) : [];

  const currentStageImage = currentDeliverables[activeStageImageIndex] || activePartner?.coverImage || '';

  const handleNextPartner = () => {
    if (clientList.length === 0) return;
    setActivePartnerIndex((prev) => (prev + 1) % clientList.length);
  };

  const handlePrevPartner = () => {
    if (clientList.length === 0) return;
    setActivePartnerIndex((prev) => (prev - 1 + clientList.length) % clientList.length);
  };

  const handleOpenLightbox = (client, index = 0) => {
    setModalConfig({
      isOpen: true,
      client,
      initialIndex: index,
    });
  };

  const handleCloseLightbox = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <section 
      id="clients" 
      className="pt-12 sm:pt-20 pb-14 sm:pb-24 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Subtle Exhibition Atmosphere Glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] pointer-events-none rounded-full" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.07) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10 space-y-8 sm:space-y-10">
        
        {/* SECTION HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10"
        >
          <div>
            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
                {profile?.sectionClientsNumber || '03'}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {profile?.sectionClientsTitle || 'Bạn đồng hành'}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-2xl pt-2">
              {profile?.sectionClientsSubtitle || 'Những người bạn, đối tác dễ thương cùng mình tạo nên những sản phẩm đầy cảm hứng và đáng nhớ...'}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-white/50 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-pulse" />
            <span>Triển lãm cùng [{clientList.length}] bạn đồng hành</span>
          </div>
        </motion.div>

        {/* Empty State */}
        {clientList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center font-mono font-bold text-lg">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">Chưa có bạn đồng hành nào</h3>
            <p className="text-xs text-white/50 max-w-sm">
              Bạn có thể vào trang quản trị CMS để thêm tên thương hiệu, ảnh sản phẩm đã bàn giao và những câu chuyện kỷ niệm đáng nhớ.
            </p>
          </motion.div>
        ) : (
          /* IDEA 2: INTERACTIVE ART EXHIBITION & SPOTLIGHT REEL STAGE */
          <div className="space-y-6 sm:space-y-8">
            
            {/* 1. BRAND SELECTOR MARQUEE / EXHIBITION NAV STRIP */}
            <div className="relative p-2 rounded-2xl bg-[#121216] border border-white/10 shadow-lg flex items-center justify-between gap-2">
              
              {/* Left Arrow */}
              <button
                onClick={handlePrevPartner}
                className="hidden sm:flex p-2.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] text-white hover:text-black transition-all cursor-pointer shrink-0 border border-white/10 active:scale-95 shadow-md"
                title="Bạn đồng hành trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Horizontal Scrollable Brand Pills */}
              <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
                {clientList.map((client, idx) => {
                  const isActive = idx === activePartnerIndex;
                  return (
                    <button
                      key={client.id || idx}
                      onClick={() => setActivePartnerIndex(idx)}
                      className={`group relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0 select-none active:scale-95 ${
                        isActive
                          ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/20'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                      }`}
                    >
                      {/* Brand Logo Avatar in Pill */}
                      {client.logo ? (
                        <img
                          src={client.logo}
                          alt={client.clientName}
                          className={`w-5 h-5 rounded-md object-cover ${isActive ? 'bg-black/10' : 'bg-white/10'}`}
                        />
                      ) : (
                        <span className={`text-[11px] font-mono font-extrabold ${isActive ? 'text-black' : 'text-[#C3EA39]'}`}>
                          0{idx + 1}
                        </span>
                      )}

                      <span>{client.clientName}</span>

                      {client.featured && (
                        <Sparkles className={`w-3 h-3 ${isActive ? 'text-black' : 'text-[#C3EA39]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNextPartner}
                className="hidden sm:flex p-2.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] text-white hover:text-black transition-all cursor-pointer shrink-0 border border-white/10 active:scale-95 shadow-md"
                title="Bạn đồng hành tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>

            {/* 2. THE SPOTLIGHT VISUAL STAGE (Sân Khấu Nghệ Thuật) */}
            <AnimatePresence mode="wait">
              {activePartner && (
                <motion.div
                  key={activePartner.id || activePartnerIndex}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl bg-[#121216]/95 border border-white/15 p-5 sm:p-8 md:p-10 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden"
                >
                  {/* Decorative Subtle Corner Glow */}
                  <div 
                    className="absolute -top-24 -right-24 w-96 h-96 pointer-events-none rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.08) 0%, transparent 70%)' }}
                  />

                  {/* SPOTLIGHT HEADER: Brand Profile + Tags + Direct External Link */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-white/10 relative z-10">
                    
                    {/* Brand Info */}
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                      {activePartner.logo ? (
                        <img
                          src={activePartner.logo}
                          alt={activePartner.clientName}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-white/5 border border-white/20 p-1.5 shrink-0 shadow-xl"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#C3EA39]/15 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono font-extrabold text-2xl shrink-0 shadow-xl">
                          ✦
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center flex-wrap gap-2.5">
                          <h3 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-white tracking-tight">
                            {activePartner.clientName}
                          </h3>

                          {activePartner.featured && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#C3EA39] text-black text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-3 h-3" />
                              <span>Nổi bật</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs font-mono">
                          <span className="text-[#C3EA39] font-semibold flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {activePartner.service || 'Graphic Design & Branding'}
                          </span>

                          {activePartner.year && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-white/70 flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                                <Calendar className="w-3 h-3" />
                                {activePartner.year}
                              </span>
                            </>
                          )}

                          <span className="text-white/20">•</span>
                          <span className="text-white/40 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{currentDeliverables.length} ấn phẩm bàn giao</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
                      {activePartner.link && (
                        <a
                          href={activePartner.link.startsWith('http') ? activePartner.link : `https://${activePartner.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Ghé thăm website / fanpage của bạn"
                        >
                          <span>Ghé thăm bạn</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C3EA39]" />
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenLightbox(activePartner, activeStageImageIndex)}
                        className="px-4 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#C3EA39]/15 active:scale-95"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Xem Toàn Cảnh ({currentDeliverables.length})</span>
                      </button>
                    </div>

                  </div>

                  {/* SOUVENIR STORY / ARTIST NOTE */}
                  {activePartner.note && (
                    <div className="relative p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white/85 text-xs sm:text-sm leading-relaxed font-light whitespace-pre-line flex items-start gap-3">
                      <Quote className="w-5 h-5 text-[#C3EA39] shrink-0 opacity-80 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-[#C3EA39] font-mono text-xs font-bold block mb-1">Kỷ niệm cùng bạn:</span>
                        {activePartner.note}
                      </div>
                    </div>
                  )}

                  {/* MAIN HERO ARTWORK EXHIBITION STAGE */}
                  <div className="space-y-4">
                    
                    {/* Big Showcase Canvas */}
                    <div 
                      onClick={() => handleOpenLightbox(activePartner, activeStageImageIndex)}
                      className="group/canvas relative w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9] max-h-[580px] rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-white/15 hover:border-[#C3EA39] transition-all duration-500 cursor-pointer shadow-2xl"
                    >
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentStageImage}
                          src={currentStageImage}
                          alt={activePartner.clientName}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          loading="eager"
                          decoding="async"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          className="w-full h-full object-cover group-hover/canvas:scale-[1.02] transition-transform duration-700 ease-out"
                        />
                      </AnimatePresence>

                      {/* Top Overlay Indicator */}
                      <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-xs font-mono text-white/90 flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-[#C3EA39]" />
                        <span>Ấn phẩm #{activeStageImageIndex + 1} / {currentDeliverables.length}</span>
                      </div>

                      {/* Top Right Inspect Button */}
                      <div className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white/80 group-hover/canvas:text-black group-hover/canvas:bg-[#C3EA39] group-hover/canvas:border-[#C3EA39] flex items-center justify-center transition-all duration-300 opacity-0 group-hover/canvas:opacity-100 group-hover/canvas:scale-105 shadow-xl">
                        <Maximize2 className="w-4 h-4" />
                      </div>

                      {/* Bottom Caption Gradient Strip */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 sm:p-6 flex items-end justify-between pointer-events-none">
                        <span className="font-mono text-xs sm:text-sm text-white/80 font-medium">
                          ✦ Nhấp vào ảnh để phóng to xem chi tiết chất liệu & thiết kế
                        </span>
                      </div>
                    </div>

                    {/* INTERACTIVE DELIVERABLES FILMSTRIP REEL (Dải cuộn các ấn phẩm) */}
                    {currentDeliverables.length > 1 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-white/50 px-1">
                          <span>Bộ sưu tập các ấn phẩm ({currentDeliverables.length})</span>
                          <span>Bấm để đổi góc nhìn</span>
                        </div>

                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                          {currentDeliverables.map((img, i) => {
                            const isCurrent = i === activeStageImageIndex;

                            return (
                              <button
                                key={i}
                                onClick={() => setActiveStageImageIndex(i)}
                                className={`group/thumb relative rounded-xl overflow-hidden aspect-[16/10] w-28 sm:w-36 shrink-0 border-2 transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'border-[#C3EA39] scale-105 shadow-lg shadow-[#C3EA39]/30 ring-2 ring-[#C3EA39]/20'
                                    : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                                }`}
                              >
                                <img
                                  src={img}
                                  alt={`Thumbnail ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white/80">
                                  #{i + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>

      {/* Cinema Lightbox Modal */}
      <ClientMemoryModal
        client={modalConfig.client}
        isOpen={modalConfig.isOpen}
        initialIndex={modalConfig.initialIndex}
        onClose={handleCloseLightbox}
      />

    </section>
  );
}
