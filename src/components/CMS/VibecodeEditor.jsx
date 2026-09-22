import React, { useRef, useState } from 'react';
import { Upload, Loader2, Trash2, ArrowUpRight, Code2 } from 'lucide-react';
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
    </div>
  );
}
