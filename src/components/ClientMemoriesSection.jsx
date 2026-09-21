import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import SmartImage from './SmartImage';
import { clientPath, slugFromLocation, findClientBySlug } from '../utils/clientUrl';
import { HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react';

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

  // ---- BĂNG LƯỚT NGANG ---------------------------------------------------
  //
  // Năm thẻ trong tầm nhìn: thẻ giữa to nhất, hai thẻ mỗi bên nhỏ dần. Kéo có
  // quán tính rồi tự dừng đúng vào một thẻ.
  //
  // KHÔNG dùng `scroll-snap` của CSS: nó giật thẻ vào vị trí ngay khi tay vừa
  // rời, nên cú búng không đi tiếp được. Tự làm thì mới có đà.

  const bangRef = useRef(null);
  const theRefs = useRef([]);
  const [iGiua, datIGiua] = useState(0);

  const giamChuyenDong = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tâm mỗi thẻ, đo sẵn một lần. Trong lúc cuộn các thẻ không xê dịch so với
  // băng nên không cần đọc lại DOM.
  const tamThe = useRef([]);
  const doTamThe = useCallback(() => {
    tamThe.current = theRefs.current.map(el => (el ? el.offsetLeft + el.offsetWidth / 2 : null));
  }, []);

  // Vẽ lại cỡ và độ mờ từng thẻ theo khoảng cách tới giữa khung.
  //
  // Ghi THẲNG vào style, không qua setState: kéo tay là hàng chục lần mỗi giây,
  // mỗi lần một lượt render React thì giật.
  const veCoThe = useCallback(() => {
    const bang = bangRef.current;
    if (!bang) return 0;
    if (tamThe.current.length !== theRefs.current.length) doTamThe();

    const giua = bang.scrollLeft + bang.clientWidth / 2;
    const buoc = (theRefs.current[0]?.offsetWidth || 1) + 16;

    let tot = 0, ganNhat = Infinity;
    theRefs.current.forEach((el, i) => {
      const tam = tamThe.current[i];
      if (!el || tam == null) return;

      const d = Math.abs(tam - giua);
      if (d < ganNhat) { ganNhat = d; tot = i; }

      // Cách giữa mấy "thẻ", chặn ở 2 — xa hơn thì giữ nguyên cỡ nhỏ nhất chứ
      // không teo mãi.
      const xa = Math.min(2, d / buoc);
      el.style.transform = `scale(${(1 - 0.13 * xa).toFixed(3)})`;
      el.style.opacity = (1 - 0.3 * xa).toFixed(3);
      el.style.zIndex = String(100 - Math.round(xa * 10));
    });
    return tot;
  }, [doTamThe]);

  // Tính NGAY trong lúc cuộn, KHÔNG bọc trong requestAnimationFrame: trình
  // duyệt hãm rAF khi tab không được nhìn, hãm thì chấm chỉ vị trí đứng im ở số
  // 1 dù đã lướt tới đâu.
  const khiCuon = useCallback(() => {
    const tot = veCoThe();
    datIGiua(truoc => (truoc === tot ? truoc : tot));
  }, [veCoThe]);

  useEffect(() => {
    const t = setTimeout(() => { doTamThe(); khiCuon(); }, 80);
    const bang = bangRef.current;
    if (!bang) return () => clearTimeout(t);
    const ob = new ResizeObserver(() => { doTamThe(); khiCuon(); });
    ob.observe(bang);
    return () => { clearTimeout(t); ob.disconnect(); };
  }, [doTamThe, khiCuon, clientList.length]);

  const viTriCua = useCallback((i) => {
    const bang = bangRef.current;
    const el = theRefs.current[i];
    if (!bang || !el) return 0;
    const toiDa = bang.scrollWidth - bang.clientWidth;
    return Math.max(0, Math.min(toiDa, el.offsetLeft + el.offsetWidth / 2 - bang.clientWidth / 2));
  }, []);

  // Trượt êm về một vị trí. Tự chạy chứ không dùng `behavior: 'smooth'`, để nối
  // tiếp được sau cú búng và dừng ngay khi người ta chạm lại.
  const dangTruot = useRef(0);
  const truotToi = useCallback((dich, nhanh = 0.16) => {
    const bang = bangRef.current;
    if (!bang) return;
    if (dangTruot.current) cancelAnimationFrame(dangTruot.current);
    if (giamChuyenDong()) { bang.scrollLeft = dich; khiCuon(); return; }

    const buoc = () => {
      const con = dich - bang.scrollLeft;
      if (Math.abs(con) < 0.5) {
        bang.scrollLeft = dich;
        dangTruot.current = 0;
        khiCuon();
        return;
      }
      bang.scrollLeft += con * nhanh;
      khiCuon();
      dangTruot.current = requestAnimationFrame(buoc);
    };
    dangTruot.current = requestAnimationFrame(buoc);
  }, [khiCuon]);

  const veThe = useCallback((viTri) => {
    let tot = 0, ganNhat = Infinity;
    for (let i = 0; i < theRefs.current.length; i++) {
      const d = Math.abs(viTriCua(i) - viTri);
      if (d < ganNhat) { ganNhat = d; tot = i; }
    }
    return tot;
  }, [viTriCua]);

  const toiThe = useCallback((i) => {
    if (i < 0 || i >= clientList.length) return;
    truotToi(viTriCua(i));
  }, [clientList.length, truotToi, viTriCua]);

  // ---- Kéo tay, có quán tính ----------------------------------------------
  const keo = useRef(null);
  const batKeo = useCallback((e) => {
    if (e.pointerType === 'touch') return;      // cảm ứng: để trình duyệt tự lo
    if (e.button != null && e.button !== 0) return;
    const bang = bangRef.current;
    if (!bang) return;

    if (dangTruot.current) { cancelAnimationFrame(dangTruot.current); dangTruot.current = 0; }
    keo.current = { x0: e.clientX, xTruoc: e.clientX, batDau: bang.scrollLeft, daKeo: false, v: 0, luc: e.timeStamp };

    const di = (ev) => {
      const k = keo.current;
      if (!k) return;
      const dx = ev.clientX - k.x0;
      if (!k.daKeo && Math.abs(dx) < 5) return;
      k.daKeo = true;
      bang.scrollLeft = k.batDau - dx;

      // Vận tốc theo thời gian thật, không theo số lần gọi — máy yếu hay máy
      // khoẻ thì cú búng cũng đi xa như nhau.
      const dt = Math.max(1, ev.timeStamp - k.luc);
      k.v = ((ev.clientX - k.xTruoc) / dt) * 16;
      k.xTruoc = ev.clientX;
      k.luc = ev.timeStamp;
      khiCuon();
    };

    const tha = () => {
      window.removeEventListener('pointermove', di);
      window.removeEventListener('pointerup', tha);
      window.removeEventListener('pointercancel', tha);

      const k = keo.current;
      if (k?.daKeo) {
        // Búng thì đi thêm một đoạn theo đà rồi mới chọn thẻ gần nhất mà dừng.
        // `v` là px mỗi khung hình; nhân 9 là quãng ước chừng của đà còn lại.
        truotToi(viTriCua(veThe(bang.scrollLeft - k.v * 9)));
      }
      setTimeout(() => { keo.current = null; }, 0);
    };

    window.addEventListener('pointermove', di);
    window.addEventListener('pointerup', tha);
    window.addEventListener('pointercancel', tha);
  }, [khiCuon, truotToi, viTriCua, veThe]);

  // Vuốt trên cảm ứng: trình duyệt tự cuộn, mình chờ nó dừng rồi kéo thẻ gần
  // nhất vào giữa.
  const henDung = useRef(0);
  const cuonRoiDung = useCallback(() => {
    khiCuon();
    if (keo.current?.daKeo || dangTruot.current) return;
    clearTimeout(henDung.current);
    henDung.current = setTimeout(() => {
      const bang = bangRef.current;
      if (!bang) return;
      truotToi(viTriCua(veThe(bang.scrollLeft)));
    }, 140);
  }, [khiCuon, truotToi, viTriCua, veThe]);

  // Bấm một thẻ: chưa ở giữa thì đưa vào giữa đã; đang ở giữa mới mở bài viết.
  // Vừa kéo xong thì bỏ qua, không thì thả tay là bài viết bật ra.
  const bamThe = useCallback((client, idx) => {
    if (keo.current?.daKeo) return;
    if (idx !== iGiua) { toiThe(idx); return; }
    handleOpenLightbox(client, 0);
  }, [iGiua, toiThe, handleOpenLightbox]);

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
          /* BĂNG THẺ LƯỚT NGANG.
             Năm thẻ trong tầm nhìn: cái giữa to nhất, hai cái mỗi bên nhỏ dần.
             Cỡ và độ mờ do JS ghi thẳng vào style theo khoảng cách tới giữa
             khung, nên mượt theo từng pixel kéo chứ không nhảy nấc. */
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              ref={bangRef}
              onScroll={cuonRoiDung}
              onPointerDown={batKeo}
              className="flex gap-4 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
              style={{
                // Bề ngang một thẻ, tính sao cho thấy đủ NĂM thẻ: cái giữa và
                // hai cái mỗi bên.
                '--the': 'clamp(170px, 40vw, 216px)',
                // Đệm hai đầu bằng nửa khung trừ nửa thẻ: nhờ vậy thẻ ĐẦU và
                // thẻ CUỐI cũng đứng được đúng giữa, không kẹt ở mép.
                paddingLeft: 'max(0px, calc(50% - var(--the) / 2))',
                paddingRight: 'max(0px, calc(50% - var(--the) / 2))',
                scrollbarWidth: 'none',
              }}
            >
              {clientList.map((client, idx) => {
                const ten = client.clientName || 'Brand';
                const logo = client.logo || client.coverImage;
                const thongTin =
                  (client.note || '').trim() ||
                  [client.year, client.service].filter(Boolean).join(' · ');
                const giua = idx === iGiua;

                return (
                  <button
                    key={client.id || idx}
                    ref={el => { theRefs.current[idx] = el; }}
                    type="button"
                    onClick={() => bamThe(client, idx)}
                    aria-label={`Xem ${ten}`}
                    style={{ transformOrigin: 'center center' }}
                    className={`shrink-0 w-[var(--the)] text-left rounded-2xl border p-2 cursor-pointer transition-colors duration-300 ${
                      giua ? 'border-white/15 bg-[#18181b]' : 'border-white/8 bg-[#121216]'
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full rounded-xl bg-black/50 border border-white/5 overflow-hidden flex items-center justify-center p-4 sm:p-6">
                      {logo ? (
                        <SmartImage
                          src={logo}
                          sizes="216px"
                          alt={ten}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className={`max-w-full max-h-full object-contain select-none transition-all duration-500 ${
                            giua ? 'grayscale-0' : 'grayscale'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-mono text-white/25">{ten}</span>
                      )}
                    </div>

                    <div className="px-1 pt-2.5 pb-0.5 space-y-0.5">
                      <h3 className={`text-sm font-display font-bold line-clamp-2 leading-snug transition-colors ${
                        giua ? 'text-white' : 'text-white/70'
                      }`}>
                        {ten}
                      </h3>
                      {thongTin && (
                        <p className="text-[11px] font-mono text-white/40 line-clamp-1">
                          {thongTin}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Chấm chỉ vị trí + hai nút lướt. Bấm chấm nào thì nhảy tới thẻ đó. */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => toiThe(iGiua - 1)}
                disabled={iGiua <= 0}
                aria-label="Thẻ trước"
                className="p-2 rounded-full border border-white/10 text-white/60 hover:text-black hover:bg-[#C3EA39] hover:border-[#C3EA39] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {clientList.map((c, i) => (
                  <button
                    key={c.id || i}
                    type="button"
                    onClick={() => toiThe(i)}
                    aria-label={`Tới thẻ ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === iGiua ? 'w-5 bg-[#C3EA39]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => toiThe(iGiua + 1)}
                disabled={iGiua >= clientList.length - 1}
                aria-label="Thẻ sau"
                className="p-2 rounded-full border border-white/10 text-white/60 hover:text-black hover:bg-[#C3EA39] hover:border-[#C3EA39] disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
