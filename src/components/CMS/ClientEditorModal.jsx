import React, { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, Sparkles, Building2, Image as ImageIcon, Link as LinkIcon, Calendar, Tag, MessageSquareQuote } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';

export default function ClientEditorModal({ client, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(() => ({
    id: client?.id || '',
    clientName: client?.clientName || '',
    service: client?.service || '',
    year: client?.year || `${new Date().getFullYear()}`,
    logo: client?.logo || '',
    coverImage: client?.coverImage || '',
    gallery: client?.gallery || [],
    note: client?.note || '',
    link: client?.link || '',
    featured: Boolean(client?.featured),
  }));

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const coverInputRef = useRef(null);
  const logoInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setIsUploadingCover(true);

    try {
      const res = await optimizeAndUploadToR2(file, 'clients');
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, coverImage: res.url }));
      } else {
        throw new Error(res?.error || 'Tải ảnh thất bại');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Tải ảnh bìa thất bại: ' + err.message);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      setUploadError('Vui lòng nhập tên khách hàng / thương hiệu');
      return;
    }
    if (!formData.coverImage.trim()) {
      setUploadError('Vui lòng tải lên hoặc dán link ảnh sản phẩm bàn giao chính');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#121216] border border-white/15 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#15151b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono">
              ✦
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white">
                {client?.id ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
              </h3>
              <p className="text-[11px] font-mono text-white/50">
                Lưu giữ kỷ niệm và sản phẩm đã làm cho đối tác
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5">
          
          {uploadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              {uploadError}
            </div>
          )}

          {/* Row 1: Tên Khách & Năm */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Tên Khách Hàng / Thương Hiệu <span className="text-[#C3EA39]">*</span></span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Ví dụ: The Vintage Co., Tiệm Cà Phê Mùa Hè..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-sans focus:border-[#C3EA39] focus:outline-none transition-colors"
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Năm Hợp Tác</span>
              </label>
              <input
                type="text"
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="2025"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-mono focus:border-[#C3EA39] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Thể loại dịch vụ / sản phẩm */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span>Thể Loại / Dịch Vụ Đã Làm</span>
            </label>
            <input
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              placeholder="Ví dụ: Brand Identity & Packaging, Poster & Key Visual..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-sans focus:border-[#C3EA39] focus:outline-none transition-colors"
            />
          </div>

          {/* Row 3: Ảnh Bàn Giao Chính (Bắt buộc) */}
          <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/90 font-bold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Ảnh Sản Phẩm Bàn Giao Chính <span className="text-[#C3EA39]">*</span></span>
              </label>
              <span className="text-[10px] font-mono text-white/40">Tự động nén WebP siêu nhẹ</span>
            </div>

            {/* Preview & Upload Area */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/15 flex items-center justify-center relative">
                {formData.coverImage ? (
                  <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] font-mono text-white/30 text-center p-2">Chưa có ảnh</span>
                )}
              </div>

              <div className="sm:col-span-8 space-y-2">
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleUploadCover}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C3EA39]/15 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black border border-[#C3EA39]/30 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  {isUploadingCover ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải và nén ảnh...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh từ máy tính</span>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  name="coverImage"
                  value={formData.coverImage}
                  onChange={handleChange}
                  placeholder="Hoặc dán URL ảnh trực tiếp..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-mono focus:border-[#C3EA39] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Logo Khách Hàng (Tùy chọn) */}
          <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/90 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Logo / Avatar Thương Hiệu (Tùy chọn)</span>
              </label>
              {formData.logo && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                  className="text-[10px] font-mono text-red-400 hover:underline"
                >
                  Xóa logo
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-black border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-white/20" />
                )}
              </div>

              <div className="flex-1 flex gap-2">
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
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Tải Logo</span>
                </button>

                <input
                  type="text"
                  name="logo"
                  value={formData.logo}
                  onChange={handleChange}
                  placeholder="Hoặc dán URL logo..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-mono focus:border-[#C3EA39] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Ghi chú kỷ niệm & Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
              <MessageSquareQuote className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span>Ghi Chú Kỷ Niệm / Lời Nhắn</span>
            </label>
            <textarea
              name="note"
              rows={3}
              value={formData.note}
              onChange={handleChange}
              placeholder="Viết đôi dòng kỷ niệm, cảm nhận hoặc bối cảnh dự án khi hợp tác cùng khách hàng này..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-sans focus:border-[#C3EA39] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Row 6: Link trang của khách & Featured checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Link Trang Của Khách (Website / Fanpage)</span>
              </label>
              <input
                type="text"
                name="link"
                value={formData.link}
                onChange={handleChange}
                placeholder="https://facebook.com/... hoặc https://brand.com"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-mono focus:border-[#C3EA39] focus:outline-none transition-colors"
              />
            </div>

            <div className="sm:col-span-4 pt-4 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#C3EA39]/40 transition-colors">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-[#C3EA39] cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C3EA39]" />
                  <span>Thẻ Nổi Bật (Lớn)</span>
                </span>
              </label>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-[#15151b]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs transition-all cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploadingCover || isUploadingLogo}
            className="px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{client?.id ? 'Lưu Khách Hàng' : 'Thêm Vào Danh Sách'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
