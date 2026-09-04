import React, { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, Sparkles, ExternalLink, Check, Eye, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { extractEmbedSrc, extractJuxtaposeUid } from '../../utils/juxtaposeUtils';
import BeforeAfterSlider from '../BeforeAfterSlider';

export default function JuxtaposeEmbedModal({ isOpen, initialData, onSave, onClose }) {
  const [activeMode, setActiveMode] = useState('direct'); // 'direct' | 'embed'
  
  // Direct 2-image state
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [beforeLabel, setBeforeLabel] = useState('');
  const [afterLabel, setAfterLabel] = useState('');
  
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
  }, [isOpen, initialData]);

  const handleBeforeFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBeforeImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAfterFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAfterImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
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
        alert("Vui lòng tải lên hoặc dán URL cho cả 2 ảnh (Trước và Sau)!");
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div 
        className="bg-[#121216] border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#16161c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-display font-bold text-white">
                {initialData?.editingIndex !== null && initialData?.editingIndex !== undefined 
                  ? 'Chỉnh Sửa Slider Before / After' 
                  : 'Thêm Slider So Sánh Before / After'}
              </h3>
              <p className="text-[11px] font-mono text-white/50">
                Thanh trượt so sánh 2 bức ảnh mượt mà, 100% sạch logo watermark
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 pb-1 border-b border-white/5 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('direct')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'direct'
                ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/20'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Tải / Chọn 2 Ảnh (Khuyên dùng - 0% Logo)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('embed')}
            className={`py-2 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'embed'
                ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/20'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Mã Nhúng Iframe Juxtapose</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* 1. DIRECT 2-IMAGE MODE */}
          {activeMode === 'direct' && (
            <div className="space-y-4">
              
              {/* Note Tip */}
              <div className="p-3 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/25 flex items-center gap-2.5 text-[#C3EA39]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <p className="text-[11px] text-white/90 leading-relaxed font-sans">
                  <b>Khuyên dùng:</b> Tải trực tiếp 2 bức ảnh hoặc dán URL ảnh để website tự tạo slider 60fps mượt mà, không phụ thuộc máy chủ bên ngoài và <b>hoàn toàn không có logo / watermark Juxtapose</b>!
                </p>
              </div>

              {/* Two Images Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Image 1: Before */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#C3EA39] uppercase text-[11px]">
                      1. Ảnh Trước (Before / Nháp)
                    </span>
                    {beforeImage && (
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                        Đã có ảnh ✓
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={beforeImage.startsWith('data:') ? '[Đã tải ảnh lên từ máy]' : beforeImage}
                      onChange={(e) => setBeforeImage(e.target.value)}
                      placeholder="Dán link ảnh trước..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 focus:border-[#C3EA39] focus:outline-none text-white font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => beforeFileRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh</span>
                    </button>
                    <input
                      ref={beforeFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBeforeFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/60 uppercase block">
                      Tên nhãn góc ảnh (VD: Trước, Phác thảo - hoặc để trống)
                    </label>
                    <input
                      type="text"
                      value={beforeLabel}
                      onChange={(e) => setBeforeLabel(e.target.value)}
                      placeholder="Để trống hoặc nhập nhãn..."
                      className="w-full px-3 py-1 rounded-lg bg-black/40 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-[11px]"
                    />
                  </div>
                </div>

                {/* Image 2: After */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#C3EA39] uppercase text-[11px]">
                      2. Ảnh Sau (After / Hoàn thiện)
                    </span>
                    {afterImage && (
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                        Đã có ảnh ✓
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={afterImage.startsWith('data:') ? '[Đã tải ảnh lên từ máy]' : afterImage}
                      onChange={(e) => setAfterImage(e.target.value)}
                      placeholder="Dán link ảnh sau..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 focus:border-[#C3EA39] focus:outline-none text-white font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => afterFileRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Tải ảnh</span>
                    </button>
                    <input
                      ref={afterFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAfterFileUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-white/60 uppercase block">
                      Tên nhãn góc ảnh (VD: Sau, Hoàn thiện - hoặc để trống)
                    </label>
                    <input
                      type="text"
                      value={afterLabel}
                      onChange={(e) => setAfterLabel(e.target.value)}
                      placeholder="Để trống hoặc nhập nhãn..."
                      className="w-full px-3 py-1 rounded-lg bg-black/40 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-[11px]"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. EMBED CODE MODE */}
          {activeMode === 'embed' && (
            <div className="space-y-3">
              {/* External Tool Guide Box */}
              <div className="p-3.5 rounded-xl bg-[#C3EA39]/5 border border-[#C3EA39]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-[#C3EA39] flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo slider trên Knight Lab Juxtapose:</span>
                  </span>
                  <p className="text-[11px] text-white/70">
                    Tạo 2 ảnh Before & After tại juxtapose.knightlab.com, sau đó copy mã <b>Embed code &lt;iframe&gt;</b> hoặc link chia sẻ dán vào đây.
                  </p>
                </div>
                <a
                  href="https://juxtapose.knightlab.com/#make"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#C3EA39] text-black font-bold text-[11px] font-mono flex items-center gap-1 shrink-0 hover:bg-[#d4f854] transition-colors shadow-sm"
                >
                  <span>Mở Juxtapose</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Embed Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider block">
                  Mã Embed Code &lt;iframe&gt; hoặc URL Juxtapose <span className="text-[#C3EA39]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={embedCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder='<iframe frameborder="0" class="juxtapose" width="100%" height="500" src="https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=..."></iframe>'
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-[#C3EA39] focus:outline-none text-white font-mono text-xs leading-relaxed placeholder-white/20"
                />
              </div>
            </div>
          )}

          {/* Live Preview Section */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-white/60 uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3 h-3 text-[#C3EA39]" />
                <span>Xem Trước Trực Quan (Live Preview)</span>
              </label>
              {hasDirectImages ? (
                <span className="text-[10px] font-mono text-[#C3EA39] bg-[#C3EA39]/10 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                  <Check className="w-3 h-3" />
                  <span>Slider chuẩn 60fps (0% watermark)</span>
                </span>
              ) : previewSrc ? (
                <span className="text-[10px] font-mono text-[#C3EA39] bg-[#C3EA39]/10 px-2 py-0.5 rounded">
                  Đã nhận diện mã nhúng ✓
                </span>
              ) : null}
            </div>

            <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-white/15 bg-black flex items-center justify-center shadow-inner">
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
                  {/* Subtle Corner Shield */}
                  <div className="absolute bottom-0 right-0 w-28 h-8 bg-[#0a0a0c] z-20 pointer-events-none" />
                </div>
              ) : (
                <div className="text-center p-6 text-white/30 space-y-1">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <p className="font-mono text-xs">Chưa có ảnh so sánh</p>
                  <p className="text-[10px] text-white/25">
                    {activeMode === 'direct' 
                      ? 'Tải lên hoặc dán link 2 ảnh ở trên để xem trước slider' 
                      : 'Dán mã iframe ở trên để xem trước'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/70 uppercase block">
                Tiêu đề banner (tuỳ chọn)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Phác thảo vs Bản vẽ hoàn thiện"
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-[#C3EA39] focus:outline-none text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/70 uppercase block">
                Mô tả phụ (tuỳ chọn)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="VD: Kéo thanh trượt để so sánh chi tiết"
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-[#C3EA39] focus:outline-none text-white text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-mono transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.01] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Banner So Sánh</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}