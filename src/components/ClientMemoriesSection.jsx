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
// Số CHỖ ĐỨNG trong khung. Luôn nhiều hơn số brand để còn chỗ mà nhảy sang —
// vừa đủ mỗi brand một chỗ thì brand tan đi rồi hiện lại đúng chỗ cũ.
function soChoCua(tong) {
  return tong + Math.max(1, Math.round(tong * 0.4));
}

// Rải các CHỖ ĐỨNG ra khung, ngẫu nhiên nhưng không cái nào đè cái nào.
//
// Trước đây chia khung thành lưới ô vuông rồi xê dịch nhẹ trong lòng ô. Cách đó
// chắc chắn không đè nhau, nhưng nhìn ra ngay là lưới — nhất là trên điện thoại
// chỉ có 2 cột, mắt nối lại thành hai hàng dọc thẳng tắp.
//
// Ở đây gieo vị trí thật sự ngẫu nhiên, nhưng mỗi lần gieo đều kiểm: cách mọi
// chỗ đã đặt ít nhất bằng bán kính hai bên cộng lại. Gieo hụt vài trăm lần thì
// lấy chỗ nào xa nhất trong số đã thử — luôn có kết quả, không treo.
//
// Tất định theo `ngauNhien`: cùng kích thước khung thì luôn ra cùng một cách
// rải, nên React vẽ lại bao nhiêu lần cũng không nhảy lung tung.
function raiCho(soCho, rong, cao, leNgang, leDoc, rongCoBan, caoCoBan) {
  const ds = [];
  let hat = 1;

  for (let i = 0; i < soCho; i++) {
    // Độ sâu quyết định cỡ to nhỏ. Dải rộng cho cái to cái nhỏ rõ rệt.
    const sau = ngauNhien(i * 11 + 5);
    const tiLe = 0.5 + sau * 0.62;
    const rx = (rongCoBan * tiLe) / 2;
    const ry = (caoCoBan * tiLe) / 2;

    // Lề tính theo MÉP thẻ chứ không theo tâm: cộng thêm nửa thẻ vào lề thì
    // mép ngoài cùng mới thật sự cách viền khung đúng ngần ấy.
    const xMin = leNgang + rx, xMax = rong - leNgang - rx;
    const yMin = leDoc + ry, yMax = cao - leDoc - ry;
    const wX = Math.max(0, xMax - xMin), wY = Math.max(0, yMax - yMin);

    let tot = null, totNhat = null, xaNhat = -Infinity;

    for (let thu = 0; thu < 500; thu++) {
      const px = xMin + ngauNhien(hat++) * wX;
      const py = yMin + ngauNhien(hat++) * wY;

      // So bằng HÌNH CHỮ NHẬT chứ không bằng hình tròn: thẻ cao hơn rộng khá
      // nhiều (logo nằm trên, tên nằm dưới), lấy một bán kính chung thì hoặc là
      // lọt cặp đè nhau theo chiều dọc, hoặc là phải nới rộng quá mức rồi không
      // xếp nổi.
      let ho = Infinity;
      for (const o of ds) {
        const hoX = Math.abs(px - o.px) - (rx + o.rx);
        const hoY = Math.abs(py - o.py) - (ry + o.ry);
        const h = Math.max(hoX, hoY);        // rời nhau nếu TÁCH được theo một trục
        if (h < ho) ho = h;
      }

      if (ho > xaNhat) { xaNhat = ho; totNhat = { px, py }; }
      if (ho >= 8) { tot = { px, py }; break; }   // chừa 8px cho thoáng
    }

    const cho = tot || totNhat;
    ds.push({ px: cho.px, py: cho.py, sau, tiLe, rx, ry });
  }

  return ds;
}

