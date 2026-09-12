import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { HeartHandshake } from 'lucide-react';

export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  const clientList = clients || [];

  // Cinema Lightbox Modal config
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    client: null,
    initialIndex: 0,
  });

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
          /* TƯỜNG LOGO
           *
           * Cố tình KHÔNG dùng lại kiểu "chọn 1 từ danh sách -> hiện khung lớn"
           * của mục Dự Án. Hai mục mang hai thông điệp khác nhau:
           *   Dự Án = chiều sâu, ít mà kỹ  -> xem từng cái một là đúng
           *   Brand = chiều rộng           -> giá trị nằm ở SỐ LƯỢNG thấy cùng lúc
           * Cho xem một brand tại một thời điểm là giấu mất chính thứ đáng khoe.
           *
           * Các ô dính liền nhau bằng đường kẻ tóc (viền chồng lên nhau nhờ
           * -space-*-px) để đọc ra như MỘT tấm bảng liền, không phải một mớ thẻ
           * rời — đó là điểm tách hẳn khỏi ngôn ngữ thẻ bo góc của mục Dự Án.
           */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 rounded-2xl overflow-hidden border border-white/10 bg-[#0E0E12]"
          >
            {clientList.map((client, idx) => {
              const ten = client.clientName || 'Brand';
              return (
                <button
                  key={client.id || idx}
                  type="button"
                  onClick={() => handleOpenLightbox(client, 0)}
                  aria-label={`Xem những gì đã làm cho ${ten}`}
                  className="group/o relative aspect-[4/3] flex items-center justify-center p-5 sm:p-7 border-r border-b border-white/[0.07] cursor-pointer transition-colors duration-300 hover:bg-[#16161C] focus-visible:outline-none focus-visible:bg-[#16161C] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C3EA39]"
                >
                  {/* Số thứ tự mờ ở góc — gợi cảm giác một bộ sưu tập có đánh số */}
                  <span className="absolute top-2.5 left-3 font-mono text-[10px] text-white/20 group-hover/o:text-[#C3EA39]/70 transition-colors">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {client.logo ? (
                    <img
                      src={client.logo}
                      alt={ten}
                      loading="lazy"
                      decoding="async"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      /* Xám và mờ khi nghỉ, bật sáng đủ màu khi rê vào: cả tường
                         trông tĩnh và gọn, brand nào được chú ý thì nổi lên. */
                      className="max-h-14 sm:max-h-16 w-auto max-w-[75%] object-contain grayscale opacity-45 group-hover/o:grayscale-0 group-hover/o:opacity-100 group-hover/o:scale-105 transition-all duration-400 ease-out select-none"
                    />
                  ) : (
                    /* Chưa có logo thì dựng ô chữ cho tử tế, không để trống */
                    <span className="font-display font-bold text-center text-sm sm:text-base leading-tight text-white/45 group-hover/o:text-white group-hover/o:scale-105 transition-all duration-400 px-1">
                      {ten}
                    </span>
                  )}

                  {/* Dịch vụ trượt lên từ đáy ô khi rê vào */}
                  <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-6 text-[10px] sm:text-[11px] font-mono text-center text-[#C3EA39] bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/85 to-transparent translate-y-full group-hover/o:translate-y-0 opacity-0 group-hover/o:opacity-100 transition-all duration-300 ease-out pointer-events-none truncate">
                    {client.service || 'Xem chi tiết'}{client.year ? ` · ${client.year}` : ''}
                  </span>
                </button>
              );
            })}

            {/* Ô trống lấp cho hàng cuối luôn đầy, để tấm bảng không bị khuyết góc */}
            {Array.from({ length: (4 - (clientList.length % 4)) % 4 }).map((_, i) => (
              <div
                key={`o-trong-${i}`}
                aria-hidden="true"
                className="hidden lg:block aspect-[4/3] border-r border-b border-white/[0.07] bg-[repeating-linear-gradient(45deg,transparent,transparent_9px,rgba(255,255,255,0.02)_9px,rgba(255,255,255,0.02)_18px)]"
              />
            ))}
          </motion.div>
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
