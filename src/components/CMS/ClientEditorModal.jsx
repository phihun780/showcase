import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Check, Loader2, Building2, Calendar, MessageSquareQuote, Layers, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import SmartImage from '../SmartImage';

/**
 * Form một brand. Chỉ có tên, năm, mô tả, logo và ảnh — phần còn lại là để
 * khoe thiết kế, không phải để khai lý lịch brand.
 *
 * Mấy ô đã gỡ khỏi form (`service`, `link`, `featured`) vẫn được bê nguyên qua
 * lúc lưu. Không hiện ra nữa nhưng cũng không xoá khỏi kho — cần dùng lại thì
 * dữ liệu vẫn còn đó.
 */

// Nạp dữ liệu của brand vào form.
//
// `note` trống mà `service` có chữ thì lấy `service` đổ sang: hai ô đó gộp làm
// một ô "Mô tả", không bê qua thì chữ đang hiển thị ngoài trang tự dưng mất.
function napForm(client) {
  return {
    id: client?.id || '',
    clientName: client?.clientName || '',
    year: client?.year || `${new Date().getFullYear()}`,
    note: client?.note || client?.service || '',
    logo: client?.logo || '',
    coverImage: client?.coverImage || '',
    gallery: Array.isArray(client?.gallery) ? client.gallery : [],
    // Không có ô nhập, chỉ giữ chỗ cho khỏi mất khi lưu
    service: client?.service || '',
    link: client?.link || '',
    featured: Boolean(client?.featured),
  };
}

