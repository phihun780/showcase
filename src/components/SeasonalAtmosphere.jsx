import React, { useEffect, useRef } from 'react';
import { usePortfolioData } from '../context/PortfolioDataContext';

/**
 * Hiệu ứng không khí theo mùa: tuyết rơi, hoa Tết, Trung thu.
 *
 * BỐN THỨ QUYẾT ĐỊNH NHÌN CÓ "ĐÃ" HAY KHÔNG, theo đúng thứ tự quan trọng:
 *
 * 1. ĐỘ NÉT. Canvas phải vẽ theo độ phân giải THẬT của màn hình. Bản trước đặt
 *    `canvas.width = window.innerWidth`, tức là trên màn retina nó vẽ ở một nửa
 *    độ phân giải rồi để trình duyệt phóng to — mọi hạt thành đốm mờ. Đây là
 *    lý do lớn nhất khiến hiệu ứng trông rẻ tiền, và sửa nó không tốn gì.
 *
 * 2. CHIỀU SÂU. Mỗi hạt có một độ xa `z` từ 0 (xa) tới 1 (gần). Cỡ, tốc độ, độ
 *    đậm và độ nhoè đều suy từ đó. Hạt xa thì nhỏ, chậm, mờ; hạt gần thì to,
 *    nhanh, rõ. Mắt đọc ra ngay là có lớp lang, thay vì một mặt phẳng hạt bằng
 *    nhau trôi đều.
 *
 * 3. GIÓ ĐỔI THEO THỜI GIAN. Bản trước mỗi hạt có một `speedX` cố định, nên
 *    nhìn lâu thấy máy móc. Giờ có một luồng gió chung dao động chậm, thỉnh
 *    thoảng mạnh lên rồi lắng xuống.
 *
 * 4. SỐ LƯỢNG. Bản trước tối đa 24 bông tuyết trên cả màn hình — thưa tới mức
 *    không thành không khí. Giờ tối đa 110, tức gần gấp năm.
 *
 * VÌ SAO VẼ SẴN HẠT RA ẢNH RỒI DÁN, THAY VÌ `ctx.shadowBlur` NHƯ BẢN TRƯỚC:
 * Vì HÌNH THỨC, không phải vì tốc độ.
 *
 * `shadowBlur` chỉ hắt một quầng đều quanh một đĩa tròn viền cứng — nhìn kỹ
 * vẫn thấy cái đĩa. Còn chuyển sắc xuyên tâm vẽ sẵn thì đặc ở lõi rồi tan dần
 * ra tới trong suốt, và chỉnh được điểm bắt đầu tan. Đó chính là thứ làm nên
 * mấy đốm sáng nhoè của vật ngoài tiêu cự — không có nó thì hạt gần trông
 * không ra "gần", chỉ là hạt xa phóng to.
 *
 * ĐÃ ĐO, ĐỪNG TIN NHẦM LÀ NHANH HƠN: dán ảnh CHẬM HƠN shadowBlur chừng 2,5
 * lần (110 hạt: 0,19 so với 0,065 ms mỗi khung hình; 300 hạt: 0,67 so với
 * 0,28). Nhưng cả hai đều chưa tới 1 ms trong ngân sách 16,7 ms của một khung
 * hình 60Hz, nên đổi lấy hình thức đẹp hơn là đáng.
 */
