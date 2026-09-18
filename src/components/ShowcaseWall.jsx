import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ImageViewer from './ImageViewer';
import { buildSrcSet } from '../utils/responsiveImage';

/**
 * TƯỜNG ẢNH 3D — kéo để xoay.
 *
 * KHÔNG dùng WebGL, không thư viện 3D nào. Chỉ là `transform: translate3d()`
 * trong một khung có `perspective`. Trình duyệt nào cũng chạy, nhẹ hều.
 *
 * CÁCH NÓ CÓ CHIỀU SÂU:
 * Các tấm nằm trên một vòng ellipse — rộng ngang, nông hơn về phía sau. Mỗi
 * tấm có một góc riêng; xoay cả vòng thì góc đổi, toạ độ đổi theo:
 *
 *     x = Rx · sin(góc)
 *     z = Rz · (cos(góc) − 1)      → z luôn ≤ 0, tấm gần nhất nằm ở z = 0
 *
 * Rồi BỐN thứ cùng suy ra từ z: càng lùi sâu thì càng nhỏ, càng mờ, càng tối,
 * càng nằm dưới. Một tín hiệu thôi thì trông giả; bốn cái cùng nói một chuyện
 * thì mắt đọc ra "xa" ngay.
 */

// Vị trí các tấm được ghi THẲNG vào DOM trong vòng lặp vẽ, không qua setState.
// Kéo tay là hàng chục khung hình mỗi giây — mỗi khung một lần render React thì
// giật ngay. Cách này chỉ đụng tới compositor, React không phải làm gì.

const MA_SAT = 0.94;          // mỗi khung vận tốc còn lại bao nhiêu sau khi thả
const TROI_NHE = 0.00045;     // tự trôi lúc không ai đụng vào, cho biết là kéo được
const NGUONG_KEO = 6;         // di chuyển quá bấy nhiêu px thì tính là kéo, không phải bấm
const DO_NHAY = 0.0052;       // 1px kéo ngang bằng mấy radian

