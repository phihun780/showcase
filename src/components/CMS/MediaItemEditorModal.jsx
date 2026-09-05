import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Upload,
  SlidersHorizontal,
  Eye,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Maximize2
} from 'lucide-react';
import ImageCropModal from './ImageCropModal';

export default function MediaItemEditorModal({
  isOpen,
  item,
  index,
  mode = 'banner', // 'banner' | 'random'
  onSave,
  onClose,
  onPreviewImage,
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  
  // Internal Crop Modal state
  const [cropConfig, setCropConfig] = useState(null);
  const fileInputRef = useRef(null);

  const isBanner = mode === 'banner';
  const targetRatio = isBanner ? 21 / 9 : 1;
  const ratioLabel = isBanner ? '21:9 (Góc rộng)' : '1:1 (Vuông)';

  useEffect(() => {
    if (isOpen && item) {
      setTitle(item.title || '');
      setSubtitle(item.subtitle || '');
      setImage(item.image || '');
      setUrlInputValue(item.image || '');
      setShowUrlInput(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleOpenCrop = () => {
    if (!image) return;
    setCropConfig({
      isOpen: true,
      imageSrc: image,
      mode: mode,
      initialAspectRatio: targetRatio,
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEv) => {
        const fileData = loadEv.target.result;
        // Open crop modal directly on the newly chosen image
        setCropConfig({
          isOpen: true,
          imageSrc: fileData,
          mode: mode,
          initialAspectRatio: targetRatio,
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedUrl) => {
    setImage(croppedUrl);
    setUrlInputValue(croppedUrl);
    setCropConfig(null);
  };

  const handleApplyUrl = () => {
    if (urlInputValue && urlInputValue.trim()) {
      setImage(urlInputValue.trim());
      setShowUrlInput(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSave({
      ...item,
      title: title.trim(),
      subtitle: subtitle.trim(),
      image: image,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
        <div
          className="relative w-full max-w-2xl bg-[#121216] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                {isBanner ? <SlidersHorizontal className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
                  <span>{isBanner ? 'Chỉnh Sửa Slide Banner' : 'Chỉnh Sửa Artwork'}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/10 text-[#C3EA39]">
                    #{index !== null && index !== undefined ? (index + 1 < 10 ? `0${index + 1}` : index + 1) : '01'}
                  </span>
                </h3>
                <p className="text-xs font-mono text-white/50">
                  {isBanner ? 'Tuỳ chỉnh ảnh banner góc rộng 21:9 & thông tin' : 'Tuỳ chỉnh artwork vuông 1:1 & thông tin'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Đóng popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* 1. Image Preview & Action Controls */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C3EA39]" />
                  <span>Hình ảnh hiển thị ({ratioLabel})</span>
                </label>
                
                <span className="text-[11px] font-mono text-[#C3EA39]/80">
                  Chuẩn tỉ lệ: {isBanner ? '21:9' : '1:1'}
                </span>
              </div>

              {/* Preview Box */}
              <div className={`relative w-full rounded-2xl overflow-hidden bg-black border border-white/15 group shadow-inner ${
                isBanner ? 'aspect-[21/9]' : 'aspect-square max-w-sm mx-auto'
              }`}>
                {image ? (
                  <>
                    <img
                      src={image}
                      alt={title || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Hover Overlay with Action Buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={handleOpenCrop}
                        className="px-3 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Căn chỉnh khung preview, zoom & bộ lọc màu"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Căn chỉnh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-white/90 hover:bg-white text-black text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Tải ảnh mới từ máy tính"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Đổi ảnh</span>
                      </button>

                      {onPreviewImage && (
                        <button
                          type="button"
                          onClick={() => onPreviewImage(image)}
                          className="p-2 rounded-xl bg-black/80 hover:bg-white text-white hover:text-black transition-colors cursor-pointer border border-white/20"
                          title="Xem ảnh toàn màn hình"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center text-white/40 hover:text-white cursor-pointer transition-colors p-4 text-center"
                  >
                    <Upload className="w-8 h-8 text-[#C3EA39] mb-2" />
                    <span className="text-xs font-mono font-bold">Bấm để tải ảnh lên</span>
                    <span className="text-[10px] font-mono text-white/40 mt-1">Hỗ trợ JPG, PNG, WebP, GIF, SVG</span>
                  </div>
                )}
              </div>

              {/* Bottom Image Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C3EA39]" />
                    <span>Tải ảnh mới</span>
                  </button>

                  {image && (
                    <button
                      type="button"
                      onClick={handleOpenCrop}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#C3EA39]" />
                      <span>Căn chỉnh khung / Cắt</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-xs font-mono text-white/50 hover:text-[#C3EA39] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{showUrlInput ? 'Ẩn nhập URL' : 'Nhập URL trực tiếp'}</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Direct URL Input accordion */}
              {showUrlInput && (
                <div className="p-3 rounded-2xl bg-[#0a0a0d] border border-white/10 flex items-center gap-2 animate-fadeIn">
                  <input
                    type="url"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-1.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* 2. Text Information Fields */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider block">
                  {isBanner ? 'Tiêu đề Slide Banner' : 'Tên tác phẩm (Artwork Title)'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isBanner ? 'VD: Typography Motion Poster' : 'VD: Abstract 3D Render #01'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#C3EA39] focus:bg-white/[0.07] text-white text-sm font-sans placeholder-white/30 focus:outline-none transition-all"
                />
              </div>

              {/* Subtitle / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider block">
                  {isBanner ? 'Mô tả phụ (Subtitle)' : 'Mô tả phụ / Thể loại (Subtitle)'}
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={isBanner ? 'VD: Dự án thiết kế nhận diện thương hiệu' : 'VD: Tác phẩm lúc rảnh rỗi / Blender 3D'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#C3EA39] focus:bg-white/[0.07] text-white text-sm font-sans placeholder-white/30 focus:outline-none transition-all"
                />
              </div>
            </div>

          </form>

          {/* Footer Actions */}
          <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              Huỷ
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs sm:text-sm font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận & Lưu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Crop Modal on top if user clicks "Căn chỉnh" or chooses new file */}
      {cropConfig && (
        <ImageCropModal
          isOpen={Boolean(cropConfig.isOpen)}
          imageSrc={cropConfig.imageSrc}
          mode={cropConfig.mode}
          initialAspectRatio={cropConfig.initialAspectRatio}
          onCropComplete={handleCropComplete}
          onClose={() => setCropConfig(null)}
        />
      )}
    </>
  );
}
