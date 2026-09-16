import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ClientMemoryModal from './ClientMemoryModal';
import { clientPath, slugFromLocation, findClientBySlug } from '../utils/clientUrl';
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
// Màn hẹp thì tối đa 2 cột. Ba cột trên khung 335px là mỗi ô rộng 111px, mà
// một brand đã chiếm tới 113px — chắc chắn đè nhau.
function soCotCua(tong, hep) {
  if (hep) return Math.max(1, Math.min(tong, 2));
  return tong <= 3 ? tong : tong <= 8 ? 3 : 4;
}

// Luôn dư vài ô trống so với số brand. Đủ ô cho mỗi brand một chỗ là hết chỗ
// mà nhảy — brand tan đi rồi hiện lại đúng chỗ cũ, coi như không có gì xảy ra.
const O_DU_TRU = 2;

function soHangCua(tong, cot) {
  return Math.max(1, Math.ceil((tong + O_DU_TRU) / Math.max(1, cot)));
}

// Vị trí của một Ô (không phải của một brand).
//
// Brand nào ngồi ô nào là việc của `oCuaBrand` bên dưới, và nó đổi theo thời
// gian. Tách ra như vậy thì lúc brand nhảy chỗ, nó nhận trọn bộ toạ độ + độ sâu
// của ô mới — hiện ra ở nơi khác, cỡ khác, chứ không phải chỉ trượt đi một tí.
function viTriO(o, cot, hang, hep) {
  const c = o % cot;
  const h = Math.floor(o / cot);

  const rongO = 1 / cot;
  const caoO = 1 / hang;

  // Xê dịch trong lòng ô cho đỡ đều tăm tắp.
  //
  // Màn hẹp thì xê ít thôi: ô đã sát nhau sẵn, xê mạnh là hai brand cạnh nhau
  // chạy về phía nhau rồi chồng lên.
  const bienDo = hep ? 0.16 : 0.42;
  const lechX = (ngauNhien(o * 3 + 1) - 0.5) * rongO * bienDo;
  const lechY = (ngauNhien(o * 7 + 2) - 0.5) * caoO * bienDo;

  // Độ sâu 0 = xa nhất, 1 = gần nhất. Gắn với Ô nên brand nhảy sang ô khác là
  // đổi luôn cỡ to nhỏ. Độ sâu chỉ lo cỡ và tốc độ trôi khi rê chuột; còn việc
  // "đang nhìn cái nào" do đèn rọi lo.
  const sau = 0.3 + ngauNhien(o * 11 + 5) * 0.7;

  return {
    fx: Math.min(1, Math.max(0, rongO * (c + 0.5) + lechX)),
    fy: Math.min(1, Math.max(0, caoO * (h + 0.5) + lechY)),
    sau,
    tiLe: 0.6 + sau * 0.3,
  };
}

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

  // Màn hẹp: quyết định số cột, biên độ xê dịch và chiều cao khung.
  const [hepMH, setHepMH] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const capNhat = () => setHepMH(mq.matches);
    capNhat();
    mq.addEventListener('change', capNhat);
    return () => mq.removeEventListener('change', capNhat);
  }, []);

  // ĐÈN RỌI: mọi brand đều mờ + trắng đen, mỗi lúc chỉ một cái được rõ nét và
  // hiện đúng màu logo. Cứ vài giây lại đổi sang một cái khác, chọn ngẫu nhiên.
  //
  // Đổi theo NHỊP chứ không đổi từng khung hình: blur là thuộc tính vẽ lại, cho
  // nó chạy liên tục 60 lần/giây thì máy yếu sẽ đuối. Đổi vài giây một lần rồi
  // để CSS transition lo phần chuyển tiếp thì gần như không tốn gì.
  const [noiBat, setNoiBat] = useState(0);
  const noiBatRef = useRef(0);
  const datNoiBat = useCallback((v) => { noiBatRef.current = v; setNoiBat(v); }, []);

  // Brand đang tan đi để nhảy sang ô khác (null = không có cái nào).
  const [dangAn, setDangAn] = useState(null);
  const dangAnRef = useRef(null);

  // Chuột có đang ở trong khung không. Còn ở trong thì ngưng nhảy chỗ: rê chuột
  // vào brand nào là brand đó sáng lên và hết mờ, nhấc nó đi ngay dưới con trỏ
  // thì vừa khó chịu vừa dễ bấm hụt.
  const chuotTrongKhung = useRef(false);
  const datDangAn = useCallback((v) => { dangAnRef.current = v; setDangAn(v); }, []);

  const soCot = soCotCua(clientList.length, hepMH);
  const soHang = soHangCua(clientList.length, soCot);
  const soO = soCot * soHang;

  // Brand thứ i đang ngồi ô nào. Ban đầu ngồi đúng thứ tự.
  const [oCuaBrand, setOCuaBrand] = useState([]);
  useEffect(() => {
    setOCuaBrand(Array.from({ length: clientList.length }, (_, i) => i % Math.max(1, soO)));
    datDangAn(null);
  }, [clientList.length, soO, datDangAn]);

  const giamChuyenDong = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const tong = clientList.length;
    if (tong <= 1) return;                   // một mình thì rọi mãi cái đó
    if (giamChuyenDong()) return;

    const t = setInterval(() => {
      // Bốc trong (tong - 1) cái RỒI nhảy qua chính nó. Cách này luôn đổi sang
      // brand khác; nếu bốc thẳng trong `tong` thì có lúc trúng lại chính nó,
      // người xem thấy cả khung đứng im một nhịp tưởng bị treo.
      const hienTai = noiBatRef.current;
      let k = Math.floor(Math.random() * (tong - 1));
      if (k >= hienTai) k += 1;
      // Đừng rọi vào cái đang tan đi: nó sắp biến mất, rọi vào chỉ thấy chớp một
      // cái rồi tắt.
      if (k === dangAnRef.current) return;
      datNoiBat(k);
    }, 2800);
    return () => clearInterval(t);
  }, [clientList.length, datNoiBat]);

  // NHẢY CHỖ: thỉnh thoảng nhặt một brand đang mờ, cho nó tan hẳn đi rồi hiện
  // lại ở một ô còn trống.
  //
  // Đổi `left/top` đúng lúc opacity đang bằng 0 nên mắt không thấy nó trượt —
  // chỉ thấy chỗ này mất đi, chỗ kia hiện ra. Không đặt transition cho left/top
  // cũng vì vậy.
  useEffect(() => {
    const tong = clientList.length;
    if (tong <= 1 || soO <= tong) return;    // không dư ô thì không có chỗ mà nhảy
    if (giamChuyenDong()) return;

    let hen = null;
    const t = setInterval(() => {
      if (dangAnRef.current !== null) return;      // đang có cái nhảy dở
      if (chuotTrongKhung.current) return;         // người ta đang rê chuột trong khung

      // Không đụng vào cái đang được rọi — người ta đang nhìn nó.
      const ungVien = [];
      for (let i = 0; i < tong; i++) if (i !== noiBatRef.current) ungVien.push(i);
      if (ungVien.length === 0) return;

      const idx = ungVien[Math.floor(Math.random() * ungVien.length)];
      datDangAn(idx);

      // Đợi đúng quãng mờ dần (0.9s ở CSS) rồi mới dời chỗ.
      hen = setTimeout(() => {
        setOCuaBrand(prev => {
          if (!prev.length) return prev;
          const dangDung = new Set(prev);
          const oTrong = [];
          for (let o = 0; o < soO; o++) if (!dangDung.has(o)) oTrong.push(o);
          if (oTrong.length === 0) return prev;

          const moi = [...prev];
          moi[idx] = oTrong[Math.floor(Math.random() * oTrong.length)];
          return moi;
        });
        datDangAn(null);
      }, 950);
    }, 2200);

    return () => {
      clearInterval(t);
      if (hen) clearTimeout(hen);
    };
  }, [clientList.length, soO, datDangAn, datNoiBat]);

  // Danh sách ngắn lại (xoá brand trong CMS) thì chỉ số cũ có thể trỏ ra ngoài.
  const iNoiBat = noiBat < clientList.length ? noiBat : 0;

  // Rê chuột trong khung thì cả cảnh dịch theo, mỗi brand dịch một mức khác
  // nhau tuỳ độ sâu — cái ở gần chạy nhanh, cái ở xa chạy chậm. Đó là thứ tạo
  // cảm giác nhìn vào một không gian có chiều sâu thật.
  //
  // Chỉ ghi hai biến CSS, còn việc ghép transform để cho CSS lo. Nhờ vậy phần
  // phóng to/thu nhỏ theo độ sâu không bị JS ghi đè mất.
  // Màn hẹp: cao theo số hàng. Màn rộng: giữ 500px trừ khi có quá nhiều hàng.
  const caoKhung = hepMH ? Math.max(380, soHang * 132) : Math.max(500, soHang * 150);

  // Nửa bề ngang / chiều cao tối đa của một brand — khoảng cách tối thiểu phải
  // chừa ra mép để nó không bị cắt.
  const leNgang = hepMH ? 58 : 82;
  const leDoc = hepMH ? 54 : 58;

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

  const vaoKhung = useCallback(() => { chuotTrongKhung.current = true; }, []);

  const thoiRai = useCallback((e) => {
    chuotTrongKhung.current = false;
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
          /* KHÔNG GIAN 3D + ĐÈN RỌI
           *
           * Cố tình KHÔNG dùng lưới đều: lưới đều thì mọi brand cùng kích thước,
           * cùng khoảng cách — đọc ra là một bảng dữ liệu, không phải một không
           * gian. Ở đây mỗi brand nằm ở một độ sâu riêng nên cái to cái nhỏ, và
           * khi rê chuột thì cái ở gần chạy nhanh hơn cái ở xa.
           *
           * Còn việc "đang nhìn cái nào" thì do đèn rọi lo: tất cả nằm im trong
           * trạng thái mờ và trắng đen, mỗi lúc chỉ MỘT brand được rõ nét và
           * hiện đúng màu logo, vài giây lại đổi sang một cái khác.
           *
           * Bốn thứ cùng đổi mới ra cảm giác "được rọi": nét lại, sáng lên, to
           * thêm, và lên màu. Chỉ bỏ blur thôi thì trông như lỗi hiển thị.
           */
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onPointerEnter={vaoKhung}
            onPointerMove={raiTheoChuot}
            onPointerLeave={thoiRai}
            style={{
              perspective: co3D ? '1200px' : undefined,
              // Chiều cao chạy theo SỐ HÀNG. Để cứng thì thêm vài brand là các
              // hàng bị ép sát rồi chồng lên nhau theo chiều dọc.
              height: `${caoKhung}px`,
            }}
            className="relative w-full rounded-3xl border border-white/10 bg-[#0B0B0E] overflow-hidden"
          >
            {/* Vệt sáng nền để cảnh có không khí, không phẳng lì */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(195,234,57,0.07) 0%, transparent 62%)' }}
            />

            {clientList.map((client, idx) => {
              const ten = client.clientName || 'Brand';
              const o = oCuaBrand[idx] ?? (idx % Math.max(1, soO));
              const v = viTriO(o, soCot, soHang, hepMH);
              const roi = idx === iNoiBat;        // đang được đèn rọi
              const an = idx === dangAn;          // đang tan đi để nhảy chỗ
              return (
                <div
                  key={client.id || idx}
                  data-sau={v.sau}
                  className="absolute"
                  style={{
                    // Đặt đúng tâm ô, rồi clamp() kéo lại nếu tấm nào sắp lòi ra mép.
                    //
                    // Bản trước là `calc(82px + (100% - 164px) * fx)`: nó không kéo
                    // lại tấm bị lòi mà BÓP cả dải vào giữa. Trên khung 335px của
                    // điện thoại, dải khả dụng chỉ còn 171px cho 3 cột — tâm hai ô
                    // cạnh nhau cách nhau 57px trong khi một brand rộng tới 113px,
                    // nên đè nhau là chắc chắn. Clamp thì mọi tấm nằm đúng tâm ô,
                    // chỉ tấm nào thật sự chạm mép mới bị kéo vào.
                    left: `clamp(${leNgang}px, ${(v.fx * 100).toFixed(3)}%, calc(100% - ${leNgang}px))`,
                    top: `clamp(${leDoc}px, ${(v.fy * 100).toFixed(3)}%, calc(100% - ${leDoc}px))`,
                    // Lớp này CHỈ lo vị trí + parallax. Transition ngắn để ảnh
                    // bám sát con trỏ.
                    transform: `translate(-50%, -50%) translate3d(var(--dx, 0px), var(--dy, 0px), 0)`,
                    transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                    // Cái đang rọi luôn nằm trên cùng, không bị cái mờ che mất.
                    zIndex: roi ? 100 : Math.round(v.sau * 50),
                  }}
                >
                  {/* Lớp ĐỘ SÂU riêng, transition dài 1.4s cho việc đổi tầng diễn
                      ra từ tốn. Không gộp vào lớp parallax ở trên được: gộp thì
                      một là parallax chậm ì theo 1.4s, hai là đổi tầng giật cục
                      trong 0.45s — hai việc cần hai tốc độ khác nhau. */}
                  <div
                    style={{
                      transform: `scale(${(v.tiLe * (roi ? 1.18 : 1)).toFixed(3)})`,
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
                        opacity: an ? 0 : roi ? 1 : 0.3,
                        filter: roi ? 'blur(0px)' : 'blur(2.6px)',
                        // Đang tan đi thì đừng nhận chuột: nó vô hình, bấm trúng
                        // sẽ mở ra một brand mà người ta không hề thấy.
                        pointerEvents: an ? 'none' : undefined,
                        transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), filter 1.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s ease-out',
                      }}
                      className="group/o relative flex flex-col items-center gap-2 px-4 py-3 rounded-2xl cursor-pointer hover:!opacity-100 hover:!blur-none hover:scale-110 focus-visible:outline-none focus-visible:!opacity-100 focus-visible:!blur-none focus-visible:ring-2 focus-visible:ring-[#C3EA39]"
                    >
                      {/* Ngoài trang chủ chỉ có logo + tên. Làm gì, năm nào, kể
                          chi tiết ra sao — để dành hết cho bài viết bên trong. */}
                      {client.logo ? (
                        <>
                          <img
                            src={client.logo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            /* Chỉ cái đang rọi mới hiện đúng màu logo. Rê chuột
                               vào cái nào thì cái đó cũng lên màu ngay. */
                            className={`max-h-16 sm:max-h-20 w-auto max-w-[30vw] sm:max-w-[150px] object-contain rounded-[8px] group-hover/o:grayscale-0 transition-[filter] duration-700 select-none ${roi ? 'grayscale-0' : 'grayscale'}`}
                          />
                          {/* Tên ở đây là chú thích dưới logo nên để cỡ nhỏ, kiểu
                              mono như các nhãn khác trong trang — logo vẫn là thứ
                              bắt mắt trước. alt của ảnh để rỗng cho khỏi đọc tên
                              hai lần.

                              KHÔNG `uppercase`: viết hoa ép sẽ phá cách viết riêng
                              của brand — "RomaFarm" thành "ROMAFARM". Gõ trong CMS
                              sao thì hiện ra vậy. */}
                          <span className={`font-mono text-[10px] sm:text-[11px] tracking-wide text-center leading-tight group-hover/o:text-[#C3EA39] transition-colors duration-700 max-w-[30vw] sm:max-w-[150px] select-none ${roi ? 'text-white' : 'text-white/60'}`}>
                            {ten}
                          </span>
                        </>
                      ) : (
                        /* Chưa có logo thì tên đứng một mình, cho to lên thay chỗ */
                        <span className="font-display font-extrabold text-center text-white text-sm sm:text-lg leading-tight max-w-[30vw] sm:max-w-[150px] select-none">
                          {ten}
                        </span>
                      )}
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