export default function SeasonalAtmosphere({ effectOverride } = {}) {
  const { seasonalEffect: contextEffect } = usePortfolioData();
  const seasonalEffect = effectOverride !== undefined ? effectOverride : contextEffect;
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!seasonalEffect || seasonalEffect === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ai bật "Giảm chuyển động" trong hệ điều hành thì không dựng gì cả. Đây là
    // chuyển động lặp vô hạn phủ kín màn hình — thứ dễ gây khó chịu nhất với
    // người nhạy cảm chuyển động, nên tôn trọng cài đặt đó là bắt buộc.
    const itChuyenDong = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (itChuyenDong?.matches) return;

    let width = 0;
    let height = 0;
    let dayDac = false; // màn hình nhỏ thì bớt hạt

    /**
     * Dựng canvas theo ĐÚNG độ phân giải màn hình.
     *
     * Bộ đệm vẽ to gấp `dpr` lần khung CSS, rồi phóng hệ toạ độ lên bấy nhiêu —
     * nhờ vậy mọi phép vẽ bên dưới vẫn viết bằng pixel CSS như thường, mà kết
     * quả thì nét đúng độ nét màn hình.
     *
     * Chặn dpr ở 2: màn 3x có tồn tại nhưng vẽ ở 3x tốn gấp 2,25 lần 2x mà mắt
     * gần như không phân biệt được ở cỡ hạt nhỏ thế này.
     */
    const dungCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      dayDac = width >= 768;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    dungCanvas();

    /**
     * Vẽ sẵn một hình tròn mềm ra canvas con, dùng lại mãi.
     *
     * `doNhoe` 0 là viền gọn, 1 là tan hẳn ra ngoài — chính là thứ tạo cảm giác
     * hạt nằm ngoài tiêu cự khi ở gần ống kính.
     */
    const veChamSang = (banKinh, mau, doNhoe) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const le = banKinh * 2;
      const co = Math.ceil((banKinh + le) * 2 * dpr);
      const c = document.createElement('canvas');
      c.width = c.height = co;
      const g = c.getContext('2d');
      g.scale(dpr, dpr);

      const tam = co / (2 * dpr);
      const grad = g.createRadialGradient(tam, tam, 0, tam, tam, banKinh + le);
      // Nhoè càng nhiều thì lõi đặc càng nhỏ, phần tan càng rộng.
      const loi = Math.max(0.02, 0.55 * (1 - doNhoe));
      grad.addColorStop(0, `rgba(${mau}, 1)`);
      grad.addColorStop(loi, `rgba(${mau}, 0.85)`);
      grad.addColorStop(Math.min(0.99, loi + 0.35), `rgba(${mau}, 0.18)`);
      grad.addColorStop(1, `rgba(${mau}, 0)`);

      g.fillStyle = grad;
      g.beginPath();
      g.arc(tam, tam, banKinh + le, 0, Math.PI * 2);
      g.fill();

      return { anh: c, nua: tam };
    };

    // Ba mức nhoè dùng chung cho tuyết: xa thì gọn, gần thì tan.
    let chamTuyet = [];
    const dungChamTuyet = () => {
      chamTuyet = [0, 0.45, 0.85].map(n => veChamSang(14, '255, 255, 255', n));
    };
    dungChamTuyet();

    // Gió chung, dao động chậm. Hai sóng chu kỳ lệch nhau để không lặp lại đều
    // đặn thành một nhịp đoán trước được.
    let thoiGian = 0;
    const gioHienTai = () =>
      Math.sin(thoiGian * 0.00021) * 1.15 + Math.sin(thoiGian * 0.00057) * 0.55;

    // ==========================================
    // 1. TUYẾT
    // ==========================================
    const taoTuyet = () => {
      const soLuong = dayDac ? Math.min(Math.floor(width / 13), 110) : 34;
      return Array.from({ length: soLuong }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          // Cỡ và tốc độ đi theo độ xa. Mũ 1.6 để hạt gần bật hẳn lên chứ
          // không tăng đều — như vậy mới ra lớp trước lớp sau rõ rệt.
          co: 0.9 + Math.pow(z, 1.6) * 5.2,
          roi: 0.28 + Math.pow(z, 1.4) * 1.5,
          dam: 0.16 + z * 0.62,
          lac: Math.random() * Math.PI * 2,
          nhipLac: 0.004 + Math.random() * 0.012,
          bienLac: 0.3 + z * 1.1,
          xoay: Math.random() * 0.4 - 0.2,
        };
      });
    };

    const veTuyet = (gio, nhip) => {
      for (let i = 0; i < tuyet.length; i++) {
        const f = tuyet[i];
        f.lac += f.nhipLac * nhip;
        f.x += ((gio * (0.25 + f.z * 0.85)) + Math.sin(f.lac) * f.bienLac + f.xoay * f.z) * nhip;
        f.y += f.roi * nhip;

        if (f.y > height + 30) { f.y = -30; f.x = Math.random() * width; }
        if (f.x > width + 40) f.x = -40;
        if (f.x < -40) f.x = width + 40;

        // Hạt càng gần càng nhoè — giống vật thể lọt ra ngoài tiêu cự.
        const cham = chamTuyet[f.z > 0.82 ? 2 : f.z > 0.45 ? 1 : 0];
        const ve = f.co * 3.2;
        ctx.globalAlpha = f.dam;
        ctx.drawImage(cham.anh, f.x - ve, f.y - ve, ve * 2, ve * 2);
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // 2. TẾT — cánh mai, cánh đào
    // ==========================================
    const MAU_TET = [
      { fill: '#FFD700', vien: '#FFA500', sang: '#FFF3B0' },
      { fill: '#FFC400', vien: '#FF8C00', sang: '#FFE9A0' },
      { fill: '#FF85A1', vien: '#FF5376', sang: '#FFD3DD' },
      { fill: '#FFA8BA', vien: '#FF6B8B', sang: '#FFE0E7' },
      { fill: '#FF5252', vien: '#D32F2F', sang: '#FFC4C4' },
    ];

    const taoTet = () => {
      const soLuong = dayDac ? Math.min(Math.floor(width / 22), 62) : 20;
      return Array.from({ length: soLuong }, () => {
        const z = Math.random();
        const m = MAU_TET[Math.floor(Math.random() * MAU_TET.length)];
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          co: 3.5 + Math.pow(z, 1.5) * 9,
          roi: 0.4 + Math.pow(z, 1.3) * 1.5,
          goc: Math.random() * Math.PI * 2,
          nhipXoay: (Math.random() * 0.022 - 0.011),
          lat: Math.random() * Math.PI * 2,
          nhipLat: 0.012 + Math.random() * 0.026,
          dam: 0.25 + z * 0.55,
          mau: m,
        };
      });
    };

    const veTet = (gio, nhip) => {
      for (let i = 0; i < tet.length; i++) {
        const p = tet[i];
        p.goc += p.nhipXoay * nhip;
        p.lat += p.nhipLat * nhip;
        p.x += ((gio * (0.35 + p.z * 1.0)) + Math.sin(p.lat) * (0.5 + p.z * 0.9)) * nhip;
        p.y += p.roi * nhip;

        if (p.y > height + 30) { p.y = -30; p.x = Math.random() * width; }
        if (p.x > width + 40) p.x = -40;
        if (p.x < -40) p.x = width + 40;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.goc);
        // Bóp ngang theo nhịp lật, thành ra cánh hoa như đang xoay trong không
        // gian chứ không phải một hình phẳng quay tròn.
        ctx.scale(Math.cos(p.lat), 1);
        ctx.globalAlpha = p.dam;

        const s = p.co;
        // Chuyển sắc dọc thân cánh: mép trên sáng, gốc đậm. Cánh hoa thật bắt
        // sáng không đều, tô một màu phẳng là mất hẳn chất.
        const g = ctx.createLinearGradient(0, -s, 0, s);
        g.addColorStop(0, p.mau.sang);
        g.addColorStop(0.55, p.mau.fill);
        g.addColorStop(1, p.mau.vien);

        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.72, -s * 0.5, s * 0.82, s * 0.5, 0, s);
        ctx.bezierCurveTo(-s * 0.82, s * 0.5, -s * 0.72, -s * 0.5, 0, -s);
        ctx.fillStyle = g;
        ctx.fill();

        // Gân giữa, chỉ vẽ cho cánh ở gần — cánh xa nhỏ quá, thêm nét chỉ thành
        // rác trên màn hình.
        if (p.z > 0.5) {
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.66);
          ctx.lineTo(0, s * 0.6);
          ctx.strokeStyle = p.mau.vien;
          ctx.globalAlpha = p.dam * 0.5;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }

        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // 3. TRUNG THU — trăng, sao, lá, đèn lồng
    // ==========================================
    let anhTrang = null;
    let quangDen = null;

    const dungAnhTrungThu = () => {
      quangDen = veChamSang(22, '255, 170, 60', 0.75);

      // Mặt trăng: vẽ một lần rồi dán, vì nó đứng yên.
      const r = Math.max(46, Math.min(width, height) * 0.085);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const le = r * 1.5;
      const co = Math.ceil((r + le) * 2 * dpr);
      const c = document.createElement('canvas');
      c.width = c.height = co;
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const tam = co / (2 * dpr);

      // Quầng sáng quanh trăng
      const halo = g.createRadialGradient(tam, tam, r * 0.8, tam, tam, r + le);
      halo.addColorStop(0, 'rgba(255, 238, 190, 0.32)');
      halo.addColorStop(0.45, 'rgba(255, 226, 150, 0.10)');
      halo.addColorStop(1, 'rgba(255, 210, 120, 0)');
      g.fillStyle = halo;
      g.beginPath();
      g.arc(tam, tam, r + le, 0, Math.PI * 2);
      g.fill();

      // Đĩa trăng, sáng lệch về một bên cho có khối
      const dia = g.createRadialGradient(tam - r * 0.28, tam - r * 0.3, r * 0.1, tam, tam, r);
      dia.addColorStop(0, 'rgba(255, 252, 235, 0.97)');
      dia.addColorStop(0.7, 'rgba(255, 240, 200, 0.9)');
      dia.addColorStop(1, 'rgba(250, 220, 160, 0.82)');
      g.fillStyle = dia;
      g.beginPath();
      g.arc(tam, tam, r, 0, Math.PI * 2);
      g.fill();

      // Vài vết rỗ mờ. Không có thì đĩa trăng phẳng lì như một chấm tròn.
      const vet = [
        [-0.30, -0.16, 0.21], [0.22, -0.30, 0.13], [0.10, 0.28, 0.17],
        [-0.34, 0.30, 0.10], [0.38, 0.12, 0.09],
      ];
      g.fillStyle = 'rgba(214, 186, 138, 0.26)';
      for (const [dx, dy, dr] of vet) {
        g.beginPath();
        g.arc(tam + dx * r, tam + dy * r, dr * r, 0, Math.PI * 2);
        g.fill();
      }

      anhTrang = { anh: c, nua: tam, r };
    };

    const taoTrungThu = () => {
      const soDen = dayDac ? Math.min(Math.floor(width / 110), 12) : 5;
      const soLa = dayDac ? Math.min(Math.floor(width / 48), 30) : 10;
      const soSao = dayDac ? Math.min(Math.floor(width / 26), 70) : 26;

      const den = Array.from({ length: soDen }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          co: 9 + Math.pow(z, 1.4) * 16,
          bay: -(0.14 + Math.pow(z, 1.3) * 0.5),
          lac: Math.random() * Math.PI * 2,
          nhipLac: 0.005 + Math.random() * 0.012,
          dam: 0.3 + z * 0.55,
          // Nhịp lửa riêng của từng chiếc, để cả đàn không nhấp nháy cùng lúc.
          lua: Math.random() * Math.PI * 2,
          nhipLua: 0.03 + Math.random() * 0.05,
        };
      });

      const mauLa = ['#D35400', '#E67E22', '#F39C12', '#C0392B', '#B9770E'];
      const la = Array.from({ length: soLa }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          co: 3.5 + Math.pow(z, 1.5) * 8,
          roi: 0.35 + Math.pow(z, 1.3) * 1.3,
          goc: Math.random() * Math.PI * 2,
          nhipXoay: Math.random() * 0.02 - 0.01,
          lat: Math.random() * Math.PI * 2,
          nhipLat: 0.01 + Math.random() * 0.022,
          mau: mauLa[Math.floor(Math.random() * mauLa.length)],
          dam: 0.22 + z * 0.5,
        };
      });

      const sao = Array.from({ length: soSao }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.75,
        r: 0.4 + Math.random() * 1.3,
        pha: Math.random() * Math.PI * 2,
        nhip: 0.004 + Math.random() * 0.016,
      }));

      return { den, la, sao };
    };

    const veTrungThu = (gio, nhip) => {
      const { den, la, sao } = trungThu;

      // A. Trăng — nằm sau tất cả
      if (anhTrang) {
        const tx = width * 0.82;
        const ty = height * 0.18;
        const n = anhTrang.nua;
        ctx.drawImage(anhTrang.anh, tx - n, ty - n, n * 2, n * 2);
      }

      // B. Sao nhấp nháy
      for (let i = 0; i < sao.length; i++) {
        const s = sao[i];
        s.pha += s.nhip * nhip;
        ctx.globalAlpha = Math.abs(Math.sin(s.pha)) * 0.7 + 0.12;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(255, 238, 180)';
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // C. Lá rơi
      for (let i = 0; i < la.length; i++) {
        const l = la[i];
        l.goc += l.nhipXoay * nhip;
        l.lat += l.nhipLat * nhip;
        l.x += ((gio * (0.3 + l.z * 0.9)) + Math.sin(l.lat) * (0.4 + l.z * 0.8)) * nhip;
        l.y += l.roi * nhip;

        if (l.y > height + 30) { l.y = -30; l.x = Math.random() * width; }
        if (l.x > width + 40) l.x = -40;
        if (l.x < -40) l.x = width + 40;

        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.goc);
        ctx.scale(Math.cos(l.lat), 1);
        ctx.globalAlpha = l.dam;

        const s = l.co;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.8, 0, 0, s);
        ctx.quadraticCurveTo(-s * 0.8, 0, 0, -s);
        ctx.fillStyle = l.mau;
        ctx.fill();

        // Sống lá, chỉ cho lá gần
        if (l.z > 0.5) {
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.8);
          ctx.lineTo(0, s * 0.8);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // D. Đèn lồng bay lên
      for (let i = 0; i < den.length; i++) {
        const d = den[i];
        d.lac += d.nhipLac * nhip;
        d.lua += d.nhipLua * nhip;
        d.x += ((gio * 0.18 * (0.3 + d.z)) + Math.sin(d.lac) * (0.25 + d.z * 0.5)) * nhip;
        d.y += d.bay * nhip;

        if (d.y < -80) { d.y = height + 50; d.x = Math.random() * width; }
        if (d.x > width + 50) d.x = -50;
        if (d.x < -50) d.x = width + 50;

        // Lửa bên trong chập chờn, nên cả quầng sáng cũng thở theo.
        const nhay = 0.88 + Math.sin(d.lua) * 0.12;

        ctx.save();
        ctx.translate(d.x, d.y);

        // Quầng sáng
        if (quangDen) {
          const q = d.co * 2.6;
          ctx.globalAlpha = d.dam * 0.85 * nhay;
          ctx.drawImage(quangDen.anh, -q, -q, q * 2, q * 2);
        }

        // Thân đèn: trên hẹp dưới nở, giống đèn lồng giấy hơn là viên thuốc.
        const w = d.co * 0.62;
        const h = d.co;
        ctx.globalAlpha = d.dam * nhay;
        const than = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        than.addColorStop(0, 'rgba(255, 228, 160, 0.95)');
        than.addColorStop(0.5, 'rgba(255, 186, 90, 0.95)');
        than.addColorStop(1, 'rgba(240, 130, 40, 0.9)');

        ctx.beginPath();
        ctx.moveTo(-w * 0.34, -h * 0.5);
        ctx.quadraticCurveTo(-w * 0.62, 0, -w * 0.4, h * 0.46);
        ctx.lineTo(w * 0.4, h * 0.46);
        ctx.quadraticCurveTo(w * 0.62, 0, w * 0.34, -h * 0.5);
        ctx.closePath();
        ctx.fillStyle = than;
        ctx.fill();

        // Lõi lửa
        ctx.globalAlpha = d.dam * nhay;
        ctx.beginPath();
        ctx.arc(0, h * 0.14, d.co * 0.2 * nhay, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 252, 230, 0.95)';
        ctx.fill();

        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // DỰNG & CHẠY
    // ==========================================
    let tuyet = [];
    let tet = [];
    let trungThu = null;

    const dungHat = () => {
      tuyet = seasonalEffect === 'snow' ? taoTuyet() : [];
      tet = seasonalEffect === 'tet' ? taoTet() : [];
      if (seasonalEffect === 'mid_autumn') {
        dungAnhTrungThu();
        trungThu = taoTrungThu();
      } else {
        trungThu = null;
      }
    };
    dungHat();

    // Đổi cỡ cửa sổ thì dựng lại: số hạt tính theo bề ngang, mà ảnh vẽ sẵn cũng
    // phải vẽ lại theo độ nét mới (kéo cửa sổ sang màn hình khác là dpr đổi).
    let hanDoiCo;
    const khiDoiCo = () => {
      clearTimeout(hanDoiCo);
      hanDoiCo = setTimeout(() => {
        dungCanvas();
        dungChamTuyet();
        dungHat();
      }, 180);
    };
    window.addEventListener('resize', khiDoiCo);

    let idKhung;
    let truoc = performance.now();

    const veKhung = (bayGio) => {
      // Nhịp chuẩn theo thời gian thật, không theo số khung hình. Máy 120Hz thì
      // khung hình tới dày gấp đôi; đếm theo khung là hạt rơi nhanh gấp đôi.
      // Chặn ở 2.5 để lỡ tab bị treo một nhịp thì hạt không nhảy cóc một đoạn.
      const nhip = Math.min((bayGio - truoc) / 16.667, 2.5);
      truoc = bayGio;
      thoiGian = bayGio;

      ctx.clearRect(0, 0, width, height);
      const gio = gioHienTai();

      if (seasonalEffect === 'snow') veTuyet(gio, nhip);
      else if (seasonalEffect === 'tet') veTet(gio, nhip);
      else if (seasonalEffect === 'mid_autumn' && trungThu) veTrungThu(gio, nhip);

      idKhung = requestAnimationFrame(veKhung);
    };

    idKhung = requestAnimationFrame(veKhung);

    return () => {
      window.removeEventListener('resize', khiDoiCo);
      clearTimeout(hanDoiCo);
      if (idKhung) cancelAnimationFrame(idKhung);
    };
  }, [seasonalEffect]);

  if (!seasonalEffect || seasonalEffect === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}