export default function ClientEditorModal({ client, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(() => napForm(client));

  // Nạp lại mỗi lần mở form.
  //
  // useState(() => ...) ở trên chỉ chạy ĐÚNG MỘT LẦN lúc mount. Modal này không
  // bị gỡ khi đóng, nên lần đầu nó chụp client = null rồi giữ mãi trạng thái
  // rỗng đó — bấm "Sửa" brand nào cũng ra form trắng. Lưu là mất sạch.
  useEffect(() => {
    if (!isOpen) return;
    setFormData(napForm(client));
    // Cố ý chỉ nghe id: nạp lại khi MỞ form hoặc khi đổi sang brand khác. Nghe
    // cả `client` thì mỗi lần dữ liệu được dựng lại là form bị nạp đè, đang gõ
    // dở cũng mất.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client?.id]);

  // Thả trượt tay ra ngoài khung thì trình duyệt mở thẳng file đó, rời khỏi
  // trang, mất sạch những gì đang gõ dở. Chặn lại khi form đang mở.
  useEffect(() => {
    if (!isOpen) return;
    const chan = (e) => e.preventDefault();
    window.addEventListener('dragover', chan);
    window.addEventListener('drop', chan);
    return () => {
      window.removeEventListener('dragover', chan);
      window.removeEventListener('drop', chan);
    };
  }, [isOpen]);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dangKeo, setDangKeo] = useState(false);
  const doSauKeo = useRef(0);

  // Kéo một tấm sang chỗ khác. `gocKeo` giữ trạng thái thật, `keo` chỉ để vẽ.
  const gocKeo = useRef(null);
  const [keo, setKeo] = useState(null);

  const logoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setIsUploadingLogo(true);

    try {
      const res = await optimizeAndUploadToR2(file, 'clients/logos');
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, logo: res.url }));
      } else {
        throw new Error(res?.error || 'Tải logo thất bại');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Tải logo thất bại: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Dùng chung cho cả bấm nút chọn file lẫn kéo thả.
  const themAnh = async (files) => {
    const anh = files.filter(f => f.type.startsWith('image/'));
    if (!anh.length) return;

    setUploadError('');
    setIsUploadingGallery(true);

    try {
      const results = await Promise.all(anh.map(f => optimizeAndUploadToR2(f, 'clients/gallery')));
      const newUrls = results.filter(r => r && r.url).map(r => r.url);

      if (newUrls.length > 0) {
        // Ảnh mới lên ĐẦU danh sách, không nối vào đuôi: mới up thì phải thấy
        // ngay, cả trong form lẫn ngoài bài viết.
        setFormData(prev => ({
          ...prev,
          coverImage: newUrls[0],
          gallery: [...newUrls, ...(prev.gallery || [])],
        }));
      }
    } catch (err) {
      console.error(err);
      setUploadError('Tải ảnh thất bại: ' + err.message);
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleUploadGalleryFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    await themAnh(files);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // Chỉ sáng lên khi thứ đang kéo là FILE. Kéo một đoạn chữ hay một tấm ảnh từ
  // tab khác thì khung không nháy vô ích.
  const laFile = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  const vaoVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    // Đếm vào/ra thay vì bật tắt thẳng: rê qua mấy tấm ảnh con bên trong là
    // trình duyệt bắn dragleave, không đếm thì khung nhấp nháy liên tục.
    doSauKeo.current += 1;
    setDangKeo(true);
  };

  const trenVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();          // không chặn thì trình duyệt từ chối cho thả
    e.dataTransfer.dropEffect = 'copy';
  };

  const roiVungTha = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    doSauKeo.current -= 1;
    if (doSauKeo.current <= 0) {
      doSauKeo.current = 0;
      setDangKeo(false);
    }
  };

  const thaVao = (e) => {
    if (!laFile(e)) return;
    e.preventDefault();
    doSauKeo.current = 0;
    setDangKeo(false);
    themAnh(Array.from(e.dataTransfer.files || []));
  };

  const handleRemoveGalleryItem = (index) => {
    setFormData(prev => {
      const hienTai = prev.gallery || [];
      const bo = hienTai[index];
      const conLai = hienTai.filter((_, i) => i !== index);
      return {
        ...prev,
        coverImage: prev.coverImage === bo ? (conLai[0] || '') : prev.coverImage,
        gallery: conLai,
      };
    });
  };

  // Nhấc tấm ở `tu` ra rồi thả vào vị trí `dich`. Thứ tự này quyết định ảnh nào
  // nằm trước trong bài viết.
  //
  // Đặt lại `coverImage` theo tấm đầu: ảnh bìa vẫn luôn là tấm đứng đầu danh
  // sách, không thì lưu xong thứ tự lại lệch đi một nhịp.
  const doiChoAnh = (tu, dich) => {
    setFormData(prev => {
      const ds = [...(prev.gallery || [])];
      if (tu < 0 || tu >= ds.length || dich < 0 || dich >= ds.length || tu === dich) return prev;
      const [nhac] = ds.splice(tu, 1);
      ds.splice(dich, 0, nhac);
      return { ...prev, gallery: ds, coverImage: ds[0] || prev.coverImage };
    });
  };

  const handleMoveGalleryItem = (index, huong) => {
    doiChoAnh(index, huong === 'left' ? index - 1 : index + 1);
  };

  // Kéo tay để đổi chỗ — nhanh hơn bấm mũi tên từng nấc.
  //
  // Dùng pointer event chứ không dùng drag-and-drop của HTML: khối ảnh này đã
  // là vùng thả FILE rồi, hai hệ sự kiện lồng nhau thì rất dễ đá nhau. Pointer
  // event cũng chạy được cả chuột lẫn cảm ứng.
  // Ghi transform THẲNG vào DOM, không qua state.
  //
  // Bản trước gọi setKeo mỗi lần nhích chuột, mà một lần nhích là React vẽ lại
  // cả form kèm toàn bộ ô ảnh — kéo thì giật. Giờ vị trí do tay viết vào
  // `style.transform` (chỉ động tới compositor, không tính lại layout), còn
  // state chỉ đổi khi ô ĐÍCH đổi, tức là vài lần một cú kéo.
  const veKeo = () => {
    const g = gocKeo.current;
    if (!g) return;
    g.rafId = 0;

    const dx = g.x - g.x0;
    const dy = g.y - g.y0;

    if (!g.daKeo) {
      // Chưa đi đủ xa thì vẫn coi là một cú bấm, chưa phải kéo.
      if (Math.hypot(dx, dy) < 6) return;
      g.daKeo = true;
      if (g.el) {
        g.el.style.transition = 'none';
        g.el.style.willChange = 'transform';
      }
      setKeo({ tu: g.tu, dich: null });
    }

    if (g.el) g.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;

    // Tấm đang nhấc được đặt `pointer-events: none` nên chỗ này nhìn xuyên qua
    // nó, thấy đúng tấm nằm dưới con trỏ.
    const duoi = document.elementFromPoint(g.x, g.y);
    const o = duoi && duoi.closest ? duoi.closest('[data-anh-idx]') : null;
    const dich = o ? Number(o.dataset.anhIdx) : null;

    if (dich !== g.dich) {
      g.dich = dich;
      setKeo({ tu: g.tu, dich });      // chỉ vẽ lại khi đích đổi
    }
  };

  const dangKeoTay = (e) => {
    const g = gocKeo.current;
    if (!g) return;
    g.x = e.clientX;
    g.y = e.clientY;
    // Gộp nhiều lần nhích vào một khung hình.
    if (!g.rafId) g.rafId = requestAnimationFrame(veKeo);
  };

  const thaTay = () => {
    const g = gocKeo.current;
    gocKeo.current = null;
    setKeo(null);

    // Gỡ ĐÚNG hai hàm đã gắn lúc bấm xuống. Mỗi lần vẽ lại là một bộ hàm mới,
    // mà kéo thì vẽ lại liên tục — gỡ bằng hàm của lần vẽ hiện tại thì trật,
    // listener cũ nằm lại trên window mãi.
    if (g) {
      if (g.rafId) cancelAnimationFrame(g.rafId);
      window.removeEventListener('pointermove', g.move);
      window.removeEventListener('pointerup', g.up);
      window.removeEventListener('pointercancel', g.up);
      if (g.el) {
        g.el.style.transform = '';
        g.el.style.transition = '';
        g.el.style.willChange = '';
      }
    }

    if (g && g.daKeo && g.dich != null) doiChoAnh(g.tu, g.dich);
  };

  const batDauKeo = (e, idx) => {
    if (e.button != null && e.button !== 0) return;          // chỉ chuột trái
    if (e.target.closest('[data-khong-keo]')) return;        // bấm nút thì thôi

    const move = dangKeoTay, up = thaTay;
    gocKeo.current = {
      tu: idx, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      daKeo: false, dich: null, rafId: 0, el: e.currentTarget, move, up,
    };
    // Nghe trên window để kéo ra ngoài khối ảnh vẫn theo dõi được.
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      setUploadError('Chưa có tên thương hiệu');
      return;
    }

    const allImages = Array.from(new Set([
      formData.coverImage,
      ...(Array.isArray(formData.gallery) ? formData.gallery : []),
    ].filter(Boolean)));

    if (allImages.length === 0) {
      setUploadError('Cần ít nhất 1 hình');
      return;
    }

    onSave({
      ...formData,
      coverImage: allImages[0],
      gallery: allImages,
    });
    onClose();
  };

  // Thứ tự lấy theo `gallery`; `coverImage` chỉ chèn thêm nếu nó chưa nằm trong
  // đó. Đặt cover lên trước như bản cũ thì xếp lại kiểu gì tấm đó cũng bị kéo
  // về đầu — nhấc tấm số 1 đi chỗ khác xong nó nhảy lại chỗ cũ.
  const galleryList = Array.from(new Set([
    ...(Array.isArray(formData.gallery) ? formData.gallery : []),
    formData.coverImage,
  ].filter(Boolean)));

  const oNhap = 'w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm focus:border-[#C3EA39] focus:outline-none transition-colors';
  const nhan = 'text-xs font-mono text-white/70 flex items-center gap-1.5';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#121216] border border-white/15 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp my-auto"
      >
        {/* Đầu form */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#15151b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono font-bold">
              ✦
            </div>
            <h3 className="font-display font-bold text-base sm:text-lg text-white">
              {client?.id ? 'Sửa Thương Hiệu' : 'Thêm Thương Hiệu'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thân form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              {uploadError}
            </div>
          )}

          {/* Tên + Năm */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8 space-y-1.5">
              <label className={nhan}>
                <Building2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Tên Thương Hiệu <span className="text-[#C3EA39]">*</span></span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className={oNhap}
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className={nhan}>
                <Calendar className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Năm</span>
              </label>
              <input
                type="text"
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="2025"
                className={`${oNhap} font-mono`}
              />
            </div>
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5">
            <label className={nhan}>
              <MessageSquareQuote className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span>Mô Tả</span>
            </label>
            <textarea
              name="note"
              rows={3}
              value={formData.note}
              onChange={handleChange}
              placeholder="Để trống thì trong bài viết sẽ ẩn dòng này"
              className={`${oNhap} resize-none`}
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={nhan}>
                <Building2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Logo</span>
              </label>
              {formData.logo && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                  className="text-[10px] font-mono text-red-400 hover:underline cursor-pointer"
                >
                  Xoá
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                {formData.logo ? (
                  <SmartImage src={formData.logo} alt="" sizes="48px" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-white/20" />
                )}
              </div>

              <input
                type="file"
                ref={logoInputRef}
                onChange={handleUploadLogo}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Tải Logo</span>
              </button>
            </div>
          </div>

          {/* Hình — cả khối này là vùng thả file */}
          <div
            onDragEnter={vaoVungTha}
            onDragOver={trenVungTha}
            onDragLeave={roiVungTha}
            onDrop={thaVao}
            className={`relative space-y-3 rounded-2xl transition-colors ${
              dangKeo ? 'ring-2 ring-[#C3EA39] bg-[#C3EA39]/[0.06] p-3 -m-3' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className={nhan}>
                <Layers className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Hình ({galleryList.length}) <span className="text-[#C3EA39]">*</span></span>
              <span className="text-[10px] text-white/35 font-mono">— kéo để đổi chỗ</span>
              </label>

              <input
                type="file"
                ref={galleryInputRef}
                onChange={handleUploadGalleryFiles}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploadingGallery}
                className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-[#C3EA39]/15 disabled:opacity-50"
              >
                {isUploadingGallery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Thêm Hình</span>
                  </>
                )}
              </button>
            </div>

            {/* Lớp phủ lúc đang kéo. pointer-events-none để nó không nuốt mất
                sự kiện thả của khối bên dưới. */}
            {dangKeo && (
              <div className="absolute inset-0 z-20 rounded-2xl bg-[#0E0E12]/85 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 font-mono text-sm text-[#C3EA39]">
                  <Upload className="w-4 h-4" />
                  <span>Thả hình vào đây</span>
                </div>
              </div>
            )}

            {galleryList.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-white/15 text-center text-white/35 font-mono text-xs">
                Kéo hình vào đây, hoặc bấm "Thêm Hình"
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryList.map((img, idx) => {
                  const dangNhac = keo?.tu === idx;
                  const laDich = keo && keo.dich === idx && keo.tu !== idx;
                  return (
                  <div
                    key={idx}
                    data-anh-idx={idx}
                    onPointerDown={(e) => batDauKeo(e, idx)}
                    /* `pan-y` để trên điện thoại vuốt dọc vẫn cuộn được form,
                       còn kéo ngang thì bắt đầu đổi chỗ. Chuột không bị ảnh
                       hưởng bởi thuộc tính này. */
                    /* KHÔNG đặt `transform` ở đây: lúc kéo nó do tay ghi thẳng
                       vào DOM. Để React cũng quản một phần thì mỗi lần vẽ lại là
                       nó ghi đè, ảnh giật về chỗ cũ. */
                    style={{ touchAction: 'pan-y' }}
                    title="Kéo để đổi chỗ"
                    className={`relative rounded-xl overflow-hidden bg-black border flex flex-col cursor-grab active:cursor-grabbing ${
                      dangNhac
                        ? 'z-30 opacity-90 shadow-2xl border-[#C3EA39] pointer-events-none'
                        : laDich
                          ? 'border-[#C3EA39] ring-2 ring-[#C3EA39]/60'
                          : 'border-white/15'
                    }`}
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                      {/* Bản THU NHỎ, không phải ảnh gốc.
                          Ô này chỉ rộng chừng 180px mà trước đây nạp nguyên tấm
                          2560px — một brand 45 ảnh là 45 tấm cỡ đó nằm trong bộ
                          nhớ, kéo thả giật là phải. */}
                      <SmartImage
                        src={img}
                        alt=""
                        sizes="180px"
                        draggable={false}
                        loading={idx < 12 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover select-none"
                      />
                    </div>

                    <div className="p-1.5 bg-[#141419] border-t border-white/10 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          data-khong-keo
                          onClick={() => handleMoveGalleryItem(idx, 'left')}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/20 text-white/70 disabled:opacity-20 cursor-pointer"
                          title="Ra trước"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          data-khong-keo
                          onClick={() => handleMoveGalleryItem(idx, 'right')}
                          disabled={idx === galleryList.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/20 text-white/70 disabled:opacity-20 cursor-pointer"
                          title="Ra sau"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        data-khong-keo
                        onClick={() => handleRemoveGalleryItem(idx)}
                        className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white transition-colors cursor-pointer"
                        title="Xoá hình này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

        </form>

        {/* Cuối form */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-[#15151b]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs transition-all cursor-pointer"
          >
            Huỷ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploadingLogo || isUploadingGallery}
            className="px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{client?.id ? 'Lưu thay đổi' : 'Thêm vào danh sách'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
