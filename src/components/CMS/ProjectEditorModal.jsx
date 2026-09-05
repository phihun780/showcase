import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Loader2,
  Crop,
  Link as LinkIcon,
  Image as ImageIcon,
  FolderOpen
} from 'lucide-react';
import { optimizeAndUploadToR2, getProjectFolderPath } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';
import ImageCropModal from './ImageCropModal';

export default function ProjectEditorModal({ isOpen, project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    coverImage: '',
    gallery: [],
    year: `${new Date().getFullYear()}`,
  });

  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);
  const [showGalleryUrlInput, setShowGalleryUrlInput] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [optimizeNotice, setOptimizeNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCoverDragging, setIsCoverDragging] = useState(false);
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);

  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState({ type: 'cover', index: null });

  const coverFileInputRef = useRef(null);
  const galleryFileInputRef = useRef(null);

  const showToast = (msg) => {
    setOptimizeNotice(msg);
    setTimeout(() => setOptimizeNotice(''), 3000);
  };

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        subtitle: project.subtitle || '',
        coverImage: project.coverImage || '',
        gallery: Array.isArray(project.gallery) ? [...project.gallery] : [],
        year: project.year || `${new Date().getFullYear()}`,
      });
    } else {
      setFormData({
        title: '',
        subtitle: '',
        coverImage: '',
        gallery: [],
        year: `${new Date().getFullYear()}`,
      });
    }
    setShowCoverUrlInput(false);
    setShowGalleryUrlInput(false);
    setNewGalleryUrl('');
  }, [project, isOpen]);

  if (!isOpen) return null;

  // Process Cover File Upload
  const processCoverFile = async (file) => {
    if (!file) return;
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const projectFolder = getProjectFolderPath(formData.title || project?.title, project?.id || formData.id);
    if (isGif) {
      setIsUploading(true);
      try {
        const oldCover = formData.coverImage;
        const res = await optimizeAndUploadToR2(file, projectFolder);
        if (oldCover && oldCover !== res.url) {
          deleteFromR2(oldCover);
        }
        setFormData(prev => ({ ...prev, coverImage: res.url }));
        showToast('Ảnh GIF đã tải lên Cloudflare R2 ✓');
      } catch (err) {
        console.error("Error uploading GIF cover:", err);
      } finally {
        setIsUploading(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setCropTarget({ type: 'cover', index: null });
        setCropImageSrc(loadEvt.target.result);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processCoverFile(file);
    e.target.value = '';
  };

  const handleCoverDrop = (e) => {
    e.preventDefault();
    setIsCoverDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCoverFile(file);
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
      showToast('Ảnh bìa đã cắt tỷ lệ 16:10 & lưu R2 ✓');
    } else if (cropTarget.type === 'gallery' && cropTarget.index !== null) {
      const newGallery = [...formData.gallery];
      const oldImg = newGallery[cropTarget.index];
      if (oldImg && oldImg !== croppedUrl) {
        deleteFromR2(oldImg);
      }
      newGallery[cropTarget.index] = croppedUrl;
      setFormData(prev => ({ ...prev, gallery: newGallery }));
      showToast('Ảnh chi tiết đã cập nhật ✓');
    }
  };

  // Process Gallery Files
  const processGalleryFiles = async (filesList) => {
    const files = Array.from(filesList || []);
    if (files.length === 0) return;
    setIsUploading(true);
    const projectFolder = getProjectFolderPath(formData.title || project?.title, project?.id || formData.id);
    try {
      const results = await Promise.all(files.map(f => optimizeAndUploadToR2(f, projectFolder)));
      const newImages = results.map(r => r.url);
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, ...newImages]
      }));
      showToast(`Đã thêm ${newImages.length} ảnh chi tiết ✓`);
    } catch (err) {
      console.error("Error optimizing gallery images:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = (e) => {
    processGalleryFiles(e.target.files);
    e.target.value = '';
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault();
    setIsGalleryDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processGalleryFiles(e.dataTransfer.files);
    }
  };

  const handleAddGalleryUrl = () => {
    if (newGalleryUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, newGalleryUrl.trim()]
      }));
      setNewGalleryUrl('');
      setShowGalleryUrlInput(false);
      showToast('Đã thêm URL ảnh vào thư viện ✓');
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
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
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

    const payload = {
      ...formData,
      title: formData.title.trim(),
      subtitle: (formData.subtitle || '').trim(),
      year: (formData.year || `${new Date().getFullYear()}`).trim(),
      coverImage: formData.coverImage || "",
      gallery: Array.isArray(formData.gallery) ? formData.gallery : [],
    };

    onSave(payload);
    onClose();
  };

  const isCoverGif = formData.coverImage && (
    formData.coverImage.startsWith('data:image/gif') ||
    formData.coverImage.toLowerCase().endsWith('.gif')
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#121216] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] text-white overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#16161c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C3EA39]" />
            <h3 className="text-base sm:text-lg font-display font-bold text-white tracking-wide">
              {project ? 'Sửa Dự Án' : 'Thêm Dự Án Mới'}
            </h3>
            {optimizeNotice && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C3EA39]/10 text-[#C3EA39] text-xs font-mono font-medium animate-fadeIn">
                <Sparkles className="w-3 h-3" />
                <span>{optimizeNotice}</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-[#C3EA39] text-white/70 hover:text-black flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          id="project-editor-form"
          className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5"
        >
          {/* Mobile Toast Notice */}
          {optimizeNotice && (
            <div className="sm:hidden p-2.5 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/20 text-[#C3EA39] text-xs font-mono flex items-center gap-1.5 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{optimizeNotice}</span>
            </div>
          )}

          {/* Top Section: General Info (Compact Inputs) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3.5">
            {/* Project Title */}
            <div>
              <label className="text-[11px] font-mono text-white/50 block mb-1 uppercase tracking-wider">
                Tên dự án <span className="text-[#C3EA39]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: AKFOOD | Shopee Setup 2025"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-[#C3EA39] focus:text-white text-white text-sm font-medium focus:outline-none transition-colors"
              />
            </div>

            {/* Year */}
            <div>
              <label className="text-[11px] font-mono text-white/50 block mb-1 uppercase tracking-wider">
                Năm thực hiện
              </label>
              <input
                type="text"
                placeholder="2025"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-[#C3EA39] text-white text-sm font-mono focus:outline-none transition-colors"
              />
            </div>

            {/* Short Description */}
            <div>
              <label className="text-[11px] font-mono text-white/50 block mb-1 uppercase tracking-wider">
                Mô tả ngắn
              </label>
              <textarea
                rows={2}
                placeholder="Mô tả tóm tắt về dự án..."
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-[#C3EA39] text-white text-sm focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Bottom Section: Media (Cover on Left, Gallery on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Left Card (5 cols): Ảnh Bìa Chính */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C3EA39]" />
                  <span>Ảnh Bìa (16:10)</span>
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowCoverUrlInput(prev => !prev)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-[#C3EA39] text-xs font-mono transition-colors"
                    title="Dán link ảnh"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Tải ảnh</span>
                  </button>
                </div>
              </div>

              {/* Cover URL Toggle Input */}
              {showCoverUrlInput && (
                <div className="animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Dán link ảnh bìa (https://...)"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 focus:border-[#C3EA39] text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Cover Image Preview or Dropzone */}
              {formData.coverImage ? (
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-black group shadow-lg">
                  <img
                    src={formData.coverImage}
                    alt="Cover Preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[#C3EA39] text-[10px] font-mono font-bold border border-white/15">
                    {isCoverGif ? 'GIF' : '16:10'}
                  </div>

                  {/* Hover Actions Toolbar */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
                    {!isCoverGif && (
                      <button
                        type="button"
                        onClick={handleOpenCropForCurrentCover}
                        className="px-3 py-1.5 rounded-lg bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        title="Cắt / Căn chỉnh ảnh bìa"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Cắt lại</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
                      title="Đổi ảnh khác"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (formData.coverImage) {
                          deleteFromR2(formData.coverImage);
                        }
                        setFormData({ ...formData, coverImage: '' });
                      }}
                      className="p-1.5 rounded-lg bg-red-500/30 hover:bg-red-500 text-red-300 hover:text-white transition-colors cursor-pointer"
                      title="Xóa ảnh bìa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsCoverDragging(true); }}
                  onDragLeave={() => setIsCoverDragging(false)}
                  onDrop={handleCoverDrop}
                  onClick={() => coverFileInputRef.current?.click()}
                  className={`aspect-[16/10] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-4 cursor-pointer group ${
                    isCoverDragging
                      ? 'border-[#C3EA39] bg-[#C3EA39]/10'
                      : 'border-white/10 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-white/30 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all mb-1.5" />
                  <span className="text-xs font-mono font-bold text-white/70 group-hover:text-white transition-colors">
                    Chọn ảnh bìa
                  </span>
                  <span className="text-[10px] font-mono text-white/30 mt-0.5">
                    Kéo thả hoặc bấm vào đây
                  </span>
                </div>
              )}

              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {/* Right Card (7 cols): Thư Viện Ảnh Chi Tiết */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-[#16161c]/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-[#C3EA39]" />
                    <span>Thư Viện Chi Tiết</span>
                  </span>
                  <span className="px-2 py-0.2 rounded-md bg-white/10 text-white/60 text-[11px] font-mono">
                    {formData.gallery.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowGalleryUrlInput(prev => !prev)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-[#C3EA39] text-xs font-mono transition-colors"
                    title="Dán link ảnh"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#C3EA39] text-white hover:text-black text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm ảnh</span>
                  </button>
                </div>
              </div>

              {/* Gallery URL Toggle Input */}
              {showGalleryUrlInput && (
                <div className="flex gap-1.5 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Dán link ảnh chi tiết (https://...)"
                    value={newGalleryUrl}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGalleryUrl();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 focus:border-[#C3EA39] text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryUrl}
                    className="px-3 py-1.5 rounded-lg bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              )}

              {/* Gallery Thumbnails Grid or Dropzone */}
              {formData.gallery.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-0.5">
                  {formData.gallery.map((img, idx) => {
                    const isGif = img.startsWith('data:image/gif') || img.toLowerCase().endsWith('.gif');
                    return (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black group shadow-sm"
                      >
                        <img
                          src={img}
                          alt={`Gallery ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Top Left Tag */}
                        <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-white/60 text-[9px] font-mono z-10 pointer-events-none">
                          #{idx + 1}
                        </span>

                        {isGif && (
                          <span className="absolute top-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[#C3EA39] text-[8px] font-mono font-bold z-10 pointer-events-none">
                            GIF
                          </span>
                        )}

                        {/* Action Hover Controls */}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20 backdrop-blur-xs">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveGalleryItem(idx, 'left')}
                              className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                              title="Sang trái"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isGif && (
                            <button
                              type="button"
                              onClick={() => handleOpenCropForGalleryItem(idx)}
                              className="p-1 rounded bg-white/20 hover:bg-[#C3EA39] text-white hover:text-black transition-colors"
                              title="Cắt ảnh"
                            >
                              <Crop className="w-3 h-3" />
                            </button>
                          )}

                          {idx < formData.gallery.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveGalleryItem(idx, 'right')}
                              className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                              title="Sang phải"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryItem(idx)}
                            className="p-1 rounded bg-red-500/30 hover:bg-red-500 text-red-200 hover:text-white transition-colors"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add more tile */}
                  <div
                    onClick={() => galleryFileInputRef.current?.click()}
                    className="aspect-video rounded-lg border border-dashed border-white/15 hover:border-[#C3EA39] bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 text-white/40 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all" />
                    <span className="text-[10px] font-mono text-white/40 group-hover:text-white transition-colors mt-0.5">
                      Thêm
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsGalleryDragging(true); }}
                  onDragLeave={() => setIsGalleryDragging(false)}
                  onDrop={handleGalleryDrop}
                  onClick={() => galleryFileInputRef.current?.click()}
                  className={`aspect-[16/9] sm:aspect-[21/9] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-4 cursor-pointer group ${
                    isGalleryDragging
                      ? 'border-[#C3EA39] bg-[#C3EA39]/10'
                      : 'border-white/10 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-white/30 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all mb-1.5" />
                  <span className="text-xs font-mono font-bold text-white/70 group-hover:text-white transition-colors">
                    Tải nhiều ảnh chi tiết
                  </span>
                  <span className="text-[10px] font-mono text-white/30 mt-0.5">
                    Kéo thả hoặc bấm để chọn file
                  </span>
                </div>
              )}

              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                multiple
                onChange={handleGalleryUpload}
                className="hidden"
              />
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-white/10 bg-[#16161c] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {isUploading && (
              <span className="text-xs font-mono text-[#C3EA39] font-bold flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải ảnh lên Cloud...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer min-h-[38px]"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="project-editor-form"
              disabled={isUploading}
              className="px-5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] disabled:opacity-50 text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#C3EA39]/15 hover:scale-[1.01] active:scale-95 min-h-[38px]"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Dự Án</span>
            </button>
          </div>
        </div>

      </div>

      {/* Interactive Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        mode="project"
        initialAspectRatio={16 / 10}
        folderPrefix={getProjectFolderPath(formData.title || project?.title, project?.id || formData.id)}
        onCropComplete={handleCropComplete}
        onClose={() => setIsCropOpen(false)}
      />

    </div>
  );
}

