import React, { useState } from 'react';
import { Plus, Trash2, Check, Upload, Image as ImageIcon, Sparkles, Loader2, Crop, GripVertical, Edit3 } from 'lucide-react';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2 } from '../../utils/r2Storage';
import ImageCropModal from './ImageCropModal';

export default function ProfileEditor({ profile, onSave }) {
  const [formData, setFormData] = useState({
    name: profile.name || 'Phi Hùng',
    title: profile.title || 'Graphic Designer',
    avatar: profile.avatar || profile.image || '',
    subtitle: profile.subtitle || 'Đây là nơi mình lưu giữ các sản phẩm được làm ra trong thời gian qua, bạn ghé rồi thì xem qua thử nhaaa ^^',
    cvUrl: profile.cvUrl || profile.resumeUrl || '',
    location: profile.location || 'Tp. Buôn Ma Thuột, Đắk Lắk',
    email: profile.email || 'phihung.contact@example.com',
    tabTitle: profile.tabTitle || 'Phi Hùng — Graphic Designer | Portfolio Showcase',
    experienceTitle: profile.experienceTitle || 'Quá Khứ Của Tui',
    socialsTitle: profile.socialsTitle || 'Những Nơi Khác',
    favicon: profile.favicon || '',
    ogImage: profile.ogImage || '',

    // Header Customization
    headerTitle1: profile.headerTitle1 || 'PORTFOLIO // SHOWCASE',
    headerTitle2: profile.headerTitle2 || 'GRAPHIC DESIGNER',
    headerNavWork: profile.headerNavWork || 'Dự án của tui',
    headerNavAbout: profile.headerNavAbout || 'Về tui',

    // Hero Customization
    heroTitleRow1: profile.heroTitleRow1 || 'SHOW',
    heroTitleRow2: profile.heroTitleRow2 || 'CASE.',
    heroCtaText: profile.heroCtaText || 'Dạo xem 1 vòng',

    // Section Headings Customization
    section01Number: profile.section01Number || '01',
    section01Title: profile.section01Title || 'Tùm lum tà la',
    section01Subtitle: profile.section01Subtitle || 'Những sản phẩm này được làm ra lúc rảnh rỗi và có hứng làm gì đó...',

    section02Number: profile.section02Number || '02',
    section02Title: profile.section02Title || 'Dự án của tui',

    section03Number: profile.section03Number || '03',
    section03Title: profile.section03Title || 'Về tui',
    cvButtonText: profile.cvButtonText || 'TẢI CV / RESUME (PDF)',

    // Footer Customization
    footerCopyright: profile.footerCopyright || profile.name || 'Phi Hùng',
    footerTagline: profile.footerTagline || 'Graphic Designer Portfolio',

    socials: Array.isArray(profile.socials) ? [...profile.socials] : [],
    experience: Array.isArray(profile.experience)
      ? profile.experience.map((e) => ({
          ...e,
          company: e.company === 'Tên Công Ty' ? '' : (e.company || ''),
          role: e.role === 'Chức vụ / Vị trí' ? '' : (e.role || ''),
          url: e.url || e.link || e.companyUrl || '',
        }))
      : [],
  });

  const [savedAlert, setSavedAlert] = useState(false);
  const [optimizeNotice, setOptimizeNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  // Drag & drop state for Experience list
  const [draggedExpIndex, setDraggedExpIndex] = useState(null);
  const [dragOverExpIndex, setDragOverExpIndex] = useState(null);
  const [canDragExp, setCanDragExp] = useState(false);

  // Drag & drop state for Socials list
  const [draggedSocialIndex, setDraggedSocialIndex] = useState(null);
  const [dragOverSocialIndex, setDragOverSocialIndex] = useState(null);
  const [canDragSocial, setCanDragSocial] = useState(false);

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const res = await optimizeAndUploadToR2(file, 'banner');
        setFormData(prev => ({ ...prev, favicon: res.url }));
        setOptimizeNotice('Favicon đã tải lên thành công ✓');
        setTimeout(() => setOptimizeNotice(''), 3000);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (ev) => setFormData(prev => ({ ...prev, favicon: ev.target.result }));
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
  };

  const handleOgImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const res = await optimizeAndUploadToR2(file, 'banner');
        setFormData(prev => ({ ...prev, ogImage: res.url }));
        setOptimizeNotice('Thumbnail chia sẻ đã tải lên thành công ✓');
        setTimeout(() => setOptimizeNotice(''), 3000);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (ev) => setFormData(prev => ({ ...prev, ogImage: ev.target.result }));
        reader.readAsDataURL(file);
      } finally {
        setIsUploading(false);
      }
    }
    e.target.value = '';
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (isGif) {
        setIsUploading(true);
        try {
          const res = await optimizeAndUploadToR2(file, 'avatar');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
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

              <div className="space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">
                  Lời giới thiệu Section 1 (Subtitle Hero)
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  placeholder="Đây là nơi mình lưu giữ..."
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-mono text-white/70 uppercase block">
                  Link Tải CV / Resume (PDF / Google Drive / URL)
                </label>
                <input
                  type="text"
                  value={formData.cvUrl || ''}
                  placeholder="https://drive.google.com/... hoặc /cv.pdf"
                  onChange={(e) => setFormData({ ...formData, cvUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Header & Footer Text Customization Panel */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-base font-display font-bold text-white">
            Nội Dung Header & Footer (Thanh Điều Hướng & Chân Trang)
          </h3>
        </div>

        {/* Header Customization */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            1. Header (Logo Chạy Chữ & Menu Điều Hướng)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Chữ chạy Logo 1 (Góc trái)
              </label>
              <input
                type="text"
                value={formData.headerTitle1 || ''}
                placeholder="PORTFOLIO // SHOWCASE"
                onChange={(e) => setFormData({ ...formData, headerTitle1: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Chữ chạy Logo 2 (Góc trái)
              </label>
              <input
                type="text"
                value={formData.headerTitle2 || ''}
                placeholder="GRAPHIC DESIGNER"
                onChange={(e) => setFormData({ ...formData, headerTitle2: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tên nút Menu 1 (Dự Án)
              </label>
              <input
                type="text"
                value={formData.headerNavWork || ''}
                placeholder="Dự án của tui"
                onChange={(e) => setFormData({ ...formData, headerNavWork: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tên nút Menu 2 (Về Tui)
              </label>
              <input
                type="text"
                value={formData.headerNavAbout || ''}
                placeholder="Về tui"
                onChange={(e) => setFormData({ ...formData, headerNavAbout: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Customization */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            2. Footer (Chân Trang)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tên bản quyền © (Footer Name)
              </label>
              <input
                type="text"
                value={formData.footerCopyright || ''}
                placeholder="Phi Hùng"
                onChange={(e) => setFormData({ ...formData, footerCopyright: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Chức danh / Tagline Chân Trang
              </label>
              <input
                type="text"
                value={formData.footerTagline || ''}
                placeholder="Graphic Designer Portfolio"
                onChange={(e) => setFormData({ ...formData, footerTagline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hero & Section Headings Customization Panel */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-base font-display font-bold text-white">
            Nội Dung Hero & Tiêu Đề Các Đầu Mục (Sections 01, 02, 03)
          </h3>
        </div>

        {/* Hero Headline & CTA */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            Phần Mở Đầu (Hero Banner)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tiêu đề lớn 1 (Chữ trên)
              </label>
              <input
                type="text"
                value={formData.heroTitleRow1 || ''}
                placeholder="SHOW"
                onChange={(e) => setFormData({ ...formData, heroTitleRow1: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tiêu đề lớn 2 (Chữ dưới)
              </label>
              <input
                type="text"
                value={formData.heroTitleRow2 || ''}
                placeholder="CASE."
                onChange={(e) => setFormData({ ...formData, heroTitleRow2: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">
                Tên nút bấm cuộn
              </label>
              <input
                type="text"
                value={formData.heroCtaText || ''}
                placeholder="Dạo xem 1 vòng"
                onChange={(e) => setFormData({ ...formData, heroCtaText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 01: Tùm Lum Tà La */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            Mục 01 (Tác phẩm ngẫu hứng / Random Works)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Số mục</label>
              <input
                type="text"
                value={formData.section01Number || ''}
                placeholder="01"
                onChange={(e) => setFormData({ ...formData, section01Number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-[#C3EA39] font-mono font-bold text-center text-base sm:text-xs"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Tiêu đề mục</label>
              <input
                type="text"
                value={formData.section01Title || ''}
                placeholder="Tùm lum tà la"
                onChange={(e) => setFormData({ ...formData, section01Title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs"
              />
            </div>

            <div className="sm:col-span-6 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Mô tả phụ</label>
              <input
                type="text"
                value={formData.section01Subtitle || ''}
                placeholder="Những sản phẩm này được làm ra lúc rảnh rỗi..."
                onChange={(e) => setFormData({ ...formData, section01Subtitle: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 02: Dự Án */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            Mục 02 (Dự Án Nổi Bật / Projects)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Số mục</label>
              <input
                type="text"
                value={formData.section02Number || ''}
                placeholder="02"
                onChange={(e) => setFormData({ ...formData, section02Number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-[#C3EA39] font-mono font-bold text-center text-base sm:text-xs"
              />
            </div>

            <div className="sm:col-span-10 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Tiêu đề mục</label>
              <input
                type="text"
                value={formData.section02Title || ''}
                placeholder="Dự án của tui"
                onChange={(e) => setFormData({ ...formData, section02Title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 03: Về Tui */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase block">
            Mục 03 (Về Tui & Hồ Sơ / About)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Số mục</label>
              <input
                type="text"
                value={formData.section03Number || ''}
                placeholder="03"
                onChange={(e) => setFormData({ ...formData, section03Number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-[#C3EA39] font-mono font-bold text-center text-base sm:text-xs"
              />
            </div>

            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Tiêu đề mục</label>
              <input
                type="text"
                value={formData.section03Title || ''}
                placeholder="Về tui"
                onChange={(e) => setFormData({ ...formData, section03Title: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs"
              />
            </div>

            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-mono text-white/70 uppercase block">Tên nút Tải CV</label>
              <input
                type="text"
                value={formData.cvButtonText || ''}
                placeholder="TẢI CV / RESUME (PDF)"
                onChange={(e) => setFormData({ ...formData, cvButtonText: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white font-bold text-base sm:text-xs font-mono"
              />
            </div>
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
                  value={soc.url}
                  onChange={(e) => handleSocialChange(idx, 'url', e.target.value)}
                  placeholder="URL (https://...)"
                  className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-base sm:text-xs font-mono text-white/70"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Nhận Diện, Tiêu Đề Tab & Thumbnail (SEO / Favicon / OpenGraph) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="pb-2 border-b border-white/10">
          <h3 className="text-base font-display font-bold text-white">
            Tiêu Đề Tab Trình Duyệt, Favicon & Thumbnail Chia Sẻ
          </h3>
        </div>

        {/* 1. Tiêu đề Tab Trình duyệt */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase">
              1. Tiêu đề Tab Trình duyệt (Browser Tab Title)
            </span>
            <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10 w-fit">
              Hiển thị trên tab Chrome, Safari...
            </span>
          </div>
          <input
            type="text"
            value={formData.tabTitle || ''}
            onChange={(e) => setFormData({ ...formData, tabTitle: e.target.value })}
            placeholder="Phi Hùng — Graphic Designer | Portfolio Showcase"
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-[#C3EA39] focus:outline-none text-white text-base sm:text-sm font-medium placeholder-white/30"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 2. Favicon */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase">
                2. Favicon (Icon tab web)
              </span>
              <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                1:1 • 64×64px
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview icon */}
              <div className="w-12 h-12 rounded-xl bg-black border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {formData.favicon ? (
                  <img src={formData.favicon} alt="Favicon" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-lg text-[#C3EA39] font-black">✦</span>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={formData.favicon}
                  onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
                  placeholder="Dán link ảnh favicon..."
                  className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-base sm:text-xs font-mono text-white focus:outline-none focus:border-[#C3EA39]"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white text-xs sm:text-[11px] font-mono font-bold transition-all cursor-pointer min-h-[36px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh Favicon</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico,.png,.svg"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Social Preview Thumbnail (OpenGraph) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-[#C3EA39] uppercase">
                3. Thumbnail Chia Sẻ (Zalo / FB)
              </span>
              <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                1200×630px
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview image */}
              <div className="w-20 aspect-[1.91/1] rounded-lg bg-black border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {formData.ogImage ? (
                  <img src={formData.ogImage} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-white/30" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={formData.ogImage}
                  onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                  placeholder="Dán link ảnh thumbnail..."
                  className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-base sm:text-xs font-mono text-white focus:outline-none focus:border-[#C3EA39]"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white text-xs sm:text-[11px] font-mono font-bold transition-all cursor-pointer min-h-[36px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh Thumbnail</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    onChange={handleOgImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-30 p-3.5 sm:p-4 rounded-2xl bg-[#121216]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-3">
        {savedAlert ? (
          <span className="text-xs font-mono text-[#C3EA39] font-bold flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Đã lưu thành công!</span>
          </span>
        ) : (
          <span className="text-xs font-mono text-white/40 hidden sm:inline">
            Nhớ bấm lưu sau khi thay đổi thông tin
          </span>
        )}

        <button
          type="submit"
          className="ml-auto px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.01] cursor-pointer min-h-[42px]"
        >
          <Check className="w-4 h-4" />
          <span>Lưu Thay Đổi</span>
        </button>
      </div>

      {/* Avatar Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropImageSrc}
        mode="portrait"
        initialAspectRatio={3 / 4}
        projectTitle={formData.name || 'Ảnh Chân Dung'}
        projectSubtitle={formData.title || 'Mục Về tui'}
        onCropComplete={handleCropAvatarComplete}
        onClose={() => setIsCropOpen(false)}
      />

    </form>
  );
}
