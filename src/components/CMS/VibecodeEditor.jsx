import React, { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, ArrowUpRight, Code2, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';

/**
 * Khối riêng của mục "Ứng dụng tự viết": logo và link tải.
 *
 * Mấy ô CHỮ (tên app, diễn giải, chữ nút) không nằm ở đây — chúng đã khai trong
 * `truongNoiDung.js` và CMSPage dựng chung một kiểu. Ở đây chỉ còn hai thứ cần
 * giao diện riêng: nút tải ảnh lên và ô dán link.
 *
 * Trạng thái form nằm ở CMSPage, giống ProfileEditor: cả trang CMS chỉ có MỘT
 * bản nháp hồ sơ và MỘT nút lưu.
 */
export default function VibecodeEditor({ formData, setFormData }) {
  const logoInputRef = useRef(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState('');

  const logo = formData.vibecodeLogo || '';

  // Cố ý KHÔNG mở khung cắt ảnh như ảnh chân dung: logo app có tỉ lệ riêng của
  // nó (vuông, tròn, chữ nhật ngang đều có), ép vào một khung cố định là méo.
  // Ngoài trang dùng `object-contain` nên tỉ lệ nào cũng nằm gọn.
  const taiLogoLen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoi('');
    if (!file.type.startsWith('image/')) {
      setLoi('Chỉ nhận file ảnh');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    setDangTai(true);
    const cu = logo;
    try {
      const res = await optimizeAndUploadToR2(file, 'profile');
      if (!res?.url) throw new Error('Tải lên thất bại');
      setFormData(prev => ({ ...prev, vibecodeLogo: res.url }));
      // Xoá logo cũ SAU khi cái mới đã lên, không phải trước — hỏng giữa chừng
      // thì vẫn còn cái cũ để dùng.
      if (cu && cu !== res.url) deleteFromR2(cu);
    } catch (err) {
      setLoi(err.message || 'Tải logo thất bại');
    } finally {
      setDangTai(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // ---- Ảnh chụp màn hình app ----
  const anhInputRef = useRef(null);
  const [dangTaiAnh, setDangTaiAnh] = useState(false);
  const [loiAnh, setLoiAnh] = useState('');

  const anh = Array.isArray(formData.vibecodeGallery) ? formData.vibecodeGallery : [];

  const themAnh = async (files) => {
    const chonDuoc = files.filter(f => f.type.startsWith('image/'));
    if (!chonDuoc.length) return;

    setLoiAnh('');
    setDangTaiAnh(true);
    try {
      const ketQua = await Promise.all(chonDuoc.map(f => optimizeAndUploadToR2(f, 'profile')));
      const diaChiMoi = ketQua.filter(r => r && r.url).map(r => r.url);
      if (diaChiMoi.length) {
        // Ảnh mới nối vào ĐUÔI chứ không chen lên đầu: đây là ảnh minh hoạ app,
        // thứ tự kể chuyện do người viết sắp, thêm tấm mới không có lý do gì để
        // nó nhảy lên trước mấy tấm đã sắp xong.
        setFormData(prev => ({
          ...prev,
          vibecodeGallery: [...(Array.isArray(prev.vibecodeGallery) ? prev.vibecodeGallery : []), ...diaChiMoi],
        }));
      }
    } catch (err) {
      setLoiAnh('Tải ảnh thất bại: ' + (err.message || ''));
    } finally {
      setDangTaiAnh(false);
    }
  };

  const chonAnh = async (e) => {
    await themAnh(Array.from(e.target.files || []));
    if (anhInputRef.current) anhInputRef.current.value = '';
  };

  const boAnh = (idx) => {
    const bo = anh[idx];
    if (bo) deleteFromR2(bo);
    setFormData(prev => ({
      ...prev,
      vibecodeGallery: (prev.vibecodeGallery || []).filter((_, i) => i !== idx),
    }));
  };

  const doiCho = (idx, huong) => {
    const dich = huong === 'trai' ? idx - 1 : idx + 1;
    setFormData(prev => {
      const ds = [...(prev.vibecodeGallery || [])];
      if (dich < 0 || dich >= ds.length) return prev;
      const [nhac] = ds.splice(idx, 1);
      ds.splice(dich, 0, nhac);
      return { ...prev, vibecodeGallery: ds };
    });
  };

  const xoaLogo = () => {
    if (logo) deleteFromR2(logo);
    setFormData(prev => ({ ...prev, vibecodeLogo: '' }));
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
      <div className="pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-display font-bold text-white">Logo & link tải</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">

        {/* Logo */}
        <div className="sm:col-span-5 space-y-1">
          <label className="text-xs font-mono text-white/70 uppercase block">Logo ứng dụng</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center shrink-0">
              {logo
                ? <img src={logo} alt="Logo ứng dụng" className="w-full h-full object-contain" />
                : <Code2 className="w-6 h-6 text-white/25" />}
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                onChange={taiLogoLen}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={dangTai}
                className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {dangTai
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang tải...</span></>
                  : <><Upload className="w-3.5 h-3.5" /><span>{logo ? 'Đổi logo' : 'Tải logo lên'}</span></>}
              </button>

              {logo && (
                <button
                  type="button"
                  onClick={xoaLogo}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-white/50 hover:text-red-400 hover:border-red-400/40 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bỏ logo</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] font-mono text-white/40 pt-1">
            Nền trong suốt (PNG) là đẹp nhất. Tỉ lệ nào cũng được, không bị cắt.
          </p>
        </div>

        {/* Link tải */}
        <div className="sm:col-span-7 space-y-1">
          <label className="text-xs font-mono text-white/70 uppercase block">Link nút tải</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="url"
              value={formData.vibecodeUrl || ''}
              placeholder="https://github.com/ten/repo/releases/latest"
              onChange={(e) => setFormData(prev => ({ ...prev, vibecodeUrl: e.target.value }))}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm font-mono"
            />
            {formData.vibecodeUrl && (
              <a
                href={formData.vibecodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở thử link tải trong tab mới"
                className="p-2 rounded-xl border border-white/10 text-white/50 hover:text-[#C3EA39] hover:border-[#C3EA39]/40 transition-colors shrink-0"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>
          <p className="text-[11px] font-mono text-white/40 pt-1">
            Dùng <span className="text-white/60">/releases/latest</span> thì ra bản mới
            chỉ cần đăng release trên GitHub, không phải vào đây sửa lại.
          </p>
        </div>

      </div>

      {loi && <p className="text-xs font-mono text-red-400">{loi}</p>}

      {/* Ảnh chụp màn hình app */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="text-xs font-mono text-white/70 uppercase">
            Ảnh chụp app {anh.length > 0 && <span className="text-[#C3EA39]">({anh.length})</span>}
          </label>

          <input
            type="file"
            ref={anhInputRef}
            accept="image/*"
            multiple
            onChange={chonAnh}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => anhInputRef.current?.click()}
            disabled={dangTaiAnh}
            className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {dangTaiAnh
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang tải...</span></>
              : <><ImagePlus className="w-3.5 h-3.5" /><span>Thêm ảnh</span></>}
          </button>
        </div>

        {anh.length === 0 ? (
          <p className="text-[11px] font-mono text-white/40">
            Chọn được nhiều tấm một lúc. Chưa có tấm nào thì cụm ảnh không hiện ngoài trang.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {anh.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/60"
                >
                  <img src={url} alt={`Ảnh app ${idx + 1}`} className="w-full h-full object-cover" />

                  {/* Số thứ tự — ngoài trang ảnh xếp đúng theo thứ tự này */}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-mono text-white/80">
                    {idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => boAnh(idx)}
                    aria-label={`Xoá ảnh ${idx + 1}`}
                    className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/75 text-white/70 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <div className="absolute bottom-1 inset-x-1 flex justify-between">
                    <button
                      type="button"
                      onClick={() => doiCho(idx, 'trai')}
                      disabled={idx === 0}
                      aria-label={`Đưa ảnh ${idx + 1} lên trước`}
                      className="w-6 h-6 rounded-md bg-black/75 text-white/70 hover:bg-[#C3EA39] hover:text-black flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default disabled:hover:bg-black/75 disabled:hover:text-white/70"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => doiCho(idx, 'phai')}
                      disabled={idx === anh.length - 1}
                      aria-label={`Đưa ảnh ${idx + 1} xuống sau`}
                      className="w-6 h-6 rounded-md bg-black/75 text-white/70 hover:bg-[#C3EA39] hover:text-black flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default disabled:hover:bg-black/75 disabled:hover:text-white/70"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-mono text-white/40">
              Xoá ở đây là xoá luôn khỏi kho R2, không lấy lại được.
            </p>
          </>
        )}

        {loiAnh && <p className="text-xs font-mono text-red-400">{loiAnh}</p>}
      </div>
    </div>
  );
}
