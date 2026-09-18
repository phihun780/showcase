import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, Upload, Image as ImageIcon, Sparkles, Loader2, Crop, GripVertical, Edit3, FileText } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2, uploadToR2 } from '../../utils/r2Storage';
import ImageCropModal from './ImageCropModal';
import { laZalo } from '../../utils/lienKetZalo';

/**
 * Khối hồ sơ ở mục 04: ảnh chân dung, CV, hành trình, các liên kết.
 *
 * Phần ô CHỮ thuần (tiêu đề mục, chữ nút, footer, hero…) đã chuyển sang danh
 * mục trong `truongNoiDung.js` và do CMSPage dựng chung một kiểu — ở đây chỉ
 * còn những thứ cần giao diện riêng.
 *
 * Trạng thái form nằm ở CMSPage chứ không nằm đây: cả trang CMS chỉ có MỘT bản
 * nháp hồ sơ và MỘT nút lưu, nên không thể để mỗi khối giữ một bản riêng.
 */
export default function ProfileEditor({ formData, setFormData }) {
  // Tải file CV lên. Cố ý KHÔNG đi qua bộ tối ưu ảnh: nó nén và đổi sang WebP,
  // đúng thứ cần cho ảnh nhưng sẽ phá nát một file PDF. Đẩy thẳng file gốc lên.
  const cvInputRef = useRef(null);
  const [dangTaiCV, setDangTaiCV] = useState(false);
  const [loiCV, setLoiCV] = useState('');

  const taiCVLen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoiCV('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setLoiCV('Chỉ nhận file PDF');
      if (cvInputRef.current) cvInputRef.current.value = '';
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setLoiCV(`File nặng ${(file.size / 1048576).toFixed(1)} MB, tối đa 25 MB`);
      if (cvInputRef.current) cvInputRef.current.value = '';
      return;
    }

    setDangTaiCV(true);
    try {
      // Tên có mốc thời gian nên thay CV mới không bị trình duyệt giữ bản cũ
      // trong bộ nhớ đệm.
      const res = await uploadToR2(file, `profile/cv-${Date.now()}.pdf`, 'application/pdf');
      if (!res?.url) throw new Error('Tải lên thất bại');
      setFormData(prev => ({ ...prev, cvUrl: res.url }));
    } catch (err) {
      setLoiCV(err.message || 'Tải CV thất bại');
    } finally {
      setDangTaiCV(false);
      if (cvInputRef.current) cvInputRef.current.value = '';
    }
  };

  // Mấy trạng thái này bị cắt nhầm lúc gộp khối; khai lại đúng như bản gốc.
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [optimizeNotice, setOptimizeNotice] = useState('');
  const [isCropOpen, setIsCropOpen] = useState(false);

  // Drag & drop state for Experience list
  const [draggedExpIndex, setDraggedExpIndex] = useState(null);
  const [dragOverExpIndex, setDragOverExpIndex] = useState(null);
  const [canDragExp, setCanDragExp] = useState(false);

  // Drag & drop state for Socials list
  const [draggedSocialIndex, setDraggedSocialIndex] = useState(null);
  const [dragOverSocialIndex, setDragOverSocialIndex] = useState(null);
  const [canDragSocial, setCanDragSocial] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (isGif) {
        setIsUploading(true);
        try {
          const res = await optimizeAndUploadToR2(file, 'profile');
          setFormData(prev => ({ ...prev, avatar: res.url }));
          setOptimizeNotice('Ảnh GIF đã tải lên Cloudflare R2 ✓');
          setTimeout(() => setOptimizeNotice(''), 3500);
        } catch (err) {
          console.error("Error optimizing avatar:", err);
        } finally {
          setIsUploading(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const dataUrl = loadEvt.target.result;
          setCropImageSrc(dataUrl);
          setIsCropOpen(true);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleCropAvatarComplete = (croppedUrl) => {
    const oldAvatar = formData.avatar;
    if (oldAvatar && oldAvatar !== croppedUrl) {
      deleteFromR2(oldAvatar);
    }
    setFormData(prev => ({ ...prev, avatar: croppedUrl }));
    setOptimizeNotice('Ảnh đại diện đã được cắt chuẩn tỷ lệ 3:4 & lưu R2 ✓');
    setTimeout(() => setOptimizeNotice(''), 3500);
  };

  const handleSocialChange = (idx, field, val) => {
    const updated = [...formData.socials];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormData(prev => ({ ...prev, socials: updated }));
  };

  const handleAddSocial = () => {
    setFormData(prev => ({
      ...prev,
      socials: [...prev.socials, { name: 'Liên kết', url: 'https://', handle: '' }]
    }));
  };

  const handleRemoveSocial = (idx) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== idx)
    }));
  };

  const handleExpChange = (idx, field, val) => {
    const updated = [...formData.experience];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormData(prev => ({ ...prev, experience: updated }));
  };

  const handleAddExp = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        { period: `${new Date().getFullYear()}`, company: '', role: '', url: '', isCurrent: false },
        ...prev.experience,
      ]
    }));
  };

  const handleRemoveExp = (idx) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx)
    }));
  };

  // Drag & Drop handlers for Experience (Desktop & Mobile)
  const handleExpDragStart = (e, index) => {
    if (!canDragExp) {
      e.preventDefault();
      return;
    }
    setDraggedExpIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
  };

  const handleExpDragOver = (e, index) => {
    e.preventDefault();
    if (draggedExpIndex === null || draggedExpIndex === index) return;
    setDragOverExpIndex(index);
  };

  const handleExpDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedExpIndex === null || draggedExpIndex === targetIndex) {
      setDraggedExpIndex(null);
      setDragOverExpIndex(null);
      setCanDragExp(false);
      return;
    }
    setFormData(prev => {
      const list = [...prev.experience];
      const [movedItem] = list.splice(draggedExpIndex, 1);
      list.splice(targetIndex, 0, movedItem);
      return { ...prev, experience: list };
    });
    setDraggedExpIndex(null);
    setDragOverExpIndex(null);
    setCanDragExp(false);
  };

  const handleExpDragEnd = () => {
    setDraggedExpIndex(null);
    setDragOverExpIndex(null);
    setCanDragExp(false);
  };

  // Mobile Touch handlers for Experience
  const handleExpTouchStart = (e, index) => {
    setDraggedExpIndex(index);
    setDragOverExpIndex(index);
    setCanDragExp(true);
  };

  const handleExpTouchMove = (e) => {
    if (draggedExpIndex === null) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = element?.closest('[data-exp-index]');
    if (card) {
      const targetIdx = parseInt(card.getAttribute('data-exp-index'), 10);
      if (!isNaN(targetIdx) && targetIdx !== dragOverExpIndex) {
        setDragOverExpIndex(targetIdx);
      }
    }
  };

  const handleExpTouchEnd = () => {
    if (draggedExpIndex !== null && dragOverExpIndex !== null && draggedExpIndex !== dragOverExpIndex) {
      setFormData(prev => {
        const list = [...prev.experience];
        const [movedItem] = list.splice(draggedExpIndex, 1);
        list.splice(dragOverExpIndex, 0, movedItem);
        return { ...prev, experience: list };
      });
    }
    setDraggedExpIndex(null);
    setDragOverExpIndex(null);
    setCanDragExp(false);
  };

  // Drag & Drop handlers for Socials (Desktop & Mobile)
  const handleSocialDragStart = (e, index) => {
    if (!canDragSocial) {
      e.preventDefault();
      return;
    }
    setDraggedSocialIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
  };

  const handleSocialDragOver = (e, index) => {
    e.preventDefault();
    if (draggedSocialIndex === null || draggedSocialIndex === index) return;
    setDragOverSocialIndex(index);
  };

  const handleSocialDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedSocialIndex === null || draggedSocialIndex === targetIndex) {
      setDraggedSocialIndex(null);
      setDragOverSocialIndex(null);
      setCanDragSocial(false);
      return;
    }
    setFormData(prev => {
      const list = [...prev.socials];
      const [movedItem] = list.splice(draggedSocialIndex, 1);
      list.splice(targetIndex, 0, movedItem);
      return { ...prev, socials: list };
    });
    setDraggedSocialIndex(null);
    setDragOverSocialIndex(null);
    setCanDragSocial(false);
  };

  const handleSocialDragEnd = () => {
    setDraggedSocialIndex(null);
    setDragOverSocialIndex(null);
    setCanDragSocial(false);
  };

  // Mobile Touch handlers for Socials
  const handleSocialTouchStart = (e, index) => {
    setDraggedSocialIndex(index);
    setDragOverSocialIndex(index);
    setCanDragSocial(true);
  };

  const handleSocialTouchMove = (e) => {
    if (draggedSocialIndex === null) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = element?.closest('[data-social-index]');
    if (card) {
      const targetIdx = parseInt(card.getAttribute('data-social-index'), 10);
      if (!isNaN(targetIdx) && targetIdx !== dragOverSocialIndex) {
        setDragOverSocialIndex(targetIdx);
      }
    }
  };

  const handleSocialTouchEnd = () => {
    if (draggedSocialIndex !== null && dragOverSocialIndex !== null && draggedSocialIndex !== dragOverSocialIndex) {
      setFormData(prev => {
        const list = [...prev.socials];
        const [movedItem] = list.splice(draggedSocialIndex, 1);
        list.splice(dragOverSocialIndex, 0, movedItem);
        return { ...prev, socials: list };
      });
    }
    setDraggedSocialIndex(null);
    setDragOverSocialIndex(null);
    setCanDragSocial(false);
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* 1. Combined Profile & Basic Info Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="pb-3 border-b border-white/10">
          <h3 className="text-base font-display font-bold text-white">
            Thông Tin Cá Nhân & Ảnh Đại Diện
          </h3>
        </div>

        {optimizeNotice && (
          <div className="p-3 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 text-[#C3EA39] text-xs font-mono font-bold flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{optimizeNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Portrait Avatar + Subtle dimension note */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center sm:items-start gap-3 w-full">
            <div className="relative w-full max-w-[200px] aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-xl group mx-auto sm:mx-0">
              {formData.avatar ? (
                <>
                  <img
                    src={formData.avatar}
                    alt={formData.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCropImageSrc(formData.avatar);
                      setIsCropOpen(true);
                    }}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-[11px] font-mono font-bold flex items-center gap-1 border border-[#C3EA39]/40 transition-all cursor-pointer shadow-lg z-20"
                    title="Cắt / Căn chỉnh lại ảnh đại diện"
                  >
                    <Crop className="w-3 h-3" />
                    <span>Cắt lại</span>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/30 p-4 text-center">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-[11px] font-mono">Chưa có ảnh</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="text-xs font-display font-bold text-white truncate">
                  {formData.name}
                </span>
                <span className="text-[10px] font-mono text-[#C3EA39] truncate">
                  {formData.title}
                </span>
              </div>
            </div>

            {/* Upload button & Subtle note */}
            <div className="w-full max-w-[200px] space-y-1.5 text-center sm:text-left mx-auto sm:mx-0">
              <label className="w-full cursor-pointer text-xs font-mono text-black bg-[#C3EA39] hover:bg-[#d4f854] px-3 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] min-h-[40px]">
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh / GIF</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] font-mono text-white/35 leading-tight text-center">
                Khuyên dùng: Dọc 3:4 • 800×1000px
              </p>
            </div>
          </div>

          {/* Right Column: Basic Information Form Inputs */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">Tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">Chức danh</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Hồ sơ CV — nút tải CV ở mục 04 */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-sm sm:text-base font-display font-bold text-white">Hồ sơ CV</h3>
          <p className="text-[11px] font-mono text-white/50 mt-0.5">File PDF khách bấm nút là tải về</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Tên nút Tải CV</label>
              <input
                type="text"
                value={formData.cvButtonText || ''}
                placeholder="TẢI CV / RESUME (PDF)"
                onChange={(e) => setFormData({ ...formData, cvButtonText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-sm"
              />
            </div>

            <div className="sm:col-span-7 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                File CV (PDF)
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={cvInputRef}
                  accept="application/pdf,.pdf"
                  onChange={taiCVLen}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  disabled={dangTaiCV}
                  className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {dangTaiCV
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Đang tải...</span></>
                    : <><Upload className="w-3.5 h-3.5" /><span>{formData.cvUrl ? 'Đổi CV' : 'Tải CV Lên'}</span></>}
                </button>

                <input
                  type="text"
                  value={formData.cvUrl || ''}
                  placeholder="Hoặc dán link Google Drive..."
                  onChange={(e) => setFormData({ ...formData, cvUrl: e.target.value })}
                  className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm font-mono"
                />

                {formData.cvUrl && (
                  <a
                    href={formData.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Mở CV hiện tại để xem"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                )}
              </div>

              {loiCV && <p className="text-[11px] font-mono text-red-400">{loiCV}</p>}
            </div>
        </div>
      </div>

      {/* Quá Khứ Của Tui (Timeline) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.experienceTitle || 'Quá Khứ Của Tui'}
              onChange={(e) => setFormData({ ...formData, experienceTitle: e.target.value })}
              placeholder="Quá Khứ Của Tui"
              className="text-base font-display font-bold text-white bg-transparent border-b border-dashed border-white/25 hover:border-[#C3EA39] focus:border-[#C3EA39] focus:outline-none transition-colors max-w-xs cursor-text px-1 py-0.5"
              title="Nhấp chuột vào để đổi tên tiêu đề mục này"
            />
            <Edit3 className="w-3.5 h-3.5 text-white/30" />
          </div>

          <button
            type="button"
            onClick={handleAddExp}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer min-h-[34px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="space-y-3">
          {formData.experience.map((exp, idx) => {
            const isCurrent = Boolean(exp.isCurrent);
            const isDragging = draggedExpIndex === idx;
            const isOver = dragOverExpIndex === idx;

            return (
              <div
                key={idx}
                data-exp-index={idx}
                draggable={canDragExp && draggedExpIndex === idx}
                onDragStart={(e) => handleExpDragStart(e, idx)}
                onDragOver={(e) => handleExpDragOver(e, idx)}
                onDrop={(e) => handleExpDrop(e, idx)}
                onDragEnd={handleExpDragEnd}
                className={`p-3.5 rounded-xl bg-black/40 border transition-all flex flex-col sm:grid sm:grid-cols-12 gap-2.5 items-stretch sm:items-start ${
                  isDragging
                    ? 'opacity-40 border-[#C3EA39] scale-[0.99] border-dashed'
                    : isOver
                    ? 'border-[#C3EA39] bg-[#C3EA39]/5 shadow-lg shadow-[#C3EA39]/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="sm:col-span-4 flex items-start gap-1.5">
                  <div
                    onMouseDown={() => {
                      setCanDragExp(true);
                      setDraggedExpIndex(idx);
                    }}
                    onMouseUp={() => setCanDragExp(false)}
                    onTouchStart={(e) => handleExpTouchStart(e, idx)}
                    onTouchMove={handleExpTouchMove}
                    onTouchEnd={handleExpTouchEnd}
                    className="p-1 text-white/30 hover:text-[#C3EA39] cursor-grab active:cursor-grabbing shrink-0 pt-2 select-none touch-none rounded hover:bg-white/5 transition-colors"
                    title="Giữ và kéo để đổi thứ tự công ty"
                  >
                    <GripVertical className="w-4 h-4 pointer-events-none" />
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="text"
                      placeholder="Tên công ty"
                      value={exp.company || ''}
                      onChange={(e) => handleExpChange(idx, 'company', e.target.value)}
                      className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-base sm:text-xs font-bold placeholder-white/30"
                    />
                    <input
                      type="text"
                      placeholder="🔗 Link web cty (tuỳ chọn)"
                      value={exp.url || ''}
                      onChange={(e) => handleExpChange(idx, 'url', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg bg-black/30 border border-white/5 focus:border-[#C3EA39]/50 text-white/80 text-[11px] font-mono placeholder-white/20"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Chức vụ / Vị trí"
                    value={exp.role || ''}
                    onChange={(e) => handleExpChange(idx, 'role', e.target.value)}
                    className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-white/90 text-base sm:text-xs font-normal placeholder-white/30"
                  />
                </div>

                <div className="flex items-center gap-2 sm:contents">
                  {/* Ô Năm: Ngắn gọn, căn giữa */}
                  <div className="w-24 sm:w-auto sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Năm"
                      value={exp.period || ''}
                      onChange={(e) => handleExpChange(idx, 'period', e.target.value)}
                      className="w-full px-2 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-[#C3EA39] text-base sm:text-xs font-mono font-bold text-center placeholder-white/30"
                    />
                  </div>

                  {/* Nút Đang làm / Đã nghỉ: Rộng rãi */}
                  <div className="flex-1 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleExpChange(idx, 'isCurrent', !isCurrent)}
                      className={`w-full py-2 sm:py-1.5 px-2 rounded-lg text-xs sm:text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border min-h-[38px] sm:min-h-[32px] whitespace-nowrap ${
                        isCurrent
                          ? 'bg-[#C3EA39]/15 text-[#C3EA39] border-[#C3EA39]/40 shadow-sm shadow-[#C3EA39]/10'
                          : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:bg-white/10'
                      }`}
                      title="Bật: Đang làm việc tại đây (sáng) / Tắt: Quá khứ (mờ)"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-[#C3EA39] animate-pulse' : 'bg-white/30'}`} />
                      <span>{isCurrent ? 'Đang làm' : 'Đã nghỉ'}</span>
                    </button>
                  </div>

                  {/* Nút Xoá */}
                  <div className="shrink-0 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveExp(idx)}
                      className="p-2 sm:p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                      title="Xoá mục này"
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Những Nơi Khác (Socials) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.socialsTitle || 'Những Nơi Khác'}
              onChange={(e) => setFormData({ ...formData, socialsTitle: e.target.value })}
              placeholder="Những Nơi Khác"
              className="text-base font-display font-bold text-white bg-transparent border-b border-dashed border-white/25 hover:border-[#C3EA39] focus:border-[#C3EA39] focus:outline-none transition-colors max-w-xs cursor-text px-1 py-0.5"
              title="Nhấp chuột vào để đổi tên tiêu đề mục này"
            />
            <Edit3 className="w-3.5 h-3.5 text-white/30" />
          </div>

          <button
            type="button"
            onClick={handleAddSocial}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white text-xs font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer min-h-[34px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {formData.socials.map((soc, idx) => {
            const isDragging = draggedSocialIndex === idx;
            const isOver = dragOverSocialIndex === idx;

            return (
              <div
                key={idx}
                data-social-index={idx}
                draggable={canDragSocial && draggedSocialIndex === idx}
                onDragStart={(e) => handleSocialDragStart(e, idx)}
                onDragOver={(e) => handleSocialDragOver(e, idx)}
                onDrop={(e) => handleSocialDrop(e, idx)}
                onDragEnd={handleSocialDragEnd}
                className={`p-3.5 rounded-xl bg-black/40 border transition-all space-y-2 ${
                  isDragging
                    ? 'opacity-40 border-[#C3EA39] scale-[0.99] border-dashed'
                    : isOver
                    ? 'border-[#C3EA39] bg-[#C3EA39]/5 shadow-lg shadow-[#C3EA39]/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    onMouseDown={() => {
                      setCanDragSocial(true);
                      setDraggedSocialIndex(idx);
                    }}
                    onMouseUp={() => setCanDragSocial(false)}
                    onTouchStart={(e) => handleSocialTouchStart(e, idx)}
                    onTouchMove={handleSocialTouchMove}
                    onTouchEnd={handleSocialTouchEnd}
                    className="p-1 text-white/30 hover:text-[#C3EA39] cursor-grab active:cursor-grabbing shrink-0 select-none touch-none rounded hover:bg-white/5 transition-colors"
                    title="Giữ và kéo để đổi thứ tự liên kết"
                  >
                    <GripVertical className="w-4 h-4 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    value={soc.name}
                    onChange={(e) => handleSocialChange(idx, 'name', e.target.value)}
                    placeholder="Tên nút"
                    className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-bold text-base sm:text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(idx)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg cursor-pointer"
                    title="Xoá liên kết"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  inputMode={laZalo(soc) ? 'tel' : 'url'}
                  value={soc.url}
                  onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                  placeholder={laZalo(soc) ? 'Số điện thoại, ví dụ 0901234567' : 'URL (https://...)'}
                  className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-base sm:text-xs font-mono text-white/70"
                />

              </div>
            );
          })}
        </div>
      </div>


      {/* Khung cắt ảnh đại diện chân dung 3:4 */}
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        mode="portrait"
        initialAspectRatio={3 / 4}
        folderPrefix="profile"
        onCropComplete={handleCropAvatarComplete}
        onClose={() => setIsCropOpen(false)}
      />

    </div>
  );
}