// Chỗ nào gần tâm khung hơn.
function xaTam(cho, rong, cao) {
  return Math.hypot(cho.px - rong / 2, cho.py - cao / 2);
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

  // Brand đang được rê chuột / đang giữ bàn phím (null = không có cái nào).
  const [reVao, setReVao] = useState(null);

  // Brand đang tan đi để mọc lên chỗ khác (null = không có cái nào).
  const [dangAn, setDangAn] = useState(null);
  const dangAnRef = useRef(null);
  const datDangAn = useCallback((v) => { dangAnRef.current = v; setDangAn(v); }, []);

  // Đo khung để rải chỗ theo pixel thật. Rải theo phần trăm thì cùng một cách
  // rải sẽ dày đặc trên khung hẹp mà thưa thớt trên khung rộng.
  const khungRef = useRef(null);
  const [khungCo, setKhungCo] = useState({ rong: 0, cao: 0 });
  useEffect(() => {
    const el = khungRef.current;
    if (!el) return;
    const ob = new ResizeObserver(([m]) => {
      const r = m.contentRect;
      setKhungCo(cu =>
        Math.abs(cu.rong - r.width) < 1 && Math.abs(cu.cao - r.height) < 1
          ? cu
          : { rong: r.width, cao: r.height }
      );
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  // LỀ AN TOÀN: vùng sát mép khung không brand nào được lấn vào.
  //
  // Tính theo MÉP thẻ: không mép nào lọt vào dải này, kể cả thẻ to nhất.
  const leNgang = hepMH ? 14 : 32;
  const leDoc = hepMH ? 14 : 28;

  // Chiều cao tối thiểu: đủ chỗ cho chừng ấy brand mà không phải chen chúc.
  // Ước theo diện tích — mỗi chỗ đứng cần khoảng một ô vuông cạnh `kichCo`.
  const caoToiThieu = hepMH ? 300 : 460;

  // Cỡ gốc của một thẻ brand (chưa nhân tỉ lệ) — dùng để giữ khoảng cách và để
  // tính lề theo mép. Lấy dư một chút cho chắc.
  const rongCoBan = hepMH ? 82 : 170;
  const caoCoBan = hepMH ? 104 : 145;

  const soCho = soChoCua(clientList.length);

  const cacCho = useMemo(() => {
    if (!khungCo.rong || !khungCo.cao) return [];
    return raiCho(soCho, khungCo.rong, khungCo.cao, leNgang, leDoc, rongCoBan, caoCoBan);
  }, [soCho, khungCo.rong, khungCo.cao, leNgang, leDoc, rongCoBan, caoCoBan]);

  // Brand thứ i đang đứng chỗ nào.
  const [choCuaBrand, setChoCuaBrand] = useState([]);
  useEffect(() => {
    if (cacCho.length === 0) return;
    // Xếp vào các chỗ GẦN TÂM nhất trước, mấy chỗ rìa để trống.
    const theoTam = cacCho
      .map((c, i) => i)
      .sort((a, b) => xaTam(cacCho[a], khungCo.rong, khungCo.cao) - xaTam(cacCho[b], khungCo.rong, khungCo.cao));
    setChoCuaBrand(Array.from({ length: clientList.length }, (_, i) => theoTam[i % cacCho.length]));
    datDangAn(null);
    setReVao(null);
  }, [clientList.length, cacCho, khungCo.rong, khungCo.cao, datDangAn]);

  const giamChuyenDong = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const henRef = useRef([]);
  const huyHen = useCallback(() => {
    henRef.current.forEach(clearTimeout);
    henRef.current = [];
    // Phải hiện lại cái đang tan dở.
    //
    // Quãng tan gồm hai hẹn giờ: 450ms cho mờ lại, rồi 950ms cho tan hẳn và dời
    // chỗ. Cắt ngang mà chỉ xoá hẹn giờ thì `dangAn` còn trỏ vào nó — brand đó
    // đứng nguyên ở opacity 0 mãi mãi, mất tiêu khỏi khung dù vẫn tới lượt được
    // rọi (tên sáng lime mà thân không thấy đâu).
    if (dangAnRef.current !== null) datDangAn(null);
  }, [datDangAn]);
  useEffect(() => huyHen, [huyHen]);

  const vaoBrand = useCallback((idx) => {
    // Đang chờ tan mà quay lại rê tiếp thì huỷ, giữ nó ở nguyên chỗ cũ.
    huyHen();
    setReVao(idx);
  }, [huyHen]);

  // MỌC LÊN CHỖ KHÁC: hết lượt được nhìn thì brand mờ trắng đen trở lại, tan
  // hẳn đi, rồi hiện lên ở một chỗ còn trống.
  //
  // Đổi `left/top` đúng lúc opacity đang bằng 0 (mờ dần 0.9s ở CSS, dời chỗ ở
  // mốc 0.95s) nên mắt không thấy nó trượt — chỉ thấy chỗ này mất đi, chỗ kia
  // mọc lên. Cũng vì vậy mà không đặt transition cho left/top.
  const roiBrand = useCallback((idx) => {
    setReVao(prev => (prev === idx ? null : prev));
    if (giamChuyenDong()) return;
    if (cacCho.length <= clientList.length) return;   // không dư chỗ thì thôi

    huyHen();
    // Chờ một nhịp ngắn cho nó mờ trắng đen trở lại đã, rồi mới tan. Tan ngay
    // lúc vừa rời chuột thì trông như bấm nhầm làm nó biến mất.
    henRef.current.push(setTimeout(() => {
      datDangAn(idx);
      henRef.current.push(setTimeout(() => {
        setChoCuaBrand(prev => {
          if (!prev.length) return prev;
          const dangDung = new Set(prev);
          const trong = [];
          for (let c = 0; c < cacCho.length; c++) if (!dangDung.has(c)) trong.push(c);
          if (trong.length === 0) return prev;

          // Bốc hai chỗ trống rồi giữ cái gần tâm hơn. Vẫn ngẫu nhiên nên không
          // đoán trước được, nhưng về lâu dài thì đám brand dồn về giữa khung
          // chứ không tản dần ra bốn góc.
          const a = trong[Math.floor(Math.random() * trong.length)];
          const b = trong[Math.floor(Math.random() * trong.length)];
          const chon =
            xaTam(cacCho[a], khungCo.rong, khungCo.cao) <= xaTam(cacCho[b], khungCo.rong, khungCo.cao) ? a : b;

          const moi = [...prev];
          moi[idx] = chon;
          return moi;
        });
        datDangAn(null);
      }, 950));
    }, 450));
  }, [cacCho, khungCo.rong, khungCo.cao, clientList.length, huyHen, datDangAn]);

  // ĐÈN RỌI TỰ ĐỘNG — CHỈ CHO MÀN CẢM ỨNG.
  //
  // Máy tính thì con chuột lo hết: rê vào cái nào là cái đó rõ, bỏ ra thì nó
  // tan. Điện thoại không có "rê chuột", nên ở đó cho các brand thay phiên nhau
  // rõ lên, và cái vừa hết lượt cũng tan đi mọc chỗ khác y như bên máy tính.
  const [noiBat, setNoiBat] = useState(0);
  const noiBatRef = useRef(0);
  useEffect(() => {
    if (co3D) return;                        // có chuột thì thôi, để chuột lo
    const tong = clientList.length;
    if (tong <= 1) return;
    if (giamChuyenDong()) return;

    const t = setInterval(() => {
      // Bốc trong (tong - 1) cái RỒI nhảy qua chính nó, để luôn đổi sang brand
      // khác. Bốc thẳng trong `tong` thì có lúc trúng lại chính nó, người xem
      // thấy cả khung đứng im một nhịp tưởng bị treo.
      const hienTai = noiBatRef.current;
      let k = Math.floor(Math.random() * (tong - 1));
      if (k >= hienTai) k += 1;

      noiBatRef.current = k;
      setNoiBat(k);
      roiBrand(hienTai);                     // cái vừa hết lượt: tan rồi mọc chỗ khác
    }, 2800);
    return () => clearInterval(t);
  }, [co3D, clientList.length, roiBrand]);

  // Cái nào đang rõ: máy tính thì do chuột, cảm ứng thì do đèn rọi tự động.
  const iRo = co3D
    ? reVao
    : (noiBat < clientList.length ? noiBat : 0);

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
      // Cái đang rê thì đứng yên.
      //
      // Cả cảnh trôi theo chuột tới 26px, mà một brand chỉ rộng chừng 80px. Nhích
      // chuột một cái là nó trượt ra khỏi con trỏ, tính là "bỏ chuột ra" rồi tan
      // đi — đang muốn xem thì nó biến mất.
      if (el.dataset.re === '1') {
        el.style.setProperty('--dx', '0px');
        el.style.setProperty('--dy', '0px');
        continue;
      }
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
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center font-mono font-bold text-lg">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">
              {profile?.emptyClients || 'Chưa có bạn đồng hành nào'}
            </h3>
            <p className="text-xs text-white/50 max-w-sm">
              Bạn có thể vào trang quản trị CMS để thêm tên thương hiệu, ảnh sản phẩm đã bàn giao và những câu chuyện kỷ niệm đáng nhớ.
            </p>
          </motion.div>
        ) : (
          /* KHÔNG GIAN 3D — CHẠM VÀO THÌ HIỆN RA, BỎ ĐI THÌ TAN
           *
           * Cố tình KHÔNG dùng lưới đều: lưới đều thì mọi brand cùng kích thước,
           * cùng khoảng cách — đọc ra là một bảng dữ liệu, không phải một không
           * gian. Ở đây mỗi brand nằm ở một độ sâu riêng nên cái to cái nhỏ, và
           * khi rê chuột thì cái ở gần chạy nhanh hơn cái ở xa.
           *
           * Mặc định TẤT CẢ đều mờ và trắng đen. Rê chuột vào cái nào thì cái đó
           * to lên, hết mờ, hiện đúng màu logo và tên. Rời chuột đi thì nó mờ
           * trắng đen trở lại, tan hẳn, rồi mọc lên ở một ô khác.
           *
           * Bốn thứ cùng đổi mới ra cảm giác "chạm tới": nét lại, sáng lên, to
           * thêm, và lên màu. Chỉ bỏ blur thôi thì trông như lỗi hiển thị.
           */
          <motion.div
            ref={khungRef}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onPointerMove={raiTheoChuot}
            onPointerLeave={thoiRai}
            style={{
              perspective: co3D ? '1200px' : undefined,
              // Màn hẹp: khung VUÔNG cho gọn. Nhưng vuông chỉ đẹp khi vừa đủ chỗ
              // — thêm brand là thêm hàng, nên kèm `minHeight`: đủ chỗ thì giữ
              // vuông, không đủ thì cao thêm chứ không ép các hàng chồng nhau.
              //
              // Màn rộng: cao theo số hàng như cũ.
              aspectRatio: hepMH ? '1 / 1' : undefined,
              minHeight: hepMH ? `${caoToiThieu}px` : undefined,
              height: hepMH ? undefined : `${caoToiThieu}px`,
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
              const cho = cacCho[choCuaBrand[idx]];
              if (!cho) return null;              // chưa đo xong khung
              const roi = idx === iRo;            // đang rõ nét + có màu
              const an = idx === dangAn;          // đang tan đi để mọc chỗ khác
              return (
                <div
                  key={client.id || idx}
                  data-sau={cho.sau}
                  /* Đánh dấu cái đang rê để lớp trôi theo chuột chừa nó ra —
                     xem `raiTheoChuot`. */
                  data-re={roi ? '1' : undefined}
                  className="absolute"
                  style={{
                    // Toạ độ tính sẵn bằng pixel lúc rải chỗ, đã chừa lề bốn phía.
                    left: `${cho.px.toFixed(1)}px`,
                    top: `${cho.py.toFixed(1)}px`,
                    // Lớp này CHỈ lo vị trí + parallax. Transition ngắn để ảnh
                    // bám sát con trỏ.
                    transform: `translate(-50%, -50%) translate3d(var(--dx, 0px), var(--dy, 0px), 0)`,
                    transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                    // Cái đang rọi luôn nằm trên cùng, không bị cái mờ che mất.
                    zIndex: roi ? 100 : Math.round(cho.sau * 50),
                  }}
                >
                  {/* Lớp ĐỘ SÂU riêng, transition dài 1.4s cho việc đổi tầng diễn
                      ra từ tốn. Không gộp vào lớp parallax ở trên được: gộp thì
                      một là parallax chậm ì theo 1.4s, hai là đổi tầng giật cục
                      trong 0.45s — hai việc cần hai tốc độ khác nhau. */}
                  <div
                    style={{
                      transform: `scale(${(cho.tiLe * (roi ? 1.18 : 1)).toFixed(3)})`,
                      transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
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
                      /* Rê chuột và bàn phím đi cùng một đường: người dùng bàn
                         phím Tab tới đâu cũng phải thấy rõ tới đó. */
                      onPointerEnter={() => vaoBrand(idx)}
                      onPointerLeave={() => roiBrand(idx)}
                      onFocus={() => vaoBrand(idx)}
                      onBlur={() => roiBrand(idx)}
                      aria-label={`Xem những gì đã làm cho ${ten}`}
                      style={{
                        opacity: an ? 0 : roi ? 1 : 0.3,
                        filter: roi ? 'blur(0px)' : 'blur(2.6px)',
                        // Đang tan đi thì đừng nhận chuột: nó vô hình, bấm trúng
                        // sẽ mở ra một brand mà người ta không hề thấy.
                        pointerEvents: an ? 'none' : undefined,
                        transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), filter 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.4s ease-out',
                      }}
                      /* Không dùng `hover:` của CSS nữa — trạng thái rõ/mờ do JS
                         nắm, để nó còn biết lúc nào phải cho brand tan đi. Hai
                         bên cùng chỉnh một thứ thì sẽ đá nhau. */
                      className="group/o relative flex flex-col items-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-4 sm:py-3 rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C3EA39]"
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
                            /* Chỉ cái đang rõ mới hiện đúng màu logo */
                            className={`max-h-12 sm:max-h-20 w-auto max-w-[22vw] sm:max-w-[150px] object-contain rounded-[8px] transition-[filter] duration-500 select-none ${roi ? 'grayscale-0' : 'grayscale'}`}
                          />
                          {/* Tên ở đây là chú thích dưới logo nên để cỡ nhỏ, kiểu
                              mono như các nhãn khác trong trang — logo vẫn là thứ
                              bắt mắt trước. alt của ảnh để rỗng cho khỏi đọc tên
                              hai lần.

                              KHÔNG `uppercase`: viết hoa ép sẽ phá cách viết riêng
                              của brand — "RomaFarm" thành "ROMAFARM". Gõ trong CMS
                              sao thì hiện ra vậy. */}
                          <span className={`font-mono text-[10px] sm:text-[11px] tracking-wide text-center leading-tight transition-colors duration-500 max-w-[22vw] sm:max-w-[150px] select-none ${roi ? 'text-[#C3EA39]' : 'text-white/60'}`}>
                            {ten}
                          </span>
                        </>
                      ) : (
                        /* Chưa có logo thì tên đứng một mình, cho to lên thay chỗ */
                        <span className="font-display font-extrabold text-center text-white text-xs sm:text-lg leading-tight max-w-[22vw] sm:max-w-[150px] select-none">
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
