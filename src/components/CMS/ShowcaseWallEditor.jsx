import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Boxes, GripVertical } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';
import SmartImage from '../SmartImage';
import NutTaiAnh from './NutTaiAnh';

/**
 * Khối quản lý TƯỜNG ẢNH 3D ở mục 01.
 *
 * Chỗ này thay cho "Tùm lum tà la" cũ: một khung vuông, ảnh tự đổi 7 giây một
 * lần, xem thụ động. Giờ là cụm ảnh kéo xoay được.
 *
 * Đây là danh sách ảnh rời, không dính gì tới dự án nào.
 *
 * Thứ tự trong danh sách là thứ tự các tấm chạy quanh vòng, nên kéo để sắp lại
 * là có ý nghĩa: hai tấm cạnh nhau trong danh sách sẽ nằm cạnh nhau trên vòng.
 */
export default function ShowcaseWallEditor({ items, onChange }) {
  const danhSach = Array.isArray(items) ? items : [];

  const fileRef = useRef(null);
  const [dangTai, datDangTai] = useState(false);
  const [loi, datLoi] = useState('');
  const [dangKeoFile, datDangKeoFile] = useState(false);
  const doSauKeo = useRef(0);

  // ---- Thêm ảnh ----------------------------------------------------------
  const themAnh = async (files) => {
    const anh = files.filter(f => f.type.startsWith('image/'));
    if (!anh.length) return;

    datLoi('');
    datDangTai(true);
    try {
      const ketQua = await Promise.all(anh.map(f => optimizeAndUploadToR2(f, 'showcase_wall')));
      const moi = ketQua
        .filter(r => r && r.url)
        .map((r, i) => ({
          id: `wall-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          image: r.url,
          title: '',
        }));
      // Ảnh mới lên đầu, giống mọi chỗ khác trong CMS.
      if (moi.length) onChange([...moi, ...danhSach]);
    } catch (err) {
      console.error(err);
      datLoi('Tải ảnh thất bại: ' + err.message);
    } finally {
      datDangTai(false);
    }
  };

  const chonFile = async (e) => {
    await themAnh(Array.from(e.target.files || []));
    if (fileRef.current) fileRef.current.value = '';
  };

  const themBangUrl = () => {
    const url = window.prompt('Dán đường dẫn ảnh:');
    if (!url || !url.trim()) return;
    onChange([
      { id: `wall-${Date.now()}`, image: url.trim(), title: '' },
      ...danhSach,
    ]);
  };

  const xoaAnh = (idx) => {
    const it = danhSach[idx];
    if (!window.confirm('Gỡ tấm này khỏi tường ảnh?')) return;
    if (it?.image) deleteFromR2(it.image);
    onChange(danhSach.filter((_, i) => i !== idx));
  };

  const doiTen = (idx, giaTri) => {
    onChange(danhSach.map((it, i) => (i === idx ? { ...it, title: giaTri } : it)));
  };

  // ---- Kéo thả FILE vào khung -------------------------------------------
  const laFile = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const vaoVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    doSauKeo.current += 1;
    datDangKeoFile(true);
  };
  const trenVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const roiVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    doSauKeo.current -= 1;
    if (doSauKeo.current <= 0) {
      doSauKeo.current = 0;
      datDangKeoFile(false);
    }
  };
  const thaVao = async (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    doSauKeo.current = 0;
    datDangKeoFile(false);
    await themAnh(Array.from(e.dataTransfer.files || []));
  };

  // ---- Kéo để sắp xếp ----------------------------------------------------
  // Pointer event chứ không phải drag-and-drop của HTML: khối này đã là vùng
  // thả FILE rồi, hai hệ sự kiện lồng nhau sẽ đá nhau.
  // Vị trí ghi thẳng vào style.transform, state chỉ đổi khi ô đích đổi.
  const gocKeo = useRef(null);
  const [keo, datKeo] = useState(null);

  const doiCho = (tu, dich) => {
    if (tu === dich || dich == null) return;
    const ra = [...danhSach];
    const [lay] = ra.splice(tu, 1);
    ra.splice(dich, 0, lay);
    onChange(ra);
  };

  const veKeo = () => {
    const g = gocKeo.current;
    if (!g) return;
    g.rafId = 0;

    const dx = g.x - g.x0;
    const dy = g.y - g.y0;

    if (!g.daKeo) {
      if (Math.hypot(dx, dy) < 6) return;   // chưa đi đủ xa, vẫn coi là bấm
      g.daKeo = true;
      if (g.el) {
        g.el.style.transition = 'none';
        g.el.style.willChange = 'transform';
        g.el.style.pointerEvents = 'none';
      }
      datKeo({ tu: g.tu, dich: null });
    }

    if (g.el) g.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;

    const duoi = document.elementFromPoint(g.x, g.y);
    const o = duoi && duoi.closest ? duoi.closest('[data-tuong-idx]') : null;
    const dich = o ? Number(o.dataset.tuongIdx) : null;

    if (dich !== g.dich) {
      g.dich = dich;
      datKeo({ tu: g.tu, dich });
    }
  };

  const dangKeoTay = (e) => {
    const g = gocKeo.current;
    if (!g) return;
    g.x = e.clientX;
    g.y = e.clientY;
    if (!g.rafId) g.rafId = requestAnimationFrame(veKeo);
  };

  const thaTay = (e) => {
    const g = gocKeo.current;
    // Lấy nốt toạ độ của chính cú buông tay — `pointermove` cuối cùng có thể
    // đã cách đó vài pixel.
    if (g && e && typeof e.clientX === 'number') {
      g.x = e.clientX;
      g.y = e.clientY;
    }
    gocKeo.current = null;
    datKeo(null);

    if (g) {
      if (g.rafId) cancelAnimationFrame(g.rafId);
      window.removeEventListener('pointermove', g.move);
      window.removeEventListener('pointerup', g.up);
      window.removeEventListener('pointercancel', g.up);

      // Đọc lại ô đích NGAY LÚC THẢ, chứ không dùng ô của khung hình cuối cùng
      // kịp vẽ. Kéo nhanh rồi buông tay thì khung hình cuối có thể chưa chạy,
      // và tấm sẽ rơi vào ô ngay trước đó — sai một nhịp.
      // Phải đọc TRƯỚC khi trả lại pointer-events, không thì nhìn trúng chính
      // tấm đang nhấc.
      let dich = g.dich;
      if (g.daKeo) {
        const duoi = document.elementFromPoint(g.x, g.y);
        const o = duoi && duoi.closest ? duoi.closest('[data-tuong-idx]') : null;
        if (o) dich = Number(o.dataset.tuongIdx);
      }

      if (g.el) {
        g.el.style.transform = '';
        g.el.style.transition = '';
        g.el.style.willChange = '';
        g.el.style.pointerEvents = '';
      }
      if (g.daKeo && dich != null) doiCho(g.tu, dich);
    }
  };

  const batDauKeo = (e, idx) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('[data-khong-keo]')) return;

    const move = dangKeoTay, up = thaTay;
    gocKeo.current = {
      tu: idx, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      daKeo: false, dich: null, rafId: 0, el: e.currentTarget, move, up,
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div
      onDragEnter={vaoVungTha}
      onDragOver={trenVungTha}
      onDragLeave={roiVungTha}
      onDrop={thaVao}
      className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border space-y-4 sm:space-y-5 transition-colors ${
        dangKeoFile
          ? 'bg-[#C3EA39]/5 border-[#C3EA39]'
          : 'bg-[#121216] border-white/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-display font-bold text-white">
              Ảnh trên cụm xoay
            </h3>
            <p className="text-[11px] font-mono text-white/50">
              Kéo thả nhiều ảnh vào đây cũng được
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={dangTai}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] disabled:opacity-60 text-black text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer min-h-[38px]"
          >
            {dangTai
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang tải…</span></>
              : <><Upload className="w-3.5 h-3.5" /><span>Tải Ảnh</span></>}
          </button>
          <button
            type="button"
            onClick={themBangUrl}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[38px]"
            title="Dán đường dẫn ảnh có sẵn"
          >
            <span>🔗 URL</span>
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={chonFile}
        className="hidden"
      />

      {loi && (
        <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {loi}
        </p>
      )}

      {danhSach.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
        >
          <Upload className="w-8 h-8 text-[#C3EA39] mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-display font-bold text-white text-sm">Chưa có ảnh nào trên tường</p>
          <p className="text-xs text-white/40 mt-1 font-mono">
            Bấm để chọn, hoặc kéo thả nhiều ảnh vào đây
          </p>
          <p className="text-xs text-[#C3EA39]/70 mt-1 font-mono">2000 × 1260 px</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-mono text-white/40">
            {danhSach.length} ảnh · giữ và kéo để đổi thứ tự trên vòng
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {danhSach.map((it, idx) => {
              const dangNhac = keo?.tu === idx;
              const laDich = keo?.dich === idx && keo?.tu !== idx;

              return (
                <div
                  key={it.id || idx}
                  data-tuong-idx={idx}
                  onPointerDown={(e) => batDauKeo(e, idx)}
                  className={`relative rounded-xl overflow-hidden border bg-black/40 group flex flex-col shadow-lg cursor-grab active:cursor-grabbing touch-none ${
                    dangNhac
                      ? 'border-[#C3EA39] opacity-60 z-30'
                      : laDich
                        ? 'border-[#C3EA39] ring-2 ring-[#C3EA39]/40'
                        : 'border-white/10 hover:border-[#C3EA39]/40'
                  }`}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black border-b border-white/5">
                    <SmartImage
                      src={it.image}
                      sizes="(max-width: 640px) 45vw, 20vw"
                      alt={it.title || `Ảnh ${idx + 1}`}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono font-bold text-[#C3EA39] border border-white/10 z-20 flex items-center gap-1">
                      <GripVertical className="w-2.5 h-2.5" />
                      <span>{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                    </div>

                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                      <NutTaiAnh src={it.image} />
                      <button
                        type="button"
                        data-khong-keo
                        onClick={() => xoaAnh(idx)}
                        className="p-1 rounded-md bg-black/80 hover:bg-red-500 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
                        title="Gỡ khỏi tường ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2 bg-[#121216]" data-khong-keo>
                    <input
                      type="text"
                      value={it.title || ''}
                      onChange={(e) => doiTen(idx, e.target.value)}
                      placeholder="Nhãn (bỏ trống cũng được)"
                      className="w-full bg-transparent text-[11px] font-mono text-white/80 placeholder:text-white/25 outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
