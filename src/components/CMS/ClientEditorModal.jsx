import React, { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, Sparkles, Building2, Image as ImageIcon, Link as LinkIcon, Calendar, Tag, MessageSquareQuote, Trash2, ArrowLeft, ArrowRight, Layers, Plus, HeartHandshake } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';

export default function ClientEditorModal({ client, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(() => ({
    id: client?.id || '',
    clientName: client?.clientName || '',
    service: client?.service || '',
    year: client?.year || `${new Date().getFullYear()}`,
    logo: client?.logo || '',
    coverImage: client?.coverImage || '',
    gallery: Array.isArray(client?.gallery) ? client.gallery : [],
    note: client?.note || '',
    link: client?.link || '',
    featured: Boolean(client?.featured),
  }));

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  const coverInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Upload Cover Photo
  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setIsUploadingCover(true);

    try {
      const res = await optimizeAndUploadToR2(file, 'clients');
      if (res && res.url) {
        setFormData((prev) => {
          const newCover = res.url;
          const currentGallery = prev.gallery || [];
          const updatedGallery = currentGallery.includes(newCover) ? currentGallery : [newCover, ...currentGallery];
          return { ...prev, coverImage: newCover, gallery: updatedGallery };
        });
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

  // Upload Brand Logo
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

  // Upload Multiple Deliverables to Gallery
  const handleUploadGalleryFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError('');
    setIsUploadingGallery(true);

    try {
      const uploadPromises = files.map(file => optimizeAndUploadToR2(file, 'clients/gallery'));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.filter(r => r && r.url).map(r => r.url);

      if (newUrls.length > 0) {
        setFormData(prev => {
          const currentGallery = prev.gallery || [];
          const combined = [...currentGallery, ...newUrls];
          const newCover = prev.coverImage || newUrls[0];
          return {
            ...prev,
            coverImage: newCover,
            gallery: combined,
          };
        });
      }
    } catch (err) {
      console.error(err);
      setUploadError('Tải ảnh sản phẩm thất bại: ' + err.message);
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Add single image URL to gallery
  const handleAddGalleryUrl = (e) => {
    e.preventDefault();
    if (!newGalleryUrl.trim()) return;
    const url = newGalleryUrl.trim();
    setFormData(prev => {
      const currentGallery = prev.gallery || [];
      const updated = [...currentGallery, url];
      return {
        ...prev,
        coverImage: prev.coverImage || url,
        gallery: updated,
      };
    });
    setNewGalleryUrl('');
  };

  // Remove photo from gallery
  const handleRemoveGalleryItem = (index) => {
    setFormData(prev => {
      const currentGallery = prev.gallery || [];
      const removedItem = currentGallery[index];
      const updated = currentGallery.filter((_, i) => i !== index);
      let newCover = prev.coverImage;
      if (prev.coverImage === removedItem) {
        newCover = updated[0] || '';
      }
      return {
        ...prev,
        coverImage: newCover,
        gallery: updated,
      };
    });
  };

  // Move photo in gallery (reorder)
  const handleMoveGalleryItem = (index, direction) => {
    setFormData(prev => {
      const current = [...(prev.gallery || [])];
      const targetIdx = direction === 'left' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= current.length) return prev;
      const temp = current[index];
      current[index] = current[targetIdx];
      current[targetIdx] = temp;
      return {
        ...prev,
        gallery: current,
      };
    });
  };

  // Set specific photo as Main Cover
  const handleSetAsCover = (imgUrl) => {
    setFormData(prev => ({
      ...prev,
      coverImage: imgUrl,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      setUploadError('Vui lòng nhập tên bạn đồng hành / thương hiệu');
      return;
    }
    
    // Ensure coverImage or at least 1 image exists
    const allImages = Array.from(new Set([
      formData.coverImage,
      ...(Array.isArray(formData.gallery) ? formData.gallery : [])
    ].filter(Boolean)));

    if (allImages.length === 0) {
      setUploadError('Vui lòng tải lên ít nhất 1 ảnh ấn phẩm đã làm cho bạn đồng hành');
      return;
    }

    const finalPayload = {
      ...formData,
      coverImage: formData.coverImage || allImages[0],
      gallery: allImages,
    };

    onSave(finalPayload);
    onClose();
  };

  const galleryList = Array.from(new Set([
    formData.coverImage,
    ...(Array.isArray(formData.gallery) ? formData.gallery : [])
  ].filter(Boolean)));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="fixed inset-0" onClick={onClose} />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#121216] border border-white/15 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#15151b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] font-mono font-bold">
              ✦
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white">
                {client?.id ? 'Chỉnh Sửa Bạn Đồng Hành' : 'Thêm Bạn Đồng Hành Mới'}
              </h3>
              <p className="text-[11px] font-mono text-white/50">
                Lưu giữ trọn bộ các ấn phẩm và kỷ niệm đã cùng nhau sáng tạo
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
          
          {uploadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
              {uploadError}
            </div>
          )}

          {/* Row 1: Tên Bạn Đồng Hành & Năm */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Tên Bạn Đồng Hành / Thương Hiệu <span className="text-[#C3EA39]">*</span></span>
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
              placeholder="Ví dụ: Brand Identity & Packaging, Poster & Key Visual 3D..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-sans focus:border-[#C3EA39] focus:outline-none transition-colors"
            />
          </div>

          {/* Row 3: Logo Thương Hiệu */}
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
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
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

          {/* Row 4: MULTI-DELIVERABLES SHOWCASE GALLERY */}
          <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-mono text-white/90 font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#C3EA39]" />
                  <span>Bộ Sưu Tập Ấn Phẩm Bàn Giao ({galleryList.length} ảnh) <span className="text-[#C3EA39]">*</span></span>
                </label>
                <p className="text-[11px] font-mono text-white/40">
                  Tải lên nhiều ảnh sản phẩm. Ảnh có viền vàng là ảnh chính hiển thị đầu tiên trên sân khấu.
                </p>
              </div>

              {/* Upload Multiple Button */}
              <div className="flex items-center gap-2">
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
                  className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-[#C3EA39]/15"
                >
                  {isUploadingGallery ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải Nhiều Ảnh</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick URL Add */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Hoặc dán URL ảnh sản phẩm..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-mono focus:border-[#C3EA39] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddGalleryUrl}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {/* Uploaded Gallery Grid */}
            {galleryList.length === 0 ? (
              <div className="p-8 rounded-xl border-2 border-dashed border-white/10 text-center text-white/30 font-mono text-xs">
                Chưa có ảnh sản phẩm nào. Hãy bấm "Tải Nhiều Ảnh" để thêm các mockup / thiết kế đã bàn giao.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryList.map((img, idx) => {
                  const isMain = img === formData.coverImage || (idx === 0 && !formData.coverImage);

                  return (
                    <div
                      key={idx}
                      className={`relative rounded-xl overflow-hidden bg-black border-2 group flex flex-col ${
                        isMain ? 'border-[#C3EA39] shadow-md shadow-[#C3EA39]/20' : 'border-white/15'
                      }`}
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>

                      {/* Main Badge */}
                      {isMain && (
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#C3EA39] text-black font-mono font-bold text-[9px]">
                          Ảnh chính
                        </div>
                      )}

                      {/* Quick Action Overlay */}
                      <div className="p-1.5 bg-[#141419] border-t border-white/10 flex items-center justify-between gap-1 text-[11px] font-mono">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryItem(idx, 'left')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-white/5 hover:bg-white/20 text-white/70 disabled:opacity-20 cursor-pointer"
                            title="Sang trái"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryItem(idx, 'right')}
                            disabled={idx === galleryList.length - 1}
                            className="p-1 rounded bg-white/5 hover:bg-white/20 text-white/70 disabled:opacity-20 cursor-pointer"
                            title="Sang phải"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {!isMain && (
                          <button
                            type="button"
                            onClick={() => handleSetAsCover(img)}
                            className="text-[9px] text-[#C3EA39] hover:underline cursor-pointer"
                            title="Chọn làm ảnh chính"
                          >
                            Đặt làm chính
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryItem(idx)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white transition-colors cursor-pointer"
                          title="Xóa ảnh này"
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
              placeholder="Viết đôi dòng kỷ niệm, cảm nhận hoặc bối cảnh dự án khi hợp tác cùng bạn đồng hành này..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm font-sans focus:border-[#C3EA39] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Row 6: Link trang của bạn & Featured checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-mono text-white/70 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Link Trang Của Bạn (Website / Fanpage)</span>
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
                  <span>Bạn Đồng Hành Nổi Bật</span>
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
            disabled={isUploadingCover || isUploadingLogo || isUploadingGallery}
            className="px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{client?.id ? 'Lưu Thay Đổi' : 'Thêm Vào Danh Sách'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