export default function ShowcaseWall({ items = [], title, hint }) {
  const khungRef = useRef(null);
  const tamRef = useRef(null);
  const theRefs = useRef([]);

  const [dangXem, datDangXem] = useState(null);   // chỉ số ảnh đang phóng to
  const [coCho, datCoCho] = useState({ w: 0, h: 0 });

  const anh = useMemo(
    () => items.filter(it => (it?.image || '').trim()),
    [items]
  );
  const soAnh = anh.length;

  // Mỗi tấm một góc chia đều quanh vòng, cộng thêm một chút lệch và một độ cao
  // riêng. Lệch và độ cao lấy từ chỉ số chứ không phải Math.random(), để mỗi
  // lần render ra y hệt nhau — nhấp nháy đổi chỗ sau mỗi lần vẽ lại thì kỳ.
  const choDung = useMemo(() => {
    return Array.from({ length: soAnh }, (_, i) => {
      const nhieu = Math.sin(i * 12.9898) * 43758.5453;
      const le = nhieu - Math.floor(nhieu);              // 0..1, luôn giống nhau
      const nhieu2 = Math.sin(i * 78.233) * 12345.6789;
      const le2 = nhieu2 - Math.floor(nhieu2);
      return {
        goc: (i / Math.max(1, soAnh)) * Math.PI * 2 + (le - 0.5) * 0.22,
        caoTiLe: (le2 - 0.5) * 2,                        // -1..1
      };
    });
  }, [soAnh]);

  // Khung co theo bề ngang thật, không đoán theo điểm ngắt màn hình.
  useLayoutEffect(() => {
    const el = khungRef.current;
    if (!el) return;
    const doLai = () => {
      const w = el.clientWidth;
      // Điện thoại thì vòng phải hẹp và thấp lại, không thì tấm tràn ra ngoài.
      const cao = w < 640 ? Math.round(w * 0.95) : Math.min(640, Math.round(w * 0.52));
      datCoCho({ w, h: cao });
    };
    doLai();
    const ro = new ResizeObserver(doLai);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Kích thước một tấm và bán kính vòng, đều suy ra từ bề ngang khung.
  const soDo = useMemo(() => {
    const w = coCho.w || 1000;
    const nho = w < 640;
    const rongThe = nho ? Math.round(w * 0.46) : Math.min(360, Math.round(w * 0.27));
    return {
      rongThe,
      caoThe: Math.round(rongThe * 0.63),
      Rx: Math.round(w * (nho ? 0.3 : 0.38)),
      Rz: Math.round(w * (nho ? 0.22 : 0.26)),
      caoRai: Math.round(coCho.h * (nho ? 0.3 : 0.32)),
    };
  }, [coCho]);

  // ---- Vòng lặp vẽ -------------------------------------------------------
  const trangThai = useRef({ xoay: 0, vanToc: 0, dangCam: false });

  useEffect(() => {
    if (!soAnh || !coCho.w) return;

    const it = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let khung = 0;

    const { Rx, Rz, caoRai } = soDo;

    const ve = () => {
      const t = trangThai.current;

      if (!t.dangCam) {
        t.xoay += t.vanToc;
        t.vanToc *= MA_SAT;
        if (Math.abs(t.vanToc) < 0.00004) t.vanToc = 0;
        if (t.vanToc === 0 && !it) t.xoay += TROI_NHE;   // trôi nhẹ cho đỡ chết cứng
      }

      for (let i = 0; i < soAnh; i++) {
        const el = theRefs.current[i];
        if (!el) continue;
        const goc = choDung[i].goc + t.xoay;
        const x = Rx * Math.sin(goc);
        const z = Rz * (Math.cos(goc) - 1);              // 0 (gần nhất) .. -2Rz
        const sau = Rz === 0 ? 0 : -z / (2 * Rz);        // 0 gần, 1 xa

        el.style.transform =
          `translate3d(${x.toFixed(1)}px, ${(choDung[i].caoTiLe * caoRai).toFixed(1)}px, ${z.toFixed(1)}px)` +
          ` scale(${(1 - 0.6 * sau).toFixed(3)})`;
        el.style.opacity = (1 - 0.72 * sau).toFixed(3);
        el.style.filter = `brightness(${(1 - 0.4 * sau).toFixed(3)})`;
        el.style.zIndex = String(Math.round((1 - sau) * 1000));
      }

      khung = requestAnimationFrame(ve);
    };

    khung = requestAnimationFrame(ve);
    return () => cancelAnimationFrame(khung);
  }, [soAnh, choDung, soDo, coCho.w]);

  // ---- Kéo ---------------------------------------------------------------
  // `touch-action: pan-y` ở khung: trình duyệt vẫn lo việc cuộn trang theo
  // chiều dọc, mình chỉ nhận phần kéo ngang. Bản gốc mình xem tham khảo dùng
  // `touch-action: none`, tức là chạm vào khu này là không cuộn trang được nữa
  // — trên điện thoại thì đó là cái bẫy.
  const keo = useRef({ dangKeo: false, xTruoc: 0, tong: 0, luc: 0 });

  const batDau = (e) => {
    keo.current = { dangKeo: true, xTruoc: e.clientX, tong: 0, luc: e.timeStamp };
    trangThai.current.dangCam = true;
    trangThai.current.vanToc = 0;
    // Bọc try: setPointerCapture ném lỗi nếu con trỏ không còn "sống" — hiếm,
    // nhưng lỗi ném ra giữa handler thì cú kéo chết ngay tại đó.
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* không sao */ }
  };

  const dangDi = (e) => {
    const k = keo.current;
    if (!k.dangKeo) return;
    const dx = e.clientX - k.xTruoc;
    k.xTruoc = e.clientX;
    k.tong += Math.abs(dx);

    trangThai.current.xoay += dx * DO_NHAY;

    // Vận tốc tính theo thời gian thật, không theo số khung hình — máy yếu hay
    // máy khoẻ thì cú búng cũng đi xa như nhau.
    const dt = Math.max(1, e.timeStamp - k.luc);
    k.luc = e.timeStamp;
    trangThai.current.vanToc = (dx * DO_NHAY) / dt * 16;
  };

  const ketThuc = (e) => {
    if (!keo.current.dangKeo) return;
    keo.current.dangKeo = false;
    trangThai.current.dangCam = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* không sao */ }
  };

  // Bấm vào một tấm: chỉ mở ảnh khi tay gần như đứng yên. Không có cái này thì
  // kéo xong nhả tay là ảnh bật ra, khó chịu.
  const bamThe = (idx) => {
    if (keo.current.tong > NGUONG_KEO) return;
    datDangXem(idx);
  };

  if (!soAnh) return null;

  return (
    <div className="relative w-full select-none">
      {title && (
        <h3 className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-white/50 mb-3">
          {title}
        </h3>
      )}

      <div
        ref={khungRef}
        onPointerDown={batDau}
        onPointerMove={dangDi}
        onPointerUp={ketThuc}
        onPointerCancel={ketThuc}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          height: coCho.h || 420,
          perspective: '1500px',
          touchAction: 'pan-y',
        }}
      >
        {/* Neo giữa khung. Các tấm định vị quanh điểm này. */}
        <div
          ref={tamRef}
          className="absolute left-1/2 top-1/2"
          style={{ width: 0, height: 0, transformStyle: 'preserve-3d' }}
        >
          {anh.map((it, i) => (
            <div
              key={it.id || i}
              ref={el => { theRefs.current[i] = el; }}
              onClick={() => bamThe(i)}
              className="absolute rounded-xl overflow-hidden border border-white/10 bg-[#121216] shadow-2xl cursor-pointer"
              style={{
                width: soDo.rongThe,
                height: soDo.caoThe,
                left: -soDo.rongThe / 2,
                top: -soDo.caoThe / 2,
                willChange: 'transform, opacity',
              }}
            >
              <img
                src={it.image}
                srcSet={buildSrcSet(it.image) || undefined}
                sizes={`${soDo.rongThe}px`}
                alt={it.title || `Ảnh ${i + 1}`}
                loading="lazy"
                decoding="async"
                draggable={false}
                onContextMenu={e => e.preventDefault()}
                className="w-full h-full object-cover pointer-events-none"
              />
              {it.title && (
                <span className="absolute left-2 bottom-2 px-1.5 py-0.5 rounded text-[8.5px] font-mono uppercase tracking-[0.14em] text-white/85 bg-black/60 backdrop-blur-sm border border-white/10 max-w-[90%] truncate">
                  {it.title}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Hai mép tan vào nền, để tấm ở rìa không bị cắt ngang một nhát. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 z-[1001] bg-gradient-to-r from-[#08080A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 z-[1001] bg-gradient-to-l from-[#08080A] to-transparent" />
      </div>

      <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mt-2">
        {hint || 'Kéo để xoay · Bấm để xem lớn'}
      </p>

      {dangXem !== null && (
        <ImageViewer
          src={anh[dangXem].image}
          alt={anh[dangXem].title || `Ảnh ${dangXem + 1}`}
          index={dangXem}
          total={soAnh}
          onClose={() => datDangXem(null)}
          onPrev={() => datDangXem(v => (v - 1 + soAnh) % soAnh)}
          onNext={() => datDangXem(v => (v + 1) % soAnh)}
        />
      )}
    </div>
  );
}
