import React, { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Images } from 'lucide-react';
import SmartImage from '../SmartImage';

/**
 * Danh sách thương hiệu trong CMS.
 *
 * Trước đây là lưới thẻ lớn: mỗi brand một thẻ có ảnh bìa, mấy nhãn, đoạn ghi
 * chú, rồi một hàng nút ở đáy — 11 brand là 22 ảnh và 57 cái nút, phải cuộn một
 * quãng dài mới hết. Muốn tìm một brand thì mắt phải đọc từng thẻ.
 *
 * Giờ mỗi brand một hàng: logo — tên — năm — số ảnh — sửa/xoá. Logo mới là thứ
 * nhận ra ngay, nên để nó dẫn đầu. Cả danh sách gọn trong một màn hình.
 *
 * Kéo hàng để đổi thứ tự, giống bên ảnh dự án và cụm ảnh xoay.
 */
export default function DanhSachBrand({ danhSach, onThem, onSua, onXoa, onDoiThuTu }) {
  const ds = Array.isArray(danhSach) ? danhSach : [];

  const gocKeo = useRef(null);
  const [keo, datKeo] = useState(null);

  const veKeo = () => {
    const g = gocKeo.current;
    if (!g) return;
    g.rafId = 0;

    if (!g.daKeo) return;
    if (g.el) g.el.style.transform = `translateY(${g.y - g.y0}px)`;

  };

  const dangKeo = (e) => {
    const g = gocKeo.current;
    if (!g) return;
    g.x = e.clientX;
    g.y = e.clientY;

    // Ngưỡng "đã bắt đầu kéo" phải tính NGAY Ở ĐÂY, không để trong vòng lặp vẽ.
    // Vòng lặp vẽ chạy bằng requestAnimationFrame, mà cái đó bị trình duyệt hãm
    // lại khi tab không được nhìn hoặc máy đang tiết kiệm pin — hãm thì cú kéo
    // không bao giờ được ghi nhận, kéo mấy cũng không đổi chỗ.
    // Vòng lặp vẽ giờ chỉ lo phần nhìn thấy: dịch cái hàng theo tay.
    if (!g.daKeo && (Math.abs(g.y - g.y0) >= 6 || Math.abs(g.x - g.x0) >= 6)) {
      g.daKeo = true;
      if (g.el) {
        g.el.style.transition = 'none';
        g.el.style.pointerEvents = 'none';
        g.el.style.zIndex = '30';
      }
      datKeo({ tu: g.tu, dich: null });
    }

    // Ô đích cũng đọc ngay, vì nó quyết định kết quả chứ không phải hình ảnh.
    if (g.daKeo) {
      const duoi = document.elementFromPoint(g.x, g.y);
      const o = duoi?.closest?.('[data-brand-idx]');
      const dich = o ? Number(o.dataset.brandIdx) : null;
      if (dich !== g.dich) {
        g.dich = dich;
        datKeo({ tu: g.tu, dich });
      }
    }

    if (!g.rafId) g.rafId = requestAnimationFrame(veKeo);
  };

  const thaTay = (e) => {
    const g = gocKeo.current;
    if (g && e && typeof e.clientX === 'number') { g.x = e.clientX; g.y = e.clientY; }
    gocKeo.current = null;
    datKeo(null);
    if (!g) return;

    if (g.rafId) cancelAnimationFrame(g.rafId);
    window.removeEventListener('pointermove', g.move);
    window.removeEventListener('pointerup', g.up);
    window.removeEventListener('pointercancel', g.up);

    // Đọc ô đích ngay lúc buông, không dùng ô của khung hình cuối cùng kịp vẽ —
    // kéo nhanh rồi thả thì khung cuối có thể chưa chạy.
    let dich = g.dich;
    if (g.daKeo) {
      const duoi = document.elementFromPoint(g.x, g.y);
      const o = duoi?.closest?.('[data-brand-idx]');
      if (o) dich = Number(o.dataset.brandIdx);
    }
    if (g.el) {
      g.el.style.transform = '';
      g.el.style.transition = '';
      g.el.style.pointerEvents = '';
      g.el.style.zIndex = '';
    }
    if (g.daKeo && dich != null && dich !== g.tu) onDoiThuTu(g.tu, dich);
  };

  const batDauKeo = (e, idx) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('[data-khong-keo]')) return;
    const move = dangKeo, up = thaTay;
    gocKeo.current = {
      tu: idx, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      daKeo: false, dich: null, rafId: 0, el: e.currentTarget, move, up,
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <section className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h3 className="text-sm sm:text-base font-display font-bold text-white">
            Danh sách thương hiệu
          </h3>
          <p className="text-[11px] font-mono text-white/50 mt-0.5">
            {ds.length} brand · giữ và kéo để đổi thứ tự
          </p>
        </div>
        <button
          type="button"
          onClick={onThem}
          className="px-4 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm brand</span>
        </button>
      </div>

      {ds.length === 0 ? (
        <div
          onClick={onThem}
          className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
        >
          <Plus className="w-8 h-8 text-[#C3EA39] mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-display font-bold text-white text-sm">Chưa có brand nào</p>
          <p className="text-xs text-white/40 mt-1 font-mono">Bấm để thêm brand đầu tiên</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {ds.map((b, idx) => {
            const dangNhac = keo?.tu === idx;
            const laDich = keo?.dich === idx && keo?.tu !== idx;
            const soAnh = Array.isArray(b.gallery) ? b.gallery.length : 0;
            const anh = b.logo || b.coverImage;

            return (
              <div
                key={b.id || idx}
                data-brand-idx={idx}
                onPointerDown={(e) => batDauKeo(e, idx)}
                className={`relative flex items-center gap-3 p-2 pr-2.5 rounded-xl border bg-black/40 cursor-grab active:cursor-grabbing touch-none transition-colors ${
                  dangNhac
                    ? 'border-[#C3EA39] opacity-60'
                    : laDich
                      ? 'border-[#C3EA39] bg-[#C3EA39]/5'
                      : 'border-white/10 hover:border-white/25'
                }`}
              >
                <GripVertical className="w-4 h-4 text-white/25 shrink-0" />

                {/* Logo — thứ nhận ra brand nhanh nhất, nên để dẫn đầu. */}
                <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {anh ? (
                    <SmartImage
                      src={anh}
                      sizes="44px"
                      alt={b.clientName || ''}
                      draggable={false}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-[10px] font-mono text-white/30">—</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-display font-bold text-white truncate">
                    {b.clientName || 'Chưa có tên'}
                  </p>
                  <p className="text-[11px] font-mono text-white/40 truncate">
                    {[b.year, b.service].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>

                <span className="hidden sm:flex items-center gap-1 shrink-0 text-[11px] font-mono text-white/40 px-2">
                  <Images className="w-3.5 h-3.5" />
                  {soAnh}
                </span>

                <button
                  type="button"
                  data-khong-keo
                  onClick={() => onSua(b)}
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-[#C3EA39] text-white/70 hover:text-black transition-colors cursor-pointer"
                  title="Sửa brand này"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-khong-keo
                  onClick={() => onXoa(b.id)}
                  className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-red-500 text-white/50 hover:text-white transition-colors cursor-pointer"
                  title="Xoá brand này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
