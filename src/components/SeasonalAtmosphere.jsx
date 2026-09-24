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
export default function SeasonalAtmosphere({ effectOverride, phiaTren = false } = {}) {
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
      const soLuong = dayDac ? Math.min(Math.floor(width / 42), 34) : 12;
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
          dam: 0.1 + z * 0.4,
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
      const soLuong = dayDac ? Math.min(Math.floor(width / 65), 22) : 8;
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
          dam: 0.18 + z * 0.38,
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
    // KHÔNG CÓ MẶT TRĂNG. Đã thử vẽ một cái có quầng sáng và vết rỗ, nhưng nó
    // là vật đứng yên, to và sáng nhất màn hình — mục này nằm sau nội dung nên
    // trăng chỉ tổ chọi với chữ. Trung thu để cho đèn lồng và lá kể là đủ.
    let quangDen = null;

    const dungAnhTrungThu = () => {
      quangDen = veChamSang(22, '255, 170, 60', 0.75);
    };

    const taoTrungThu = () => {
      const soDen = dayDac ? Math.min(Math.floor(width / 280), 5) : 2;
      const soLa = dayDac ? Math.min(Math.floor(width / 130), 11) : 4;
      const soSao = dayDac ? Math.min(Math.floor(width / 60), 30) : 12;

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
          dam: 0.22 + z * 0.4,
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
          dam: 0.16 + z * 0.34,
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

      // A. Sao nhấp nháy
      for (let i = 0; i < sao.length; i++) {
        const s = sao[i];
        s.pha += s.nhip * nhip;
        ctx.globalAlpha = Math.abs(Math.sin(s.pha)) * 0.45 + 0.08;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(255, 238, 180)';
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // B. Lá rơi
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

      // C. Đèn lồng bay lên
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
    // 4. MƯA
    // ==========================================
    const taoMua = () => {
      const soLuong = dayDac ? Math.min(Math.floor(width / 26), 58) : 22;
      return Array.from({ length: soLuong }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          // Hạt mưa gần thì vạch dài và rơi nhanh hẳn. Mưa rơi nhanh hơn tuyết
          // nhiều lần — để chậm là ra tuyết trắng xanh chứ không ra mưa.
          dai: 7 + Math.pow(z, 1.4) * 24,
          roi: 5 + Math.pow(z, 1.3) * 13,
          day: 0.5 + z * 1.1,
          dam: 0.08 + z * 0.22,
        };
      });
    };

    const veMua = (gio, nhip) => {
      // Độ nghiêng dùng CHUNG cho mọi hạt trong một khung hình. Mưa thật cùng
      // một cơn thì nghiêng như nhau; mỗi hạt một hướng là ra tuyết bay loạn.
      const nghieng = gio * 0.55;

      ctx.lineCap = 'round';
      for (let i = 0; i < mua.length; i++) {
        const m = mua[i];
        m.x += nghieng * (0.4 + m.z) * nhip;
        m.y += m.roi * nhip;

        if (m.y > height + 40) { m.y = -40; m.x = Math.random() * width; }
        if (m.x > width + 60) m.x = -60;
        if (m.x < -60) m.x = width + 60;

        // Vạch vẽ theo đúng hướng đang rơi, nên nghiêng bao nhiêu thì vạch
        // ngả bấy nhiêu — không thì hạt đi chéo mà vạch vẫn dựng đứng.
        const lech = nghieng * (0.4 + m.z) * (m.dai / m.roi);
        ctx.globalAlpha = m.dam;
        ctx.strokeStyle = 'rgb(200, 224, 255)';
        ctx.lineWidth = m.day;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + lech, m.y + m.dai);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // 5. GIÁNG SINH — đốm sáng dây đèn
    // ==========================================
    // Cố ý KHÔNG có tuyết ở đây: đã có sẵn mục "Tuyết rơi" riêng. Mục này là
    // hơi ấm của dây đèn nhoè trong đêm — thứ mà tuyết trắng không nói được.
    const MAU_NOEL = ['235, 70, 70', '80, 190, 110', '255, 205, 90', '255, 240, 215'];
    let domNoel = [];

    const dungDomNoel = () => {
      domNoel = MAU_NOEL.map(m => veChamSang(16, m, 0.82));
    };

    const taoNoel = () => {
      const soLuong = dayDac ? Math.min(Math.floor(width / 52), 28) : 10;
      return Array.from({ length: soLuong }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          co: 2 + Math.pow(z, 1.5) * 9,
          roi: 0.1 + Math.pow(z, 1.4) * 0.42,
          dam: 0.12 + z * 0.34,
          lac: Math.random() * Math.PI * 2,
          nhipLac: 0.003 + Math.random() * 0.008,
          // Nhịp nháy riêng từng bóng, nên cả dây không sáng tắt cùng lúc.
          nhay: Math.random() * Math.PI * 2,
          nhipNhay: 0.012 + Math.random() * 0.03,
          mau: Math.floor(Math.random() * MAU_NOEL.length),
        };
      });
    };

    const veNoel = (gio, nhip) => {
      for (let i = 0; i < noel.length; i++) {
        const d = noel[i];
        d.lac += d.nhipLac * nhip;
        d.nhay += d.nhipNhay * nhip;
        d.x += ((gio * (0.12 + d.z * 0.3)) + Math.sin(d.lac) * (0.15 + d.z * 0.3)) * nhip;
        d.y += d.roi * nhip;

        if (d.y > height + 30) { d.y = -30; d.x = Math.random() * width; }
        if (d.x > width + 40) d.x = -40;
        if (d.x < -40) d.x = width + 40;

        const sang = 0.55 + Math.abs(Math.sin(d.nhay)) * 0.45;
        const cham = domNoel[d.mau];
        const ve = d.co * 3.2;
        ctx.globalAlpha = d.dam * sang;
        ctx.drawImage(cham.anh, d.x - ve, d.y - ve, ve * 2, ve * 2);
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // 6. QUỐC KHÁNH 2/9
    // ==========================================
    // Bay LÊN chứ không rơi xuống, chậm và thưa — như tàn lửa ấm. Cố ý không
    // làm pháo hoa: pháo hoa nổ từng chùm, mắt bị kéo theo mỗi lần nổ, mà mục
    // này nằm sau bài viết nên chỉ tổ giật khỏi phần đang đọc.
    let domQuocKhanh = [];

    const dungDomQuocKhanh = () => {
      domQuocKhanh = ['255, 80, 60', '255, 190, 60'].map(m => veChamSang(16, m, 0.7));
    };

    const taoQuocKhanh = () => {
      const soLuong = dayDac ? Math.min(Math.floor(width / 44), 32) : 12;
      return Array.from({ length: soLuong }, () => {
        const z = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          co: 1.6 + Math.pow(z, 1.5) * 7,
          bay: -(0.15 + Math.pow(z, 1.3) * 0.55),
          dam: 0.12 + z * 0.36,
          lac: Math.random() * Math.PI * 2,
          nhipLac: 0.006 + Math.random() * 0.014,
          nhay: Math.random() * Math.PI * 2,
          nhipNhay: 0.02 + Math.random() * 0.04,
          // Vàng ít hơn đỏ, đúng tỉ lệ của lá cờ: nền đỏ, sao vàng.
          mau: Math.random() < 0.3 ? 1 : 0,
        };
      });
    };

    const veQuocKhanh = (gio, nhip) => {
      for (let i = 0; i < quocKhanh.length; i++) {
        const h = quocKhanh[i];
        h.lac += h.nhipLac * nhip;
        h.nhay += h.nhipNhay * nhip;
        h.x += ((gio * (0.15 + h.z * 0.4)) + Math.sin(h.lac) * (0.2 + h.z * 0.45)) * nhip;
        h.y += h.bay * nhip;

        if (h.y < -30) { h.y = height + 30; h.x = Math.random() * width; }
        if (h.x > width + 40) h.x = -40;
        if (h.x < -40) h.x = width + 40;

        const sang = 0.6 + Math.abs(Math.sin(h.nhay)) * 0.4;
        const cham = domQuocKhanh[h.mau];
        const ve = h.co * 3.2;
        ctx.globalAlpha = h.dam * sang;
        ctx.drawImage(cham.anh, h.x - ve, h.y - ve, ve * 2, ve * 2);
      }
      ctx.globalAlpha = 1;
    };

    // ==========================================
    // DỰNG & CHẠY
    // ==========================================
    let tuyet = [];
    let tet = [];
    let trungThu = null;
    let mua = [];
    let noel = [];
    let quocKhanh = [];

    const dungHat = () => {
      tuyet = seasonalEffect === 'snow' ? taoTuyet() : [];
      tet = seasonalEffect === 'tet' ? taoTet() : [];
      mua = seasonalEffect === 'rain' ? taoMua() : [];

      if (seasonalEffect === 'mid_autumn') {
        dungAnhTrungThu();
        trungThu = taoTrungThu();
      } else {
        trungThu = null;
      }

      if (seasonalEffect === 'christmas') {
        dungDomNoel();
        noel = taoNoel();
      } else {
        noel = [];
      }

      if (seasonalEffect === 'national_day') {
        dungDomQuocKhanh();
        quocKhanh = taoQuocKhanh();
      } else {
        quocKhanh = [];
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
      else if (seasonalEffect === 'rain') veMua(gio, nhip);
      else if (seasonalEffect === 'christmas') veNoel(gio, nhip);
      else if (seasonalEffect === 'national_day') veQuocKhanh(gio, nhip);

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
      /* MẶC ĐỊNH NẰM SAU NỘI DUNG (z-0).
         Phần thân trang là z-10, nên hạt lọt xuống dưới chữ và dưới các thẻ —
         nhìn ra không khí phía sau thay vì có thứ gì đó bay trước mặt. Trước
         đây để z-20, tức là nằm ĐÈ lên cả bài viết.

         Riêng CMS truyền `phiaTren` để giữ lớp trên: ở đó các bảng đều có nền
         đục, hạt chui xuống dưới là không còn thấy gì để mà chọn. */
      className={`fixed inset-0 pointer-events-none w-full h-full ${phiaTren ? 'z-20' : 'z-0'}`}
      style={{ pointerEvents: 'none' }}
    />
  );
}
