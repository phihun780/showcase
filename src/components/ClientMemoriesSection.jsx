import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import SmartImage from './SmartImage';
import { clientPath, slugFromLocation, findClientBySlug } from '../utils/clientUrl';
import { HeartHandshake } from 'lucide-react';

/**
 * MỤC "BẠN ĐỒNG HÀNH" — lưới thẻ.
 *
 * Trước đây các brand được rải tự do trong một khung, mờ trắng đen rồi thay
 * phiên nhau sáng lên và đổi chỗ. Nhìn thì vui, nhưng đọc tên brand thì khó và
 * không có chỗ nào đặt thông tin công ty.
 *
 * Giờ mỗi brand một thẻ: khung ảnh bên trong chứa logo, dưới là tên và một dòng
 * thông tin. Toàn bộ phần tính toán rải chỗ (gieo vị trí, dò va chạm, đo khung,
 * dịch chuyển chỗ trống) đã bỏ — lưới lo hết.
 *
 * Giữ lại đúng một nét cũ: đèn rọi tự đổi, cứ 2,8 giây làm nổi một brand ngẫu
 * nhiên. Rê chuột vào cái nào thì cái đó được ưu tiên.
 */

export default function ClientMemoriesSection() {
  const { clients, profile } = usePortfolioData();
  // useMemo để mảng giữ nguyên danh tính giữa các lần vẽ. Mục này tự vẽ lại
  // mỗi 3.5 giây; `clients || []` tạo mảng mới mỗi lần, effect đồng bộ URL bên
  // dưới sẽ coi đó là phụ thuộc đã đổi và chạy lại — mà nó có gọi setState, nên
  // thành vòng lặp vô tận.
  const clientList = useMemo(() => clients || [], [clients]);

  // Cinema Lightbox Modal config
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    client: null,
    initialIndex: 0,
  });

  // Bọc useCallback để hai hàm này giữ NGUYÊN danh tính qua mỗi lần vẽ lại.
  //
  // Mục này tự vẽ lại mỗi 3.5 giây (nhịp đổi độ sâu bên dưới). Nếu onClose là
  // hàm mới mỗi lần thì useEffect trong modal thấy phụ thuộc đổi, chạy lại, và
  // kéo bài viết về đầu trang — cứ 3.5 giây một lần trong lúc đang đọc.
  const handleOpenLightbox = useCallback((client, index = 0) => {
    setModalConfig({
      isOpen: true,
      client,
      initialIndex: index,
    });
    // Đẩy URL riêng lên thanh địa chỉ -> copy link gửi được, và nút Back đóng modal.
    window.history.pushState({ brand: client.id }, '', clientPath(client));
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
    // Lùi lại đúng một bước thay vì đẩy thêm "/" mới, để bấm Back nhiều lần
    // không phải đi ngược qua một chuỗi dài các lần mở modal.
    if (window.history.state?.brand) window.history.back();
    else window.history.replaceState({}, '', '/');
  }, []);

  // Đồng bộ hai chiều giữa URL và modal.
  useEffect(() => {
    if (clientList.length === 0) return;

    const dongBo = () => {
      const slug = slugFromLocation();
      const brand = findClientBySlug(clientList, slug);
      if (brand) {
        // Chỉ đổi khi thật sự khác, không thì mỗi lần chạy lại là một object mới
        // -> vẽ lại -> chạy lại.
        setModalConfig(prev =>
          prev.isOpen && prev.client?.id === brand.id
            ? prev
            : { isOpen: true, client: brand, initialIndex: 0 }
        );
      } else {
        setModalConfig(prev => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        // Link tới brand đã bị xoá/đổi tên: đưa về trang chủ thay vì để lại một
        // đường dẫn rác trên thanh địa chỉ.
        if (slug) window.history.replaceState({}, '', '/');
      }
    };

    dongBo();                                     // lúc tải trang: /brand/<slug> -> mở luôn
    window.addEventListener('popstate', dongBo);  // Back/Forward -> đóng/mở theo
    return () => window.removeEventListener('popstate', dongBo);
  }, [clientList]);

  const giamChuyenDong = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Brand đang được rê chuột / đang giữ bàn phím (null = không có cái nào).
  const [reVao, setReVao] = useState(null);
  // Bản sao trong ref để hẹn giờ của đèn rọi đọc được giá trị MỚI NHẤT mà không
  // phải gắn lại hẹn giờ mỗi lần chuột đi qua một brand.
  const reVaoRef = useRef(null);
  const datReVao = useCallback((v) => {
    reVaoRef.current = v;
    setReVao(v);
  }, []);

  const vaoBrand = useCallback((idx) => datReVao(idx), [datReVao]);
  const roiBrand = useCallback((idx) => {
    datReVao(reVaoRef.current === idx ? null : reVaoRef.current);
  }, [datReVao]);

  // ĐÈN RỌI TỰ ĐỔI: cứ một nhịp thì làm nổi một brand ngẫu nhiên.
  const [noiBat, setNoiBat] = useState(0);
  const noiBatRef = useRef(0);
  useEffect(() => {
    const tong = clientList.length;
    if (tong <= 1) return;
    if (giamChuyenDong()) return;

    const t = setInterval(() => {
      // Đang rê chuột vào một brand thì đứng yên chờ: chuột được ưu tiên,
      // không giành đèn với người xem.
      if (reVaoRef.current !== null) return;

      // Bốc trong (tong - 1) cái RỒI nhảy qua chính nó, để luôn đổi sang brand
      // khác. Bốc thẳng trong `tong` thì có lúc trúng lại chính nó, người xem
      // thấy cả khung đứng im một nhịp tưởng bị treo.
      const hienTai = noiBatRef.current;
      let k = Math.floor(Math.random() * (tong - 1));
      if (k >= hienTai) k += 1;
      noiBatRef.current = k;
      setNoiBat(k);
    }, 2800);
    return () => clearInterval(t);
  }, [clientList.length]);

  // Cái nào đang nổi: rê chuột vào cái nào thì cái đó, không thì theo đèn rọi.
  const iRo = reVao !== null
    ? reVao
    : (noiBat < clientList.length ? noiBat : 0);

  return (
    <section 
      id="clients" 
      className="pt-12 sm:pt-20 pb-8 sm:pb-10 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y"
    >
      {/* Vệt sáng nền cho mục có không khí.
          
          Hai chỗ trước đây gây ra vết cắt thẳng, sửa cả hai:

          1. `top-1/4 -translate-y-1/2` đẩy nó nhô lên 69px phía TRÊN mép mục,
             mà mục thì `overflow-hidden` — cắt phăng một đường ngang. Giờ
             `top-0` không kèm dịch lên, nằm trọn trong mục.

          2. `radial-gradient(circle, ... 70%)` trên khung 850x500: hình tròn lấy
             bán kính theo GÓC XA NHẤT (~493px), 70% của nó là 345px, trong khi
             từ tâm lên mép trên chỉ có 250px — tới mép màu vẫn chưa tắt hẳn nên
             thành viền cứng. Đổi sang `ellipse 45% 45%`: bán kính tính theo
             chính khung nên màu tắt hẳn trước khi chạm mép, bốn phía đều mượt.

          `max-w-full` / `max-h-full` kẹp nó không bao giờ to hơn chính mục. Màn
          hẹp thì mục thấp hơn, để cứng 500px là lại thò ra ngoài rồi bị cắt. */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] max-w-full h-[500px] max-h-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 45% 45% at 50% 50%, rgba(195, 234, 57, 0.08) 0%, rgba(195, 234, 57, 0) 100%)' }}
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
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">
              {profile?.emptyClients || 'Chưa có bạn đồng hành nào'}
            </h3>
          </motion.div>
        ) : (
          /* LƯỚI THẺ.
             Mỗi brand một thẻ: khung ảnh bên trong chứa logo, dưới là tên và
             một dòng thông tin. Thay cho cách rải tự do trước đây — cách đó
             nhìn thì vui nhưng đọc tên brand thì khó, và không có chỗ cho
             thông tin công ty. */
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
          >
            {clientList.map((client, idx) => {
              const ten = client.clientName || 'Brand';
              const logo = client.logo || client.coverImage;
              // Dòng thông tin: ưu tiên ghi chú, không có thì ghép năm và dịch vụ.
              const thongTin =
                (client.note || '').trim() ||
                [client.year, client.service].filter(Boolean).join(' · ');
              const roi = idx === iRo;         // đang tới lượt được làm nổi

              return (
                <motion.button
                  key={client.id || idx}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: Math.min(idx, 7) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => handleOpenLightbox(client, 0)}
                  onPointerEnter={() => vaoBrand(idx)}
                  onPointerLeave={() => roiBrand(idx)}
                  onFocus={() => vaoBrand(idx)}
                  onBlur={() => roiBrand(idx)}
                  aria-label={`Xem ${ten}`}
                  className={`group text-left rounded-2xl sm:rounded-3xl border p-2 sm:p-2.5 transition-all duration-300 cursor-pointer ${
                    roi
                      ? 'border-[#C3EA39]/60 bg-[#15151a] -translate-y-1 shadow-xl shadow-[#C3EA39]/5'
                      : 'border-white/10 bg-[#121216] hover:border-[#C3EA39]/40 hover:-translate-y-1'
                  }`}
                >
                  {/* Khung ảnh: logo nằm giữa, không cắt xén. */}
                  <div className="relative aspect-[4/3] w-full rounded-xl sm:rounded-2xl bg-black/50 border border-white/5 overflow-hidden flex items-center justify-center p-4 sm:p-6">
                    {logo ? (
                      <SmartImage
                        src={logo}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                        alt={ten}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`max-w-full max-h-full object-contain select-none transition-all duration-500 ${
                          roi
                            ? 'grayscale-0 opacity-100 scale-[1.04]'
                            : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.04]'
                        }`}
                      />
                    ) : (
                      <span className="text-xs font-mono text-white/25">{ten}</span>
                    )}
                  </div>

                  {/* Tên + một dòng thông tin công ty. */}
                  <div className="px-1.5 pt-2.5 pb-1 space-y-0.5">
                    {/* `line-clamp-2` chứ không `truncate`: màn hẹp thẻ chỉ rộng
                        162px, cắt một dòng là mất nửa tên brand — mà tên mới là
                        thứ chính. Cho xuống hai dòng rồi mới thôi. */}
                    <h3 className={`text-sm sm:text-base font-display font-bold line-clamp-2 leading-snug transition-colors ${
                      roi ? 'text-[#C3EA39]' : 'text-white group-hover:text-[#C3EA39]'
                    }`}>
                      {ten}
                    </h3>
                    {thongTin && (
                      <p className="text-[11px] sm:text-xs font-mono text-white/40 line-clamp-1">
                        {thongTin}
                      </p>
                    )}
                  </div>
                </motion.button>
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
