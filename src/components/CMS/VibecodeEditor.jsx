import React, { useRef, useState } from 'react';
import {
  Upload, Loader2, Trash2, ArrowUpRight, Code2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ImagePlus, Plus,
} from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';
import { docDanhSachAppDeSua, appRong } from '../../utils/vibecodeApps';

/**
 * Khối riêng của mục Nội dung 5: danh sách app tự viết.
 *
 * Mấy ô CHỮ của MỤC (số mục, tiêu đề mục) không nằm ở đây — chúng khai trong
 * `truongNoiDung.js` và CMSPage dựng chung một kiểu. Còn ô chữ của TỪNG APP thì
 * phải nằm đây, vì số lượng app thay đổi được nên không khai sẵn thành trường
 * cố định được.
 *
 * Trạng thái form nằm ở CMSPage, giống ProfileEditor: cả trang CMS chỉ có MỘT
 * bản nháp hồ sơ và MỘT nút lưu.
 */
export default function VibecodeEditor({ formData, setFormData }) {
  // Đọc qua hàm chung nên dữ liệu viết theo kiểu cũ (một app, các ô nằm thẳng
  // trong profile) vẫn hiện ra đúng ở đây để sửa tiếp.
  const apps = docDanhSachAppDeSua(formData);

  const ghiApps = (ds) => setFormData(prev => ({ ...prev, vibecodeApps: ds }));

  const suaApp = (idx, phan) =>
    ghiApps(apps.map((a, i) => (i === idx ? { ...a, ...phan } : a)));

  const themApp = () => ghiApps([...apps, appRong()]);

  const xoaApp = (idx) => {
    const a = apps[idx];
    // Xoá app thì dọn luôn ảnh của nó khỏi kho, không để lại rác không ai
    // tìm ra được nữa.
    if (a?.logo) deleteFromR2(a.logo);
    (a?.gallery || []).forEach(u => deleteFromR2(u));
    ghiApps(apps.filter((_, i) => i !== idx));
  };

  const doiChoApp = (idx, huong) => {
    const dich = huong === 'len' ? idx - 1 : idx + 1;
    if (dich < 0 || dich >= apps.length) return;
    const ds = [...apps];
    const [nhac] = ds.splice(idx, 1);
    ds.splice(dich, 0, nhac);
    ghiApps(ds);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm sm:text-base font-display font-bold text-white">
            Ứng dụng {apps.length > 1 && <span className="text-[#C3EA39]">({apps.length})</span>}
          </h3>
          <p className="text-[11px] font-mono text-white/50 mt-0.5">
            Mỗi app một thẻ, xếp dọc trong cùng mục này
          </p>
        </div>

        <button
          type="button"
          onClick={themApp}
          className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm app</span>
        </button>
      </div>

      {apps.map((app, idx) => (
        <MotApp
          key={app.id}
          app={app}
          thuTu={idx}
          tong={apps.length}
          sua={(phan) => suaApp(idx, phan)}
          xoa={() => xoaApp(idx)}
          doiCho={(huong) => doiChoApp(idx, huong)}
        />
      ))}
    </div>
  );
}

