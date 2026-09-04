import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, ArrowUp, ArrowDown, Check, Sparkles, Loader2, Crop } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';
import ImageCropModal from './ImageCropModal';

export default function ProjectEditorModal({ isOpen, project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    coverImage: '',
    gallery: [],
    year: `${new Date().getFullYear()}`,
    tags: 'Graphic Design, Branding',
  });

  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [optimizeNotice, setOptimizeNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState({ type: 'cover', index: null });

  const showOptimizedToast = (msg = 'Hình ảnh đã được tối ưu dung lượng (chất lượng cao) ✓') => {
    setOptimizeNotice(msg);
    setTimeout(() => setOptimizeNotice(''), 3500);
  };

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        subtitle: project.subtitle || '',
        coverImage: project.coverImage || '',
        gallery: Array.isArray(project.gallery) ? [...project.gallery] : [],
        year: project.year || `${new Date().getFullYear()}`,
        tags: Array.isArray(project.tags) ? project.tags.join(', ') : (project.tags || ''),
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        coverImage: '',
        gallery: [],
        year: `${new Date().getFullYear()}`,
        tags: 'Graphic Design, Branding',
      });
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (isGif) {
        setIsUploading(true);
        try {
          const oldCover = formData.coverImage;
          const res = await optimizeAndUploadToR2(file, 'projects');
          if (oldCover && oldCover !== res.url) {
            deleteFromR2(oldCover);
          }
          setFormData(prev => ({ ...prev, coverImage: res.url }));
          showOptimizedToast('Ảnh GIF đã tải lên Cloudflare R2 ✓');
        } catch (err) {
          console.error("Error uploading GIF cover:", err);
        } finally {
          setIsUploading(false);
        }
      } else {
        // Read file and open Crop Tool
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          setCropTarget({ type: 'cover', index: null });
          setCropImageSrc(loadEvt.target.result);
          setIsCropOpen(true);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleOpenCropForCurrentCover = () => {
    if (formData.coverImage) {
      setCropTarget({ type: 'cover', index: null });
      setCropImageSrc(formData.coverImage);
      setIsCropOpen(true);
    }
  };

  const handleOpenCropForGalleryItem = (idx) => {
    const img = formData.gallery[idx];
    if (img) {
      setCropTarget({ type: 'gallery', index: idx });
      setCropImageSrc(img);
      setIsCropOpen(true);
    }
  };

  const handleCropComplete = (croppedUrl) => {
    if (cropTarget.type === 'cover') {
      const oldCover = formData.coverImage;
      if (oldCover && oldCover !== croppedUrl) {
        deleteFromR2(oldCover);
      }
      setFormData(prev => ({ ...prev, coverImage: croppedUrl }));
      showOptimizedToast('Ảnh bìa đã được cắt chuẩn tỷ lệ 16:10 & lưu R2 ✓');
    } else if (cropTarget.type === 'gallery' && cropTarget.index !== null) {
      const newGallery = [...formData.gallery];
      const oldImg = newGallery[cropTarget.index];
      if (oldImg && oldImg !== croppedUrl) {
        deleteFromR2(oldImg);
      }
      newGallery[cropTarget.index] = croppedUrl;
      setFormData(prev => ({ ...prev, gallery: newGallery }));
      showOptimizedToast('Ảnh chi tiết đã được cắt & cập nhật ✓');
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsUploading(true);
      try {
        const results = await Promise.all(files.map(f => optimizeAndUploadToR2(f, 'projects')));
        const newImages = results.map(r => r.url);
        setFormData(prev => ({
          ...prev,
          gallery: [...prev.gallery, ...newImages]
        }));
        const anyR2 = results.some(r => r.isR2);
        showOptimizedToast(anyR2 ? 'Thư viện ảnh đã tải lên Cloudflare R2 & tối ưu ✓' : 'Hình ảnh đã được tối ưu dung lượng (chất lượng cao) ✓');
      } catch (err) {
        console.error("Error optimizing gallery images:", err);
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
  };

  const handleAddGalleryUrl = () => {
    if (newGalleryUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, newGalleryUrl.trim()]
      }));
      setNewGalleryUrl('');
    }
  };

  const handleRemoveGalleryItem = (idxToRemove) => {
    const imgToRemove = formData.gallery[idxToRemove];
    if (imgToRemove) {
      deleteFromR2(imgToRemove);
    }
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handleMoveGalleryItem = (idx, direction) => {
    setFormData(prev => {
      const newGallery = [...prev.gallery];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newGallery.length) return prev;
      const temp = newGallery[idx];
      newGallery[idx] = newGallery[targetIdx];
      newGallery[targetIdx] = temp;
      return { ...prev, gallery: newGallery };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.title.trim()) {
      alert("Vui lòng nhập tên dự án!");
      return;
    }

    let parsedTags = ["Graphic Design", "Branding"];
    if (typeof formData.tags === 'string') {
      parsedTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(formData.tags)) {
      parsedTags = formData.tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean);
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      subtitle: (formData.subtitle || '').trim(),
      year: (formData.year || `${new Date().getFullYear()}`).trim(),
      tags: parsedTags.length > 0 ? parsedTags : ["Graphic Design"],
      coverImage: formData.coverImage || "",
      gallery: Array.isArray(formData.gallery) ? formData.gallery : [],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#121216] border border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-lg sm:text-xl font-display font-bold text-white">
            {project ? 'Sửa Dự Án' : 'Thêm Dự Án Mới'}
          </h3>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#C3EA39] hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optimized Notice Toast */}
        {optimizeNotice && (
          <div className="p-3 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 text-[#C3EA39] text-xs font-mono font-bold flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{optimizeNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-white/70 uppercase block">
              Tên Dự Án <span className="text-[#C3EA39]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Brand Identity 2024, Visual Design..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-sm"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-white/70 uppercase block">
              Mô Tả Ngắn
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả tóm tắt về dự án..."
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-sm"
            />
          </div>

          {/* Year and Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Năm Thực Hiện
              </label>
              <input
                type="text"
                placeholder="VD: 2024"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Thẻ / Tags (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                placeholder="VD: Graphic Design, Branding"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-black/30 border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/80 uppercase block">
                Ảnh Bìa / GIF
              </label>
              <label className="cursor-pointer text-xs font-mono text-black bg-[#C3EA39] hover:bg-[#d4f854] px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors">
                <Upload className="w-3 h-3" />
                <span>Chọn ảnh / GIF từ máy</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            </div>

            <input
              type="text"
              placeholder="Hoặc dán URL ảnh / GIF (https://...)"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-xs font-mono"
            />

            {formData.coverImage && (
              <div className="space-y-2 mt-1">
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/15 bg-black max-h-[180px] group">
                  <img
                    src={formData.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  {(formData.coverImage.startsWith('data:image/gif') || formData.coverImage.toLowerCase().endsWith('.gif')) ? (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[#C3EA39] text-[10px] font-mono font-bold border border-[#C3EA39]/40">
                      GIF
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white/80 text-[10px] font-mono border border-white/20">
                      Tỷ lệ 16:10
                    </span>
                  )}

                  {/* Re-crop button */}
                  <button
                    type="button"
                    onClick={handleOpenCropForCurrentCover}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-white hover:text-black text-xs font-mono font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer shadow-lg"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Cắt / Căn chỉnh</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gallery Images / GIFs */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-black/30 border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/80 uppercase block">
                Ảnh & GIF Chi Tiết ({formData.gallery.length})
              </label>

              <label className="cursor-pointer text-xs font-mono text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1 transition-colors">
                <Upload className="w-3 h-3 text-[#C3EA39]" />
                <span>Chọn nhiều ảnh / GIF</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Hoặc dán URL ảnh chi tiết (https://...)"
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGalleryUrl();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddGalleryUrl}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span>Thêm</span>
              </button>
            </div>

            {/* Gallery Thumbnails List */}
            {formData.gallery.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                {formData.gallery.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black group"
                  >
                    <img
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {(img.startsWith('data:image/gif') || img.toLowerCase().endsWith('.gif')) && (
                      <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded bg-black/80 text-[#C3EA39] text-[9px] font-mono font-bold border border-[#C3EA39]/40 z-10 pointer-events-none">
                        GIF
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                      <button
                        type="button"
                        onClick={() => handleOpenCropForGalleryItem(idx)}
                        className="p-1 rounded bg-white/20 hover:bg-[#C3EA39] hover:text-black text-white"
                        title="Cắt / Căn chỉnh ảnh này"
                      >
                        <Crop className="w-3 h-3" />
                      </button>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveGalleryItem(idx, 'up')}
                          className="p-1 rounded bg-white/20 hover:bg-[#C3EA39] hover:text-black text-white"
                          title="Lên trước"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < formData.gallery.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveGalleryItem(idx, 'down')}
                          className="p-1 rounded bg-white/20 hover:bg-[#C3EA39] hover:text-black text-white"
                          title="Xuống sau"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryItem(idx)}
                        className="p-1 rounded bg-red-500/40 hover:bg-red-500 text-white"
                        title="Xoá ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Dự Án</span>
            </button>
          </div>

        </form>

      </div>

      {/* Interactive Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        mode="project"
        initialAspectRatio={16 / 10}
        projectTitle={formData.title}
        projectSubtitle={formData.subtitle}
        onCropComplete={handleCropComplete}
        onClose={() => setIsCropOpen(false)}
      />

    </div>
  );
}
