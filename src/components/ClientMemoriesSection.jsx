import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { HeartHandshake } from 'lucide-react';

/**
 * Các brand đã làm việc cùng.
 *
 * Danh sách tên brand cỡ lớn; rê chuột tới dòng nào thì ảnh bìa của brand đó
 * hiện ra và bay theo con trỏ.
 *
 * VÌ SAO KIỂU NÀY:
 *  - Chữ lớn tự lấp đầy không gian. Bản trước rải 4 brand trong khung 500px và
 *    chỉ lấp được ~3% diện tích — nhìn như đồ đạc thưa thớt trong phòng rộng.
 *  - Dùng đúng thứ đang có: ảnh bìa. Không brand nào có logo nên mọi thiết kế
 *    dựa vào logo đều hụt.
 *  - Khác hẳn mục Dự Án: bên đó là danh sách nhỏ + khung ảnh cố định; bên này
 *    là chữ lớn + ảnh chạy theo tay.
 */
export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  const clientList = clients || [];

  const [modalConfig, setModalConfig] = useState({ isOpen: false, client: null, initialIndex: 0 });
  const [dongDangRe, setDongDangRe] = useState(-1);

  const khungRef = useRef(null);
  const anhBayRef = useRef(null);

  const handleOpenLightbox = (client, index = 0) => {
    setModalConfig({ isOpen: true, client, initialIndex: index });
  };
  const handleCloseLightbox = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Chỉ bật ảnh bay trên máy có chuột thật. Điện thoại không rê được nên mỗi
  // dòng hiện sẵn một ảnh nhỏ bên cạnh thay thế.
  const [coReChuot, setCoReChuot] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const capNhat = () => setCoReChuot(mq.matches);
    capNhat();
    mq.addEventListener('change', capNhat);
    return () => mq.removeEventListener('change', capNhat);
  }, []);

  // Ghi thẳng vị trí vào style. pointermove bắn liên tục — để React dựng lại
  // cả danh sách mỗi lần là giật ngay.
  const anhChayTheoChuot = useCallback((e) => {
    const anh = anhBayRef.current;
    const khung = khungRef.current;
    if (!anh || !khung) return;
    const r = khung.getBoundingClientRect();
    anh.style.transform = `translate3d(${e.clientX - r.left}px, ${e.clientY - r.top}px, 0)`;
  }, []);

  return (
    <section
      id="clients"
      className="pt-12 sm:pt-20 pb-14 sm:pb-24 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.07) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10 space-y-8 sm:space-y-10">

        {/* ĐẦU MỤC */}
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
            <span>Đã đồng hành cùng [{clientList.length}] thương hiệu</span>
          </div>
        </motion.div>

        {clientList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">Chưa có bạn đồng hành nào</h3>
            <p className="text-xs text-white/50 max-w-sm">
              Vào trang quản trị CMS để thêm thương hiệu, ảnh sản phẩm đã bàn giao và câu chuyện đi kèm.
            </p>
          </motion.div>
        ) : (
          <div
            ref={khungRef}
            onPointerMove={coReChuot ? anhChayTheoChuot : undefined}
            onPointerLeave={() => setDongDangRe(-1)}
            className="relative"
          >
            {/* Ảnh bay theo con trỏ. Một phần tử duy nhất dùng chung cho mọi
                dòng — chỉ đổi src, không dựng thêm thẻ nào.
                Có transition 160ms cho ảnh bám hơi trễ một nhịp: đây là chi tiết
                trang trí nên độ trễ đó làm nó mượt mà, khác hẳn thanh trượt kéo
                tay vốn phải bám tức thì. */}
            {coReChuot && (
              <div
                ref={anhBayRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 z-20 will-change-transform"
                style={{ transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <div
                  className="w-[260px] lg:w-[330px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black transition-all duration-300"
                  style={{
                    opacity: dongDangRe >= 0 ? 1 : 0,
                    // Căn giữa và phóng to GỘP CHUNG một chuỗi transform.
                    // Tách ra dùng class -translate-x-1/2 thì transform inline ở
                    // đây đè mất nó, ảnh sẽ lấy góc trên-trái bám con trỏ thay
                    // vì lấy tâm — lệch đúng nửa khung ảnh.
                    transform: `translate(-50%, -50%) scale(${dongDangRe >= 0 ? 1 : 0.85})`,
                  }}
                >
                  {dongDangRe >= 0 && clientList[dongDangRe]?.coverImage && (
                    <img
                      src={clientList[dongDangRe].coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            )}

            {/* DANH SÁCH TÊN BRAND CỠ LỚN */}
            <div className="border-t border-white/10">
              {clientList.map((client, idx) => {
                const ten = client.clientName || 'Brand';
                const dangRe = dongDangRe === idx;
                return (
                  <motion.button
                    key={client.id || idx}
                    type="button"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    onPointerEnter={() => setDongDangRe(idx)}
                    onFocus={() => setDongDangRe(idx)}
                    onBlur={() => setDongDangRe(-1)}
                    onClick={() => handleOpenLightbox(client, 0)}
                    aria-label={`Xem những gì đã làm cho ${ten}`}
                    className="group/h w-full text-left border-b border-white/10 py-5 sm:py-7 flex items-center gap-4 sm:gap-6 cursor-pointer focus-visible:outline-none focus-visible:bg-white/[0.03] transition-colors"
                  >
                    <span className={`font-mono text-[11px] sm:text-xs shrink-0 w-6 transition-colors ${dangRe ? 'text-[#C3EA39]' : 'text-white/25'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* Điện thoại không rê chuột được nên hiện luôn ảnh nhỏ */}
                    {!coReChuot && client.coverImage && (
                      <span className="shrink-0 w-14 h-11 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img src={client.coverImage} alt="" className="w-full h-full object-cover" draggable={false} />
                      </span>
                    )}

                    <span
                      /* Nhỏ hơn tiêu đề mục một bậc rõ ràng. Trước đây cả hai
                         cùng text-5xl (48px) ở desktop nên tên brand đá ngang
                         hàng với "Bạn đồng hành", mất thứ bậc đọc. */
                      className={`flex-1 font-display font-extrabold uppercase tracking-tight leading-[1.05] text-lg sm:text-2xl lg:text-4xl transition-all duration-500 ease-out ${
                        dangRe ? 'text-[#C3EA39] sm:translate-x-3' : 'text-white/85'
                      }`}
                    >
                      {ten}
                    </span>

                    <span className={`hidden sm:block shrink-0 font-mono text-[11px] lg:text-xs text-right max-w-[190px] transition-colors ${dangRe ? 'text-white/80' : 'text-white/35'}`}>
                      {client.service || 'Xem chi tiết'}
                      {client.year ? <><br />{client.year}</> : null}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <ClientMemoryModal
        client={modalConfig.client}
        isOpen={modalConfig.isOpen}
        initialIndex={modalConfig.initialIndex}
        onClose={handleCloseLightbox}
      />

    </section>
  );
}