/** Một app trong danh sách: ô chữ, logo, link tải, ảnh chụp. */
function MotApp({ app, thuTu, tong, sua, xoa, doiCho }) {
  const logoInputRef = useRef(null);
  const anhInputRef = useRef(null);
  const [dangTaiLogo, setDangTaiLogo] = useState(false);
  const [dangTaiAnh, setDangTaiAnh] = useState(false);
  const [loi, setLoi] = useState('');
  const [hoiXoa, setHoiXoa] = useState(false);

  const anh = app.gallery;

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
    setDangTaiLogo(true);
    const cu = app.logo;
    try {
      const res = await optimizeAndUploadToR2(file, 'profile');
      if (!res?.url) throw new Error('Tải lên thất bại');
      sua({ logo: res.url });
      // Xoá logo cũ SAU khi cái mới đã lên, không phải trước — hỏng giữa chừng
      // thì vẫn còn cái cũ để dùng.
      if (cu && cu !== res.url) deleteFromR2(cu);
    } catch (err) {
      setLoi(err.message || 'Tải logo thất bại');
    } finally {
      setDangTaiLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const themAnh = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setLoi('');
    setDangTaiAnh(true);
    try {
      const ketQua = await Promise.all(files.map(f => optimizeAndUploadToR2(f, 'profile')));
      const moi = ketQua.filter(r => r && r.url).map(r => r.url);
      // Ảnh mới nối vào ĐUÔI chứ không chen lên đầu: đây là ảnh minh hoạ app,
      // thứ tự kể chuyện do người viết sắp, thêm tấm mới không có lý do gì để
      // nó nhảy lên trước mấy tấm đã sắp xong.
      if (moi.length) sua({ gallery: [...anh, ...moi] });
    } catch (err) {
      setLoi('Tải ảnh thất bại: ' + (err.message || ''));
    } finally {
      setDangTaiAnh(false);
      if (anhInputRef.current) anhInputRef.current.value = '';
    }
  };

  const boAnh = (i) => {
    const bo = anh[i];
    if (bo) deleteFromR2(bo);
    sua({ gallery: anh.filter((_, j) => j !== i) });
  };

  const doiChoAnh = (i, huong) => {
    const dich = huong === 'trai' ? i - 1 : i + 1;
    if (dich < 0 || dich >= anh.length) return;
    const ds = [...anh];
    const [nhac] = ds.splice(i, 1);
    ds.splice(dich, 0, nhac);
    sua({ gallery: ds });
  };

  const oChu = 'w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm';
  const nhan = 'text-xs font-mono text-white/70 uppercase block';
  const nutNho = 'w-6 h-6 rounded-md bg-black/75 text-white/70 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default';

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">

      {/* Đầu thẻ: số thứ tự + nút xếp lại + nút xoá */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
            {thuTu + 1}
          </div>
          <span className="text-sm font-display font-bold text-white truncate">
            {app.name || 'App chưa đặt tên'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {tong > 1 && (
            <>
              <button
                type="button"
                onClick={() => doiCho('len')}
                disabled={thuTu === 0}
                aria-label={`Đưa app ${thuTu + 1} lên trên`}
                className={`${nutNho} hover:bg-[#C3EA39] hover:text-black`}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => doiCho('xuong')}
                disabled={thuTu === tong - 1}
                aria-label={`Đưa app ${thuTu + 1} xuống dưới`}
                className={`${nutNho} hover:bg-[#C3EA39] hover:text-black`}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Hỏi lại trước khi xoá: xoá app là xoá luôn logo và toàn bộ ảnh của
              nó khỏi kho, không lấy lại được. */}
          {hoiXoa ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={xoa}
                className="px-2.5 py-1 rounded-md bg-red-500 text-white font-mono text-[11px] font-bold cursor-pointer"
              >
                Xoá thật
              </button>
              <button
                type="button"
                onClick={() => setHoiXoa(false)}
                className="px-2.5 py-1 rounded-md border border-white/15 text-white/60 font-mono text-[11px] cursor-pointer"
              >
                Thôi
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHoiXoa(true)}
              aria-label={`Xoá app ${thuTu + 1}`}
              className={`${nutNho} hover:bg-red-500 hover:text-white`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ô chữ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="space-y-1">
          <label className={nhan}>Tên ứng dụng</label>
          <input
            type="text"
            value={app.name}
            placeholder="Tên app của bạn"
            onChange={(e) => sua({ name: e.target.value })}
            className={`${oChu} font-bold`}
          />
        </div>
        <div className="space-y-1">
          <label className={nhan}>Một dòng ngắn dưới tên</label>
          <input
            type="text"
            value={app.tagline}
            placeholder="Viết cho vui, xài thiệt"
            onChange={(e) => sua({ tagline: e.target.value })}
            className={oChu}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className={nhan}>Diễn giải app</label>
        <textarea
          rows={4}
          value={app.desc}
          placeholder="App này làm gì, cho ai, hay ở chỗ nào…"
          onChange={(e) => sua({ desc: e.target.value })}
          className={`${oChu} resize-y`}
        />
      </div>

      {/* Logo + link tải */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
        <div className="sm:col-span-5 space-y-1">
          <label className={nhan}>Logo ứng dụng</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center shrink-0">
              {app.logo
                ? <img src={app.logo} alt="Logo ứng dụng" className="w-full h-full object-contain" />
                : <Code2 className="w-6 h-6 text-white/25" />}
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <input type="file" ref={logoInputRef} accept="image/*" onChange={taiLogoLen} className="hidden" />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={dangTaiLogo}
                className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {dangTaiLogo
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang tải...</span></>
                  : <><Upload className="w-3.5 h-3.5" /><span>{app.logo ? 'Đổi logo' : 'Tải logo lên'}</span></>}
              </button>

              {app.logo && (
                <button
                  type="button"
                  onClick={() => { deleteFromR2(app.logo); sua({ logo: '' }); }}
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

        <div className="sm:col-span-7 space-y-3.5">
          <div className="space-y-1">
            <label className={nhan}>Link nút tải</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="url"
                value={app.url}
                placeholder="https://github.com/ten/repo/releases/latest"
                onChange={(e) => sua({ url: e.target.value })}
                className={`${oChu} font-mono`}
              />
              {app.url && (
                <a
                  href={app.url}
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

          <div className="space-y-1">
            <label className={nhan}>Chữ trên nút tải</label>
            <input
              type="text"
              value={app.buttonText}
              placeholder="TẢI VỀ"
              onChange={(e) => sua({ buttonText: e.target.value })}
              className={oChu}
            />
          </div>
        </div>
      </div>

      {/* Ảnh chụp app */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className={nhan}>
            Ảnh chụp app {anh.length > 0 && <span className="text-[#C3EA39]">({anh.length})</span>}
          </label>

          <input type="file" ref={anhInputRef} accept="image/*" multiple onChange={themAnh} className="hidden" />
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
            Chọn được nhiều tấm một lúc. Ngoài trang bày 3 ô, dư ra thì ô thứ ba hiện “+số còn lại”.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {anh.map((url, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/60">
                  <img src={url} alt={`Ảnh app ${i + 1}`} className="w-full h-full object-cover" />

                  {/* Số thứ tự — ba ô đầu là ba ô hiện ra ngoài trang */}
                  <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    i < 3 ? 'bg-[#C3EA39] text-black font-bold' : 'bg-black/75 text-white/70'
                  }`}>
                    {i + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => boAnh(i)}
                    aria-label={`Xoá ảnh ${i + 1}`}
                    className={`absolute top-1 right-1 ${nutNho} hover:bg-red-500 hover:text-white`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <div className="absolute bottom-1 inset-x-1 flex justify-between">
                    <button
                      type="button"
                      onClick={() => doiChoAnh(i, 'trai')}
                      disabled={i === 0}
                      aria-label={`Đưa ảnh ${i + 1} lên trước`}
                      className={`${nutNho} hover:bg-[#C3EA39] hover:text-black`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => doiChoAnh(i, 'phai')}
                      disabled={i === anh.length - 1}
                      aria-label={`Đưa ảnh ${i + 1} xuống sau`}
                      className={`${nutNho} hover:bg-[#C3EA39] hover:text-black`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-mono text-white/40">
              Ba ô đánh dấu xanh là ba ô hiện ngoài trang. Xoá ở đây là xoá luôn khỏi kho R2.
            </p>
          </>
        )}
      </div>

      {loi && <p className="text-xs font-mono text-red-400">{loi}</p>}
    </div>
  );
}
