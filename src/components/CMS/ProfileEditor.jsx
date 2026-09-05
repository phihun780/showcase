import React, { useState } from 'react';
import { Plus, Trash2, Check, Upload, Image as ImageIcon, Sparkles, Loader2, Crop } from 'lucide-react';
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
    favicon: profile.favicon || '',
    ogImage: profile.ogImage || '',
    socials: Array.isArray(profile.socials) ? [...profile.socials] : [],
    experience: Array.isArray(profile.experience)
      ? profile.experience.map((e) => ({
          ...e,
          company: e.company === 'Tên Công Ty' ? '' : (e.company || ''),
          role: e.role === 'Chức vụ / Vị trí' ? '' : (e.role || ''),
        }))
      : [],
  });

  const [savedAlert, setSavedAlert] = useState(false);
  const [optimizeNotice, setOptimizeNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

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
        { period: `${new Date().getFullYear()}`, company: '', role: '', isCurrent: false },
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

      {/* Quá Khứ Của Tui (Timeline) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#121216] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-base font-display font-bold text-white">
            Quá Khứ Của Tui
          </h3>

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

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:grid sm:grid-cols-12 gap-2.5 items-stretch sm:items-center"
              >
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    placeholder="Tên công ty"
                    value={exp.company || ''}
                    onChange={(e) => handleExpChange(idx, 'company', e.target.value)}
                    className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-base sm:text-xs font-bold placeholder-white/30"
                  />
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

                <div className="flex items-center gap-2 sm:col-span-5 justify-between">
                  <div className="w-24 sm:w-full sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Năm"
                      value={exp.period || ''}
                      onChange={(e) => handleExpChange(idx, 'period', e.target.value)}
                      className="w-full px-3 py-2 sm:py-1.5 rounded-lg bg-black/60 border border-white/10 text-[#C3EA39] text-base sm:text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="flex-1 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleExpChange(idx, 'isCurrent', !isCurrent)}
                      className={`w-full py-2 sm:py-1.5 px-2 rounded-lg text-xs sm:text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border min-h-[38px] sm:min-h-[32px] ${
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

                  <div className="shrink-0 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveExp(idx)}
                      className="p-2 sm:p-1.5 rounded-lg text-white/40 hover:text-red-400 transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
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
          <h3 className="text-base font-display font-bold text-white">
            Những Nơi Khác
          </h3>

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
          {formData.socials.map((soc, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
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
                  className="p-2 text-white/40 hover:text-red-400 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
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
          ))}
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
