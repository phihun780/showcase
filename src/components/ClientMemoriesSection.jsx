import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { HeartHandshake } from 'lucide-react';


// Vị trí và độ sâu của từng brand trong không gian.
//
// Ngẫu nhiên nhưng TẤT ĐỊNH: sinh từ chỉ số chứ không phải Math.random().
// Dùng Math.random() thì mỗi lần React dựng lại là cả đám nhảy chỗ.
function ngauNhien(hat) {
  const x = Math.sin(hat * 12.9898) * 43758.5453;
  return x - Math.floor(x);           // 0..1, luôn ra cùng kết quả với cùng hạt
}

// Chia khung thành các ô rồi thả mỗi brand vào một ô kèm xê dịch nhẹ.
// Rải tự do hoàn toàn thì với nhiều brand sẽ có cái chồng lên nhau; cách này
// trông vẫn ngẫu nhiên mà chắc chắn không đè nhau.
function viTriBrand(idx, tong, nhip = 0) {
  const cot = tong <= 3 ? tong : tong <= 8 ? 3 : 4;
  const hang = Math.ceil(tong / cot);
  const c = idx % cot;
  const h = Math.floor(idx / cot);

  // Trả về vị trí dạng TỈ LỆ 0..1, còn việc chừa lề để cho CSS calc() lo.
  //
  // Chừa lề bằng % thì màn rộng cũng chừa đúng ngần ấy % — đo ở 1280px thấy
  // các brand dồn hết vào dải 34%-66%, hai bên trống hoác. Chừa bằng px thì
  // lề luôn vừa đúng nửa bề ngang một brand, bất kể khung to hay nhỏ.
  const rongO = 1 / cot;
  const caoO = 1 / hang;

  // Xê dịch trong lòng ô, chừa mép để không dính viền
  const lechX = (ngauNhien(idx * 3 + 1) - 0.5) * rongO * 0.42;
  const lechY = (ngauNhien(idx * 7 + 2) - 0.5) * caoO * 0.42;

  // Độ sâu 0 = xa nhất, 1 = gần nhất.
  // Có `nhip` trong hạt nên cứ mỗi nhịp là mọi brand nhận một độ sâu mới —
  // cái đang rõ lùi ra xa mờ đi, cái đang mờ tiến lại gần. Vẫn tất định: cùng
  // idx và cùng nhịp thì luôn ra đúng một kết quả.
  const sau = 0.25 + ngauNhien(idx * 11 + 5 + nhip * 97) * 0.75;

  return {
    // 0..1 — ghép vào calc() ở JSX
    fx: Math.min(1, Math.max(0, rongO * (c + 0.5) + lechX)),
    fy: Math.min(1, Math.max(0, caoO * (h + 0.5) + lechY)),
    sau,
    tiLe: 0.58 + sau * 0.42,          // xa thì nhỏ, gần thì to
    mo: 0.32 + sau * 0.68,            // xa thì mờ
    nhoe: (1 - sau) * 1.6,            // xa thì nhoè nhẹ
  };
}

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

  // Chỉ bật nghiêng 3D trên máy có chuột thật.
  // Điện thoại không rê được nên hiệu ứng vô nghĩa, mà lại tốn GPU — cùng lý do
  // PhotoshopSimulator đã tắt nghiêng 3D ở mobile từ trước.
  const [co3D, setCo3D] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const capNhat = () => setCo3D(mq.matches);
    capNhat();
    mq.addEventListener('change', capNhat);
    return () => mq.removeEventListener('change', capNhat);
  }, []);

  // Cứ vài giây lại xáo lại độ sâu của tất cả brand: cái đang rõ lùi xa mờ đi,
  // cái đang mờ tiến lại gần. Cả khung như đang thở.
  //
  // Đổi theo NHỊP chứ không đổi từng khung hình: blur là thuộc tính vẽ lại, cho
  // nó chạy liên tục 60 lần/giây thì máy yếu sẽ đuối. Đổi 3.5 giây một lần rồi
  // để CSS transition lo phần chuyển tiếp thì gần như không tốn gì.
  const [nhip, setNhip] = useState(0);
  useEffect(() => {
    if (!co3D) return;                       // điện thoại giữ nguyên một tầng
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setNhip(n => n + 1), 3500);
    return () => clearInterval(t);
  }, [co3D]);

  // Rê chuột trong khung thì cả cảnh dịch theo, mỗi brand dịch một mức khác
  // nhau tuỳ độ sâu — cái ở gần chạy nhanh, cái ở xa chạy chậm. Đó là thứ tạo
  // cảm giác nhìn vào một không gian có chiều sâu thật.
  //
  // Chỉ ghi hai biến CSS, còn việc ghép transform để cho CSS lo. Nhờ vậy phần
  // phóng to/thu nhỏ theo độ sâu không bị JS ghi đè mất.
  const raiTheoChuot = useCallback((e) => {
    if (!co3D) return;
    const khung = e.currentTarget;
    const r = khung.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;   // -1..1
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    for (const el of khung.querySelectorAll('[data-sau]')) {
      const sau = parseFloat(el.dataset.sau) || 0;
      const bien = 26 * sau;
      el.style.setProperty('--dx', `${-x * bien}px`);
      el.style.setProperty('--dy', `${-y * bien * 0.6}px`);
    }
  }, [co3D]);

  const thoiRai = useCallback((e) => {
    for (const el of e.currentTarget.querySelectorAll('[data-sau]')) {
      el.style.setProperty('--dx', '0px');
      el.style.setProperty('--dy', '0px');
    }
  }, []);

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
          /* Dựng giống hệt đầu mục 01 và 02: số + tiêu đề, rồi mô tả phụ nếu có.
             Bỏ bố cục hai cột cũ — nó vốn để đẩy dòng đếm brand sang phải, mà
             dòng đó đã gỡ. */
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
              {profile?.sectionClientsNumber || '03'}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {profile?.sectionClientsTitle || 'Bạn đồng hành'}
            </h2>
          </div>

          {/* Mô tả phụ — để trống trong CMS thì ẩn luôn */}
          {(profile?.sectionClientsSubtitle || '').trim() && (
            <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed max-w-2xl pt-2">
              {profile.sectionClientsSubtitle}
            </p>
          )}
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
          /* KHÔNG GIAN 3D RẢI THEO ĐỘ SÂU
           *
           * Cố tình KHÔNG dùng lưới đều: lưới đều thì mọi brand cùng kích thước,
           * cùng khoảng cách — đọc ra là một bảng dữ liệu, không phải một không
           * gian. Ở đây mỗi brand nằm ở một độ sâu khác nhau, nên có cái nổi rõ
           * phía trước, có cái lùi xa mờ đi.
           *
           * Ba thứ cùng đổi theo độ sâu mới ra cảm giác thật:
           *   gần -> to hơn, rõ hơn, nét hơn
           *   xa  -> nhỏ hơn, mờ hơn, nhoè nhẹ
           * Chỉ đổi mỗi kích thước thì trông như phóng to thu nhỏ vô nghĩa.
           */
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onPointerMove={raiTheoChuot}
            onPointerLeave={thoiRai}
            style={{ perspective: co3D ? '1200px' : undefined }}
            className="relative w-full h-[380px] sm:h-[440px] lg:h-[500px] rounded-3xl border border-white/10 bg-[#0B0B0E] overflow-hidden"
          >
            {/* Vệt sáng nền để cảnh có không khí, không phẳng lì */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(195,234,57,0.07) 0%, transparent 62%)' }}
            />

            {clientList.map((client, idx) => {
              const ten = client.clientName || 'Brand';
              const v = viTriBrand(idx, clientList.length, nhip);
              return (
                <div
                  key={client.id || idx}
                  data-sau={v.sau}
                  className="absolute"
                  style={{
                    // Lề 82px ngang / 58px dọc = quá nửa bề ngang & chiều cao
                    // tối đa của một brand, nên không bao giờ lòi ra khỏi khung.
                    left: `calc(82px + (100% - 164px) * ${v.fx})`,
                    top: `calc(58px + (100% - 116px) * ${v.fy})`,
                    // Lớp này CHỈ lo vị trí + parallax. Transition ngắn để ảnh
                    // bám sát con trỏ.
                    transform: `translate(-50%, -50%) translate3d(var(--dx, 0px), var(--dy, 0px), 0)`,
                    transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: Math.round(v.sau * 100),
                  }}
                >
                  {/* Lớp ĐỘ SÂU riêng, transition dài 1.4s cho việc đổi tầng diễn
                      ra từ tốn. Không gộp vào lớp parallax ở trên được: gộp thì
                      một là parallax chậm ì theo 1.4s, hai là đổi tầng giật cục
                      trong 0.45s — hai việc cần hai tốc độ khác nhau. */}
                  <div
                    style={{
                      transform: `scale(${v.tiLe})`,
                      transition: 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                  {/* Lớp trôi riêng: nó cũng ghi vào transform nên phải tách khỏi
                      hai lớp trên, không thì đè mất nhau. */}
                  <div
                    className={co3D ? 'o-troi' : undefined}
                    style={co3D ? { animationDelay: `${(idx % 5) * 0.8}s`, animationDuration: `${7 + (idx % 3)}s` } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenLightbox(client, 0)}
                      aria-label={`Xem những gì đã làm cho ${ten}`}
                      style={{
                        opacity: v.mo,
                        filter: v.nhoe > 0.15 ? `blur(${v.nhoe}px)` : 'blur(0px)',
                        transition: 'opacity 1.4s cubic-bezier(0.16,1,0.3,1), filter 1.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s ease-out',
                      }}
                      className="group/o relative flex flex-col items-center gap-2 px-4 py-3 rounded-2xl cursor-pointer hover:!opacity-100 hover:!blur-none hover:scale-110 focus-visible:outline-none focus-visible:!opacity-100 focus-visible:!blur-none focus-visible:ring-2 focus-visible:ring-[#C3EA39]"
                    >
                      {client.logo ? (
                        <img
                          src={client.logo}
                          alt={ten}
                          loading="lazy"
                          decoding="async"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          className="max-h-16 sm:max-h-20 w-auto max-w-[30vw] sm:max-w-[150px] object-contain rounded-[8px] grayscale group-hover/o:grayscale-0 transition-[filter] duration-500 select-none"
                        />
                      ) : (
                        <span className="font-display font-extrabold text-center text-white text-sm sm:text-lg leading-tight max-w-[30vw] sm:max-w-[150px] select-none">
                          {ten}
                        </span>
                      )}

                      {/* Dịch vụ chỉ hiện khi để ý tới brand đó */}
                      <span className="font-mono text-[10px] text-[#C3EA39] opacity-0 group-hover/o:opacity-100 focus-visible:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        {client.service || 'Xem chi tiết'}{client.year ? ` · ${client.year}` : ''}
                      </span>
                    </button>
                  </div>
                  </div>
                </div>
              );
            })}
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
