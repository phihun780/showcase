import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { Sparkles, Maximize2, Building2, Calendar, Tag, HeartHandshake } from 'lucide-react';

export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  const [selectedClient, setSelectedClient] = useState(null);

  const clientList = clients || [];

  return (
    <section 
      id="clients" 
      className="pt-10 sm:pt-16 pb-10 sm:pb-16 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Background Subtle Ambient Glow (GPU Radial Gradient) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] pointer-events-none rounded-full" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.07) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {/* Section Header with Reveal Motion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-3"
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
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-xl pt-2">
              {profile?.sectionClientsSubtitle || 'Những thương hiệu, đối tác và khách hàng dễ thương mình đã từng có cơ hội đồng hành sáng tạo...'}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-pulse" />
            <span>Đã đồng hành cùng [{clientList.length}] khách hàng</span>
          </div>
        </motion.div>

        {/* Bento Grid or Empty State */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 auto-rows-fr">
            {clientList.map((item, idx) => {
              const isFeatured = Boolean(item.featured);

              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setSelectedClient(item)}
                  className={`group relative rounded-3xl overflow-hidden bg-[#121216] border border-white/10 hover:border-[#C3EA39] transition-all duration-500 shadow-xl cursor-pointer select-none flex flex-col justify-end p-5 sm:p-6 min-h-[280px] sm:min-h-[340px] ${
                    isFeatured ? 'md:col-span-2 lg:col-span-2 min-h-[320px] sm:min-h-[380px]' : ''
                  }`}
                >
                  {/* Cover Image Background */}
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.clientName}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1b1b22] to-[#0a0a0d] flex items-center justify-center text-white/20">
                      <Building2 className="w-16 h-16" />
                    </div>
                  )}

                  {/* Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

                  {/* Top-Right Maximize / Inspect Icon on hover */}
                  <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white/70 group-hover:text-black group-hover:bg-[#C3EA39] group-hover:border-[#C3EA39] flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-105">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Featured Ribbon / Badge if featured */}
                  {isFeatured && (
                    <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full bg-[#C3EA39] text-black font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3 h-3" />
                      <span>Nổi bật</span>
                    </div>
                  )}

                  {/* Bottom Content Info */}
                  <div className="relative z-20 space-y-2">
                    
                    {/* Logo & Category Bar */}
                    <div className="flex items-center gap-2.5">
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.clientName}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover bg-white/10 p-0.5 border border-white/20 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-[#C3EA39] font-mono text-xs font-bold shrink-0">
                          ✦
                        </div>
                      )}

                      <span className="text-[11px] sm:text-xs font-mono font-semibold text-[#C3EA39] truncate">
                        {item.service || 'Graphic Design'}
                      </span>

                      {item.year && (
                        <span className="font-mono text-[11px] text-white/50 ml-auto shrink-0 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                          {item.year}
                        </span>
                      )}
                    </div>

                    {/* Client Name */}
                    <h3 className="text-lg sm:text-xl md:text-2xl font-display font-extrabold text-white tracking-tight group-hover:text-[#C3EA39] transition-colors line-clamp-1">
                      {item.clientName}
                    </h3>

                    {/* Short preview note if available */}
                    {item.note && (
                      <p className="text-xs text-white/70 font-light line-clamp-2 leading-relaxed">
                        {item.note}
                      </p>
                    )}

                  </div>

                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Lightbox / Detail Modal */}
      <ClientMemoryModal
        client={selectedClient}
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
      />

    </section>
  );
}
