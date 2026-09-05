import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  ExternalLink,
  Check,
  Eye,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  Sparkles
} from 'lucide-react';
import { extractEmbedSrc } from '../../utils/juxtaposeUtils';
import BeforeAfterSlider from '../BeforeAfterSlider';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';

export default function JuxtaposeEmbedModal({ isOpen, initialData, onSave, onClose }) {
  const [activeMode, setActiveMode] = useState('direct'); // 'direct' | 'embed'
  
  // Direct 2-image state
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [beforeLabel, setBeforeLabel] = useState('');
  const [afterLabel, setAfterLabel] = useState('');
  const [showBeforeUrl, setShowBeforeUrl] = useState(false);
  const [showAfterUrl, setShowAfterUrl] = useState(false);
  const [isBeforeDragging, setIsBeforeDragging] = useState(false);
  const [isAfterDragging, setIsAfterDragging] = useState(false);
  
  // Embed code state
  const [embedCode, setEmbedCode] = useState('');
  const [previewSrc, setPreviewSrc] = useState('');
  
  // Shared metadata
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  const beforeFileRef = useRef(null);
  const afterFileRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setTitle(initialData.title || '');
      setSubtitle(initialData.subtitle || '');
      
      const code = initialData.embedCode || initialData.embedUrl || '';
      setEmbedCode(code);
      setPreviewSrc(extractEmbedSrc(code));

      if (initialData.beforeImage || initialData.afterImage) {
        setBeforeImage(initialData.beforeImage || '');
        setAfterImage(initialData.afterImage || '');
        setBeforeLabel(initialData.beforeLabel || '');
        setAfterLabel(initialData.afterLabel || '');
        setActiveMode('direct');
      } else if (code) {
        setActiveMode('embed');
      } else {
        setActiveMode('direct');
      }
    } else if (isOpen) {
      setActiveMode('direct');
      setBeforeImage('');
      setAfterImage('');
      setBeforeLabel('');
      setAfterLabel('');
      setEmbedCode('');
      setPreviewSrc('');
      setTitle('');
      setSubtitle('');
    }
    setShowBeforeUrl(false);
    setShowAfterUrl(false);
  }, [isOpen, initialData]);

  const processFile = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setter(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBeforeFileUpload = (e) => {
    processFile(e.target.files?.[0], setBeforeImage);
    e.target.value = '';
  };

  const handleAfterFileUpload = (e) => {
    processFile(e.target.files?.[0], setAfterImage);
    e.target.value = '';
  };

  const handleCodeChange = (val) => {
    setEmbedCode(val);
    const src = extractEmbedSrc(val);
    setPreviewSrc(src);
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeMode === 'direct') {
      if (!beforeImage.trim() || !afterImage.trim()) {
        alert("Vui lòng chọn cả 2 ảnh (Ảnh trước và Ảnh sau)!");
        return;
      }

      onSave({
        beforeImage: beforeImage.trim(),
        afterImage: afterImage.trim(),
        beforeLabel: beforeLabel.trim(),
        afterLabel: afterLabel.trim(),
        embedCode: '',
        embedUrl: '',
        title: title.trim(),
        subtitle: subtitle.trim(),
      });
    } else {
      const cleanSrc = extractEmbedSrc(embedCode);
      if (!cleanSrc) {
        alert("Vui lòng dán mã nhúng <iframe> hoặc đường link hợp lệ từ Juxtapose!");
        return;
      }

      onSave({
        embedCode: embedCode.trim(),
        embedUrl: cleanSrc,
        beforeImage: beforeImage.trim(),
        afterImage: afterImage.trim(),
        beforeLabel: beforeLabel.trim(),
        afterLabel: afterLabel.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
      });
    }
  };

  const hasDirectImages = Boolean(beforeImage && afterImage);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 animate-fadeIn">
      <div 
        className="bg-[#121216] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#16161c]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C3EA39]" />
            <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-wide">
              {initialData?.editingIndex !== null && initialData?.editingIndex !== undefined 
                ? 'Sửa Slider Before / After' 
                : 'Thêm Slider Before / After'}
            </h3>
          </div>

          {/* Mode Switcher Tabs (Compact Pills) */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('direct')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'direct'
                  ? 'bg-[#C3EA39] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>2 Ảnh So Sánh</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('embed')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'embed'
                  ? 'bg-[#C3EA39] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              <span>Mã Iframe</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-[#C3EA39] text-white/70 hover:text-black flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          id="juxtapose-modal-form"
          className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs"
        >
          
          {/* 1. DIRECT 2-IMAGE MODE */}
          {activeMode === 'direct' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Image 1: Before */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="text-[#C3EA39]">1.</span> Ảnh Trước (Before)
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowBeforeUrl(prev => !prev)}
                      className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-[#C3EA39] transition-colors"
                      title="Dán link ảnh"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => beforeFileRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Chọn ảnh</span>
                    </button>
                  </div>
                </div>

                {showBeforeUrl && (
                  <input
                    type="text"
                    value={beforeImage}
                    onChange={(e) => setBeforeImage(e.target.value)}
                    placeholder="Dán link ảnh trước (https://...)"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 focus:border-[#C3EA39] text-xs font-mono text-white focus:outline-none animate-fadeIn"
                  />
                )}

                {/* Before Thumbnail or Dropzone */}
                {beforeImage ? (
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-black group shadow-sm">
                    <img
                      src={beforeImage}
                      alt="Before Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => beforeFileRef.current?.click()}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                        title="Đổi ảnh"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeforeImage('')}
                        className="p-1.5 rounded-lg bg-red-500/30 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsBeforeDragging(true); }}
                    onDragLeave={() => setIsBeforeDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsBeforeDragging(false);
                      processFile(e.dataTransfer.files?.[0], setBeforeImage);
                    }}
                    onClick={() => beforeFileRef.current?.click()}
                    className={`aspect-[16/10] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-3 cursor-pointer group ${
                      isBeforeDragging
                        ? 'border-[#C3EA39] bg-[#C3EA39]/10'
                        : 'border-white/10 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-white/30 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all mb-1" />
                    <span className="text-xs font-mono font-bold text-white/70 group-hover:text-white">
                      Tải ảnh Trước
                    </span>
                    <span className="text-[10px] font-mono text-white/30">Kéo thả hoặc bấm vào đây</span>
                  </div>
                )}

                <input
                  ref={beforeFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBeforeFileUpload}
                  className="hidden"
                />

                {/* Label Input */}
                <div>
                  <input
                    type="text"
                    value={beforeLabel}
                    onChange={(e) => setBeforeLabel(e.target.value)}
                    placeholder="Nhãn góc ảnh (VD: Trước, Phác thảo...)"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 focus:border-[#C3EA39] text-xs font-medium text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              {/* Image 2: After */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="text-[#C3EA39]">2.</span> Ảnh Sau (After)
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAfterUrl(prev => !prev)}
                      className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-[#C3EA39] transition-colors"
                      title="Dán link ảnh"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => afterFileRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Chọn ảnh</span>
                    </button>
                  </div>
                </div>

                {showAfterUrl && (
                  <input
                    type="text"
                    value={afterImage}
                    onChange={(e) => setAfterImage(e.target.value)}
                    placeholder="Dán link ảnh sau (https://...)"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 focus:border-[#C3EA39] text-xs font-mono text-white focus:outline-none animate-fadeIn"
                  />
                )}

                {/* After Thumbnail or Dropzone */}
                {afterImage ? (
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-black group shadow-sm">
                    <img
                      src={afterImage}
                      alt="After Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => afterFileRef.current?.click()}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                        title="Đổi ảnh"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAfterImage('')}
                        className="p-1.5 rounded-lg bg-red-500/30 hover:bg-red-500 text-red-300 hover:text-white transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsAfterDragging(true); }}
                    onDragLeave={() => setIsAfterDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsAfterDragging(false);
                      processFile(e.dataTransfer.files?.[0], setAfterImage);
                    }}
                    onClick={() => afterFileRef.current?.click()}
                    className={`aspect-[16/10] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-3 cursor-pointer group ${
                      isAfterDragging
                        ? 'border-[#C3EA39] bg-[#C3EA39]/10'
                        : 'border-white/10 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-white/30 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all mb-1" />
                    <span className="text-xs font-mono font-bold text-white/70 group-hover:text-white">
                      Tải ảnh Sau
                    </span>
                    <span className="text-[10px] font-mono text-white/30">Kéo thả hoặc bấm vào đây</span>
                  </div>
                )}

                <input
                  ref={afterFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAfterFileUpload}
                  className="hidden"
                />

                {/* Label Input */}
                <div>
                  <input
                    type="text"
                    value={afterLabel}
                    onChange={(e) => setAfterLabel(e.target.value)}
                    placeholder="Nhãn góc ảnh (VD: Sau, Hoàn thiện...)"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 focus:border-[#C3EA39] text-xs font-medium text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

            </div>
          )}

          {/* 2. EMBED CODE MODE */}
          {activeMode === 'embed' && (
            <div className="p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-white uppercase tracking-wider block">
                  Mã nhúng &lt;iframe&gt; hoặc Link Juxtapose <span className="text-[#C3EA39]">*</span>
                </label>
                <a
                  href="https://juxtapose.knightlab.com/#make"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#C3EA39] text-white/70 hover:text-black font-mono text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Mở Juxtapose</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <textarea
                rows={3}
                value={embedCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder='<iframe frameborder="0" class="juxtapose" width="100%" height="500" src="https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=..."></iframe>'
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-mono text-xs leading-relaxed placeholder-white/20"
              />
            </div>
          )}

          {/* Live Preview Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Xem trước trực tiếp (Live Preview)</span>
              </span>
              {hasDirectImages && (
                <span className="text-[10px] font-mono text-[#C3EA39] bg-[#C3EA39]/10 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <Check className="w-3 h-3" />
                  <span>Sẵn sàng hiển thị</span>
                </span>
              )}
            </div>

            <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center shadow-lg">
              {hasDirectImages ? (
                <BeforeAfterSlider
                  beforeImage={beforeImage}
                  afterImage={afterImage}
                  beforeLabel={beforeLabel}
                  afterLabel={afterLabel}
                />
              ) : previewSrc ? (
                <div className="relative w-full h-full overflow-hidden">
                  <iframe
                    src={previewSrc}
                    title="Juxtapose Preview"
                    className="absolute -top-3 left-0 w-full h-[120%] border-0 bg-[#0a0a0c]"
                    allowFullScreen
                  />
                  <div className="absolute bottom-0 right-0 w-28 h-8 bg-[#0a0a0c] z-20 pointer-events-none" />
                </div>
              ) : (
                <div className="text-center p-6 text-white/30 space-y-1">
                  <SlidersHorizontal className="w-7 h-7 mx-auto mb-1.5 text-white/20" />
                  <p className="font-mono text-xs">Chưa có ảnh so sánh</p>
                </div>
              )}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-white/50 block mb-1 uppercase tracking-wider">
                Tiêu đề banner (tuỳ chọn)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Phác thảo vs Hoàn thiện"
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-[#C3EA39] text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/50 block mb-1 uppercase tracking-wider">
                Mô tả phụ (tuỳ chọn)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="VD: Kéo thanh trượt để so sánh chi tiết"
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-[#C3EA39] text-white text-xs focus:outline-none"
              />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-white/10 bg-[#16161c] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer min-h-[38px]"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="juxtapose-modal-form"
            className="px-5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#C3EA39]/15 hover:scale-[1.01] active:scale-95 min-h-[38px]"
          >
            <Check className="w-4 h-4" />
            <span>Lưu Banner</span>
          </button>
        </div>

      </div>
    </div>
  );
}