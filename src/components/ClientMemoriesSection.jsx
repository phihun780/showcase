import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { Sparkles, Maximize2, Building2, Calendar, Tag, HeartHandshake, ExternalLink, Layers, ChevronRight } from 'lucide-react';

export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    client: null,
    initialIndex: 0,
  });

  const clientList = clients || [];

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
      className="pt-10 sm:pt-16 pb-12 sm:pb-20 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Background Subtle Ambient Glow */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] pointer-events-none rounded-full" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.06) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10 space-y-8 sm:space-y-12">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2 border-b border-white/10"
        >
          <div>
            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
                {profile?.sectionClientsNumber || '03'}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {profile?.sectionClientsTitle || 'Khách hàng & Kỷ niệm'}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-2xl pt-2">
              {profile?.sectionClientsSubtitle || 'Những thương hiệu, đối tác và khách hàng dễ thương mình đã từng có cơ hội đồng hành sáng tạo các sản phẩm ấn tượng...'}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-white/50 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-pulse" />
            <span>Đồng hành cùng [{clientList.length}] đối tác</span>
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
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">Chưa có khách hàng nào</h3>
            <p className="text-xs text-white/50 max-w-sm">
              Bạn có thể vào trang quản trị CMS để thêm tên khách hàng, ảnh sản phẩm đã bàn giao và những ghi chú kỷ niệm đáng nhớ.
            </p>
          </motion.div>
        ) : (
          /* Expansive Showcase Cards Stack (Mỗi khách hàng là một bảng trưng bày lớn sắc nét) */
          <div className="space-y-8 sm:space-y-12">
            {clientList.map((client, idx) => {
              const allImages = [
                client.coverImage,
                ...(Array.isArray(client.gallery) ? client.gallery : [])
              ].filter(Boolean);

              // Unique images list
              const uniqueImages = Array.from(new Set(allImages));
              const isFeatured = Boolean(client.featured);

              return (
                <motion.div
                  key={client.id || idx}
                  initial={{ opacity: 0, y: 35 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.65, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded-3xl bg-[#121216]/90 border border-white/10 hover:border-[#C3EA39]/50 transition-all duration-500 shadow-2xl p-5 sm:p-7 md:p-8 space-y-6 relative overflow-hidden group ${
                    isFeatured ? 'ring-1 ring-[#C3EA39]/30 bg-[#141419]' : ''
                  }`}
                >
                  {/* Subtle Background Glow if featured */}
                  {isFeatured && (
                    <div 
                      className="absolute -right-20 -top-20 w-80 h-80 pointer-events-none rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.08) 0%, transparent 70%)' }}
                    />
                  )}

                  {/* TOP HEADER: Brand Info + Tags + Link */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
                    
                    {/* Left: Brand Avatar + Name + Tags */}
                    <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
                      {client.logo ? (
                        <img
                          src={client.logo}
                          alt={client.clientName}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover bg-white/5 border border-white/15 p-1 shrink-0 shadow-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#C3EA39]/15 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono font-bold text-xl shrink-0 shadow-lg">
                          ✦
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight group-hover:text-[#C3EA39] transition-colors">
                            {client.clientName}
                          </h3>

                          {isFeatured && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#C3EA39] text-black text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-3 h-3" />
                              <span>Nổi bật</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
                          <span className="text-[#C3EA39] font-semibold flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {client.service || 'Graphic Design'}
                          </span>

                          {client.year && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-white/60 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                <Calendar className="w-3 h-3" />
                                {client.year}
                              </span>
                            </>
                          )}

                          <span className="text-white/20">•</span>
                          <span className="text-white/40 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>{uniqueImages.length} ấn phẩm bàn giao</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                      {client.link && (
                        <a
                          href={client.link.startsWith('http') ? client.link : `https://${client.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                          title="Ghé thăm trang của khách"
                        >
                          <span>Ghé thăm trang</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C3EA39]" />
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenLightbox(client, 0)}
                        className="px-4 py-2 rounded-xl bg-[#C3EA39]/15 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-xs font-mono font-bold flex items-center gap-1.5 border border-[#C3EA39]/30 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Xem Trọn Bộ ({uniqueImages.length})</span>
                      </button>
                    </div>

                  </div>

                  {/* SOUVENIR STORY / NOTE */}
                  {client.note && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-white/80 text-xs sm:text-sm leading-relaxed font-light whitespace-pre-line">
                      <span className="text-[#C3EA39] font-mono text-xs font-bold mr-2">✦ Kỷ niệm:</span>
                      {client.note}
                    </div>
                  )}

                  {/* DELIVERABLES SHOWCASE GALLERY (Khổ lớn, rõ nét từng sản phẩm) */}
                  <div className="w-full">
                    {uniqueImages.length === 0 ? (
                      <div className="aspect-[21/9] rounded-2xl bg-black border border-white/10 flex items-center justify-center text-white/30 font-mono text-xs">
                        Chưa có hình ảnh sản phẩm bàn giao
                      </div>
                    ) : uniqueImages.length === 1 ? (
                      /* 1 Single Deliverable -> Full Width Massive Stage */
                      <div 
                        onClick={() => handleOpenLightbox(client, 0)}
                        className="group/img relative rounded-2xl overflow-hidden bg-black border border-white/15 hover:border-[#C3EA39] transition-all duration-300 aspect-[16/9] sm:aspect-[21/9] max-h-[500px] cursor-pointer shadow-xl"
                      >
                        <img
                          src={uniqueImages[0]}
                          alt={client.clientName}
                          loading="lazy"
                          decoding="async"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6">
                          <span className="text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5">
                            <Maximize2 className="w-4 h-4 text-[#C3EA39]" />
                            <span>Bấm để phóng to chi tiết</span>
                          </span>
                        </div>
                      </div>
                    ) : uniqueImages.length === 2 ? (
                      /* 2 Deliverables -> Split 2 Equal Large Columns */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        {uniqueImages.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => handleOpenLightbox(client, i)}
                            className="group/img relative rounded-2xl overflow-hidden bg-black border border-white/15 hover:border-[#C3EA39] transition-all duration-300 aspect-[16/10] cursor-pointer shadow-xl"
                          >
                            <img
                              src={img}
                              alt={`${client.clientName} - ${i + 1}`}
                              loading="lazy"
                              decoding="async"
                              onContextMenu={(e) => e.preventDefault()}
                              onDragStart={(e) => e.preventDefault()}
                              className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-700 ease-out"
                            />
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white/70 group-hover/img:text-black group-hover/img:bg-[#C3EA39] group-hover/img:border-[#C3EA39] flex items-center justify-center transition-all duration-300 opacity-0 group-hover/img:opacity-100 group-hover/img:scale-105">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono text-white/80 border border-white/15">
                              Ấn phẩm #{i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* 3 or 4+ Deliverables -> Hero Deliverable (Left) + Multi-Thumbnail Grid (Right) */
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
                        
                        {/* Main Featured Deliverable */}
                        <div
                          onClick={() => handleOpenLightbox(client, 0)}
                          className="lg:col-span-7 group/img relative rounded-2xl overflow-hidden bg-black border border-white/15 hover:border-[#C3EA39] transition-all duration-300 aspect-[16/10] sm:aspect-[16/11] lg:aspect-auto min-h-[260px] sm:min-h-[360px] cursor-pointer shadow-xl"
                        >
                          <img
                            src={uniqueImages[0]}
                            alt={`${client.clientName} - Hero`}
                            loading="lazy"
                            decoding="async"
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-700 ease-out"
                          />
                          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white/70 group-hover/img:text-black group-hover/img:bg-[#C3EA39] group-hover/img:border-[#C3EA39] flex items-center justify-center transition-all duration-300 opacity-0 group-hover/img:opacity-100 group-hover/img:scale-105">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md text-xs font-mono text-[#C3EA39] border border-white/15 flex items-center gap-1.5 shadow-md">
                            <span>✦ Sản phẩm chính</span>
                          </div>
                        </div>

                        {/* Companion Deliverables Grid (2 to 3 secondary items) */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4 auto-rows-fr">
                          {uniqueImages.slice(1, 4).map((img, i) => {
                            const actualIdx = i + 1;
                            const isLastVisible = i === 2 && uniqueImages.length > 4;
                            const extraCount = uniqueImages.length - 4;

                            return (
                              <div
                                key={actualIdx}
                                onClick={() => handleOpenLightbox(client, actualIdx)}
                                className={`group/sub relative rounded-2xl overflow-hidden bg-black border border-white/15 hover:border-[#C3EA39] transition-all duration-300 aspect-[4/3] sm:aspect-[16/11] cursor-pointer shadow-md ${
                                  uniqueImages.length === 3 && i === 1 ? 'col-span-2 aspect-[16/9]' : ''
                                }`}
                              >
                                <img
                                  src={img}
                                  alt={`${client.clientName} - ${actualIdx + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                  onContextMenu={(e) => e.preventDefault()}
                                  onDragStart={(e) => e.preventDefault()}
                                  className="w-full h-full object-cover group-hover/sub:scale-[1.04] transition-transform duration-500 ease-out"
                                />

                                {isLastVisible ? (
                                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-2 group-hover/sub:bg-black/60 transition-colors">
                                    <span className="text-xl sm:text-2xl font-mono font-black text-[#C3EA39]">
                                      +{extraCount + 1}
                                    </span>
                                    <span className="text-[11px] font-mono text-white/90 font-medium">
                                      Xem tất cả ảnh
                                    </span>
                                  </div>
                                ) : (
                                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white/70 group-hover/sub:text-black group-hover/sub:bg-[#C3EA39] group-hover/sub:border-[#C3EA39] flex items-center justify-center transition-all opacity-0 group-hover/sub:opacity-100">
                                    <Maximize2 className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </div>

                </motion.div>
              );
            })}
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
