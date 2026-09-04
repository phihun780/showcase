import React, { useState, useRef, useEffect } from 'react';
import { usePortfolioData, defaultMarqueeItems } from '../../context/PortfolioDataContext';
import ProjectEditorModal from './ProjectEditorModal';
import ProfileEditor from './ProfileEditor';
import ImageCropModal from './ImageCropModal';
import JuxtaposeEmbedModal from './JuxtaposeEmbedModal';
import BeforeAfterSlider from '../BeforeAfterSlider';
import CMSAuthGate from './CMSAuthGate';
import SeasonalAtmosphere from '../SeasonalAtmosphere';
import { extractEmbedSrc } from '../../utils/juxtaposeUtils';
import { optimizeAndUploadToR2 } from '../../utils/imageOptimizer';
import { deleteFromR2, deleteMultipleFromR2 } from '../../utils/r2Storage';
import {
  FolderKanban,
  User,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Image as ImageIcon,
  Snowflake,
  SunMedium,
  CheckCircle2,
  Ban,
  MoveHorizontal,
  Type,
  Lock,
  Crop,
  Eye,
  X,
  SlidersHorizontal,
  Check
} from 'lucide-react';

const AUTH_STORAGE_KEY = 'phihung_cms_authenticated';
const AUTH_TIMESTAMP_KEY = 'phihung_cms_last_active';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function CMSPage({ onBackToPortfolio }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const isAuth =
        localStorage.getItem(AUTH_STORAGE_KEY) === 'true' ||
        sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
      if (!isAuth) return false;

      const lastActive = localStorage.getItem(AUTH_TIMESTAMP_KEY) || sessionStorage.getItem(AUTH_TIMESTAMP_KEY);
      if (lastActive) {
        const timePassed = Date.now() - parseInt(lastActive, 10);
        if (timePassed >= INACTIVITY_TIMEOUT_MS) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_TIMESTAMP_KEY);
          sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
          sessionStorage.setItem('phihung_cms_session_expired', 'true');
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  });

  const handleLogout = (isExpired = false) => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
    if (isExpired) {
      sessionStorage.setItem('phihung_cms_session_expired', 'true');
    }
    setIsAuthenticated(false);
  };

  // 30-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateActivity = () => {
      const now = String(Date.now());
      try {
        if (localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
          localStorage.setItem(AUTH_TIMESTAMP_KEY, now);
        } else {
          sessionStorage.setItem(AUTH_TIMESTAMP_KEY, now);
        }
      } catch (e) {}
    };

    // Update timestamp on mount
    updateActivity();

    // Throttled user interaction listener
    let lastRecorded = Date.now();
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastRecorded > 10000) { // update at most every 10s
        lastRecorded = now;
        updateActivity();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Periodic check every 15 seconds
    const interval = setInterval(() => {
      try {
        const lastActive = localStorage.getItem(AUTH_TIMESTAMP_KEY) || sessionStorage.getItem(AUTH_TIMESTAMP_KEY);
        if (lastActive) {
          const timePassed = Date.now() - parseInt(lastActive, 10);
          if (timePassed >= INACTIVITY_TIMEOUT_MS) {
            handleLogout(true);
          }
        }
      } catch (e) {}
    }, 15000);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserInteraction));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const {
    projects,
    profile,
    coverBanners,
    randomWorks,
    marqueeItems,
    seasonalEffect,
    addProject,
    updateProject,
    updateProjectsList,
    deleteProject,
    moveProject,
    updateProfile,
    addCoverBanner,
    updateCoverBanner,
    deleteCoverBanner,
    moveCoverBanner,
    updateCoverBannersList,
    addRandomWork,
    deleteRandomWork,
    moveRandomWork,
    updateRandomWorksList,
    addMarqueeItem,
    deleteMarqueeItem,
    updateMarqueeItem,
    updateMarqueeItems,
    updateSeasonalEffect,
    resetToDefault,
    exportDataJSON,
    importDataJSON,
  } = usePortfolioData();

  const [activeTab, setActiveTab] = useState('projects');
  const [editingProject, setEditingProject] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newMarqueeText, setNewMarqueeText] = useState('');
  const [cropModalConfig, setCropModalConfig] = useState(null);
  const [previewingImage, setPreviewingImage] = useState(null);
  const fileInputRef = useRef(null);
  const projectFileInputRef = useRef(null);
  const coverBannerFileInputRef = useRef(null);
  const randomWorkFileInputRef = useRef(null);

  if (!isAuthenticated) {
    return (
      <CMSAuthGate
        onAuthenticated={() => setIsAuthenticated(true)}
        onBackToPortfolio={onBackToPortfolio}
      />
    );
  }

  const handleOpenCreate = () => {
    setEditingProject(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (proj) => {
    setEditingProject(proj);
    setIsEditorOpen(true);
  };

  const handleSaveProject = (formData) => {
    if (editingProject) {
      updateProject(editingProject.id, formData);
    } else {
      addProject(formData);
    }
  };

  const handleDeleteProject = (proj) => {
    if (window.confirm(`Xoá dự án "${proj.title}"?`)) {
      // Automatically clean up all related images from Cloudflare R2
      const imagesToDelete = [proj.coverImage, ...(proj.gallery || [])].filter(Boolean);
      deleteMultipleFromR2(imagesToDelete);
      deleteProject(proj.id);
    }
  };

  // 0. Project Handlers (Immediate Crop on Upload + Re-crop)
  const handleUploadNewProject = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'project',
          editingIndex: null, // new project
          title: file.name.replace(/\.[^/.]+$/, "") || "Dự án mới",
          subtitle: "Dự án thiết kế sáng tạo",
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // 1. Cover Banners Handlers (Immediate Crop on Upload + Re-crop)
  const handleUploadCoverBanner = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'banner',
          editingIndex: null, // new banner
          title: "",
          subtitle: "",
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const [embedModalConfig, setEmbedModalConfig] = useState(null);

  const handleOpenAddEmbedBanner = () => {
    setEmbedModalConfig({
      isOpen: true,
      editingIndex: null,
      embedCode: '',
      embedUrl: '',
      beforeImage: '',
      afterImage: '',
      beforeLabel: '',
      afterLabel: '',
      title: '',
      subtitle: '',
    });
  };

  const handleOpenEditEmbedBanner = (banner, idx) => {
    setEmbedModalConfig({
      isOpen: true,
      editingIndex: idx,
      embedCode: banner.embedCode || banner.embedUrl || '',
      embedUrl: banner.embedUrl || '',
      beforeImage: banner.beforeImage || '',
      afterImage: banner.afterImage || '',
      beforeLabel: banner.beforeLabel || '',
      afterLabel: banner.afterLabel || '',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
    });
  };

  const handleSaveEmbedBanner = (data) => {
    if (embedModalConfig?.editingIndex !== null && embedModalConfig?.editingIndex !== undefined) {
      const idx = embedModalConfig.editingIndex;
      const updated = [...coverBanners];
      updated[idx] = {
        ...updated[idx],
        type: 'embed',
        embedCode: data.embedCode || '',
        embedUrl: data.embedUrl || '',
        beforeImage: data.beforeImage || '',
        afterImage: data.afterImage || '',
        beforeLabel: data.beforeLabel || '',
        afterLabel: data.afterLabel || '',
        title: data.title || '',
        subtitle: data.subtitle || '',
      };
      updateCoverBannersList(updated);
    } else {
      addCoverBanner({
        type: 'embed',
        embedCode: data.embedCode || '',
        embedUrl: data.embedUrl || '',
        beforeImage: data.beforeImage || '',
        afterImage: data.afterImage || '',
        beforeLabel: data.beforeLabel || '',
        afterLabel: data.afterLabel || '',
        title: data.title || '',
        subtitle: data.subtitle || '',
        image: data.afterImage || '',
      });
    }
    setEmbedModalConfig(null);
  };

  const handleReCropBanner = (banner, idx) => {
    setCropModalConfig({
      isOpen: true,
      imageSrc: banner.image,
      mode: 'banner',
      editingIndex: idx, // editing existing banner
      title: banner.title || '',
      subtitle: banner.subtitle || '',
    });
  };

  const handleAddCoverBannerUrl = () => {
    const url = window.prompt("Nhập đường dẫn URL ảnh banner:");
    if (url && url.trim()) {
      const title = window.prompt("Nhập tiêu đề banner (hoặc để trống):") || "";
      addCoverBanner({
        type: 'image',
        title: title.trim(),
        subtitle: "",
        image: url.trim(),
      });
    }
  };

  // 2. Random Works Handlers (Immediate Crop on Upload + Re-crop)
  const handleUploadRandomWork = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (isGif) {
        // Direct upload to preserve GIF animation
        try {
          const res = await optimizeAndUploadToR2(file, 'random');
          addRandomWork({
            title: file.name.replace(/\.[^/.]+$/, "") || "Artwork mới",
            subtitle: "Tác phẩm lúc rảnh rỗi",
            image: res.url,
          });
        } catch (err) {
          console.error("Error uploading GIF to R2:", err);
        }
      } else {
        // Open 1:1 square crop tool
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          setCropModalConfig({
            isOpen: true,
            imageSrc: loadEvent.target.result,
            mode: 'random',
            editingIndex: null, // new artwork
            title: file.name.replace(/\.[^/.]+$/, "") || "Artwork mới",
            subtitle: "Tác phẩm lúc rảnh rỗi",
          });
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleReCropRandomWork = (work, idx) => {
    setCropModalConfig({
      isOpen: true,
      imageSrc: work.image,
      mode: 'random',
      editingIndex: idx, // editing existing artwork
      title: work.title || `Artwork ${idx + 1}`,
      subtitle: work.subtitle || '',
    });
  };

  const handleAddRandomWorkUrl = () => {
    const url = window.prompt("Nhập đường dẫn URL ảnh artwork:");
    if (url && url.trim()) {
      const title = window.prompt("Nhập tên tác phẩm (hoặc để trống):") || "Artwork mới";
      addRandomWork({
        title: title.trim(),
        subtitle: "Tác phẩm lúc rảnh rỗi",
        image: url.trim(),
      });
    }
  };

  // Unified Crop Modal Save Handler
  const handleUnifiedCropComplete = (croppedUrl) => {
    if (!cropModalConfig) return;

    if (cropModalConfig.mode === 'project') {
      if (cropModalConfig.editingIndex !== null) {
        // Replace existing project cover image
        const newArr = [...projects];
        const oldImg = newArr[cropModalConfig.editingIndex]?.coverImage;
        if (oldImg && oldImg !== croppedUrl) {
          deleteFromR2(oldImg);
        }
        newArr[cropModalConfig.editingIndex] = {
          ...newArr[cropModalConfig.editingIndex],
          coverImage: croppedUrl,
        };
        updateProjectsList(newArr);
      } else {
        // Add new project from direct crop upload
        addProject({
          title: cropModalConfig.title || "Dự án mới",
          subtitle: cropModalConfig.subtitle || "Mô tả dự án",
          coverImage: croppedUrl,
          category: "Graphic Design",
          tags: ["Graphic Design", "Branding"],
          year: `${new Date().getFullYear()}`,
          gallery: [],
        });
      }
    } else if (cropModalConfig.mode === 'banner') {
      if (cropModalConfig.editingIndex !== null) {
        // Replace existing banner image
        const newArr = [...coverBanners];
        const oldImg = newArr[cropModalConfig.editingIndex]?.image;
        if (oldImg && oldImg !== croppedUrl) {
          deleteFromR2(oldImg);
        }
        newArr[cropModalConfig.editingIndex] = {
          ...newArr[cropModalConfig.editingIndex],
          image: croppedUrl,
        };
        updateCoverBannersList(newArr);
      } else {
        // Add new banner
        addCoverBanner({
          title: cropModalConfig.title || "Slide Banner",
          subtitle: cropModalConfig.subtitle || "Showcase banner",
          image: croppedUrl,
        });
      }
    } else if (cropModalConfig.mode === 'random') {
      if (cropModalConfig.editingIndex !== null) {
        // Replace existing random work image
        const newArr = [...randomWorks];
        const oldImg = newArr[cropModalConfig.editingIndex]?.image;
        if (oldImg && oldImg !== croppedUrl) {
          deleteFromR2(oldImg);
        }
        newArr[cropModalConfig.editingIndex] = {
          ...newArr[cropModalConfig.editingIndex],
          image: croppedUrl,
        };
        updateRandomWorksList(newArr);
      } else {
        // Add new random work
        addRandomWork({
          title: cropModalConfig.title || "Artwork mới",
          subtitle: cropModalConfig.subtitle || "Tác phẩm lúc rảnh rỗi",
          image: croppedUrl,
        });
      }
    }

    setCropModalConfig(null);
  };

  const moveMarqueeItem = (index, direction) => {
    const newArr = [...marqueeItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    updateMarqueeItems(newArr);
  };

  const handleAddNewMarquee = (e) => {
    e.preventDefault();
    if (newMarqueeText && newMarqueeText.trim()) {
      addMarqueeItem(newMarqueeText.trim());
      setNewMarqueeText('');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importDataJSON(file);
        alert("Đã nhập dữ liệu thành công!");
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#EDEDED] font-sans antialiased selection:bg-[#C3EA39] selection:text-black relative">
      
      {/* Live Seasonal Atmosphere Overlay */}
      <SeasonalAtmosphere />

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-[#08080A]/90 backdrop-blur-xl border-b border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Left: Brand & Exit */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPortfolio}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Xem Web</span>
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs sm:text-sm tracking-wider text-white flex items-center gap-1.5">
                <span className="text-[#C3EA39] text-base leading-none">✦</span> PHI HÙNG CMS
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                v2.0 PRO
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Live Cloudflare R2 Connected Indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 text-[#C3EA39] font-mono text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-pulse" />
              <span className="font-bold">Cloudflare R2 ✓</span>
            </div>

            <button
              onClick={exportDataJSON}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/75 hover:text-white flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Xuất bản sao lưu dữ liệu toàn bộ website ra file JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span className="hidden md:inline">Xuất JSON</span>
              <span className="md:hidden">Xuất</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/75 hover:text-white flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Nhập dữ liệu website từ file sao lưu JSON"
            >
              <Upload className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span className="hidden md:inline">Nhập JSON</span>
              <span className="md:hidden">Nhập</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              onClick={resetToDefault}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Khôi phục dữ liệu mẫu mặc định ban đầu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] hover:text-black text-white/80 flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Khóa bảo mật CMS"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khóa CMS</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        
        {/* Sleek Full-Width Tab Navigation Bar */}
        <div className="w-full pb-4 border-b border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 p-1.5 rounded-2xl bg-[#121216] border border-white/10 shadow-lg w-full divide-x divide-white/10">
            <div className="px-1">
              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Dự Án</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  activeTab === 'projects' ? 'bg-[#C3EA39]/15 text-[#C3EA39]' : 'bg-white/10 text-white/50'
                }`}>
                  {projects.length < 10 ? `0${projects.length}` : projects.length}
                </span>
              </button>
            </div>

            <div className="px-1">
              <button
                onClick={() => setActiveTab('banner')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'banner'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Slide Banner</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  activeTab === 'banner' ? 'bg-[#C3EA39]/15 text-[#C3EA39]' : 'bg-white/10 text-white/50'
                }`}>
                  {coverBanners.length < 10 ? `0${coverBanners.length}` : coverBanners.length}
                </span>
              </button>
            </div>

            <div className="px-1">
              <button
                onClick={() => setActiveTab('random')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'random'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Tùm Lum Tà La</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  activeTab === 'random' ? 'bg-[#C3EA39]/15 text-[#C3EA39]' : 'bg-white/10 text-white/50'
                }`}>
                  {randomWorks.length < 10 ? `0${randomWorks.length}` : randomWorks.length}
                </span>
              </button>
            </div>

            <div className="px-1">
              <button
                onClick={() => setActiveTab('marquee')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'marquee'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Chữ Chạy</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                  activeTab === 'marquee' ? 'bg-[#C3EA39]/15 text-[#C3EA39]' : 'bg-white/10 text-white/50'
                }`}>
                  {marqueeItems.length < 10 ? `0${marqueeItems.length}` : marqueeItems.length}
                </span>
              </button>
            </div>

            <div className="px-1">
              <button
                onClick={() => setActiveTab('seasonal')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'seasonal'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Hiệu Ứng</span>
                {seasonalEffect !== 'none' && (
                  <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-ping" />
                )}
              </button>
            </div>

            <div className="px-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'text-[#C3EA39]'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Thông Tin</span>
              </button>
            </div>
          </div>

          {/* Hidden File Inputs for Direct Crop Actions */}
          <input
            ref={projectFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
            onChange={handleUploadNewProject}
            className="hidden"
          />
          <input
            ref={coverBannerFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadCoverBanner}
            className="hidden"
          />
          <input
            ref={randomWorkFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
            onChange={handleUploadRandomWork}
            className="hidden"
          />
        </div>

        {/* Tab 1: Dự án */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div
                onClick={handleOpenCreate}
                className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-[#121216]/50 hover:bg-[#121216] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                  <Plus className="w-7 h-7" />
                </div>
                <p className="font-display font-bold text-white text-lg">Chưa có dự án nào</p>
                <p className="text-xs sm:text-sm text-white/50 mt-1 font-mono max-w-md">
                  Bấm vào đây để tạo và tải ảnh dự án đầu tiên lên website
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {projects.map((proj, idx) => {
                  const isGif = proj.coverImage && (proj.coverImage.startsWith('data:image/gif') || proj.coverImage.toLowerCase().endsWith('.gif'));
                  const galleryCount = Array.isArray(proj.gallery) ? proj.gallery.length : 0;
                  const tagsArr = Array.isArray(proj.tags) ? proj.tags : (typeof proj.tags === 'string' ? proj.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

                  return (
                    <div
                      key={proj.id || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-[#121216] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-lg"
                    >
                      {/* Left: Thumbnail, Number & Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="text-xs font-mono font-bold text-[#C3EA39] w-7 text-center shrink-0">
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        
                        {/* Thumbnail with overlay crop button */}
                        <div className="relative w-24 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 group/thumb">
                          {proj.coverImage ? (
                            <>
                              <img
                                src={proj.coverImage}
                                alt={proj.title}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                              />
                              {isGif && (
                                <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded bg-black/80 text-[#C3EA39] text-[9px] font-mono font-bold border border-[#C3EA39]/40">
                                  GIF
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCropModalConfig({
                                    isOpen: true,
                                    imageSrc: proj.coverImage,
                                    mode: 'project',
                                    editingIndex: idx,
                                    title: proj.title,
                                    subtitle: proj.subtitle,
                                  });
                                }}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-[#C3EA39] cursor-pointer"
                                title="Cắt lại ảnh bìa này (16:10)"
                              >
                                <Crop className="w-3.5 h-3.5" />
                                <span>Cắt lại</span>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/25 text-[10px] font-mono">
                              Không có ảnh
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-display font-bold text-white truncate">
                              {proj.title}
                            </h3>
                            {proj.year && (
                              <span className="text-[10px] font-mono text-[#C3EA39] px-2 py-0.5 rounded-full bg-[#C3EA39]/10 border border-[#C3EA39]/30">
                                {proj.year}
                              </span>
                            )}
                            {galleryCount > 0 && (
                              <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                {galleryCount} ảnh chi tiết
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/60 font-light truncate max-w-xl">
                            {proj.subtitle || 'Chưa có mô tả ngắn'}
                          </p>

                          {tagsArr.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {tagsArr.map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] font-mono text-white/40 bg-white/[0.04] px-2 py-0.2 rounded-md border border-white/5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-1.5 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0">
                        <button
                          onClick={() => moveProject(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 transition-colors cursor-pointer"
                          title="Di chuyển lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => moveProject(idx, 'down')}
                          disabled={idx === projects.length - 1}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 transition-colors cursor-pointer"
                          title="Di chuyển xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(proj)}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-[#C3EA39] hover:text-black text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa Dự Án</span>
                        </button>

                        <button
                          onClick={() => handleDeleteProject(proj)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors cursor-pointer"
                          title="Xoá dự án"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
                {/* Quick Add Project Card */}
                <div
                  onClick={handleOpenCreate}
                  className="p-4 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Plus className="w-4 h-4 text-white/40 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all" />
                  <span className="text-xs font-mono font-bold text-white/60 group-hover:text-white transition-colors">
                    + Thêm Dự Án Mới
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Slide Banner Cover (Hỗ trợ Ảnh 21:9 & Juxtapose Before/After Embed) */}
        {activeTab === 'banner' && (
          <div className="space-y-5">
            
            {/* Top Action Controls Bar */}
            <div className="p-4 rounded-2xl bg-[#121216] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white">
                    Quản Lý Banner Cover & Juxtapose
                  </h3>
                  <p className="text-[11px] font-mono text-white/50">
                    Hỗ trợ slide ảnh tĩnh (21:9) và mã nhúng so sánh ảnh Trước/Sau (Juxtapose)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => coverBannerFileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Tải Ảnh (21:9)</span>
                </button>

                <button
                  onClick={handleOpenAddEmbedBanner}
                  className="px-4 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Thêm Juxtapose Embed</span>
                </button>

                <button
                  onClick={handleAddCoverBannerUrl}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-mono transition-colors cursor-pointer"
                  title="Nhập trực tiếp URL ảnh"
                >
                  <span>🔗 URL Ảnh</span>
                </button>
              </div>
            </div>

            {coverBanners.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Upload 21:9 Image */}
                <div
                  onClick={() => coverBannerFileInputRef.current?.click()}
                  className="p-10 rounded-3xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-[#121216]/50 hover:bg-[#121216] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 text-white/70 group-hover:text-[#C3EA39] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-display font-bold text-white text-base">Tải Ảnh Slide Banner (21:9)</p>
                  <p className="text-xs text-white/50 mt-1 font-mono max-w-xs">
                    Tải ảnh cover định dạng 21:9 chuẩn góc nhìn rộng.
                  </p>
                </div>

                {/* Option 2: Add Juxtapose Embed */}
                <div
                  onClick={handleOpenAddEmbedBanner}
                  className="p-10 rounded-3xl border-2 border-dashed border-[#C3EA39]/30 hover:border-[#C3EA39] bg-[#C3EA39]/5 hover:bg-[#C3EA39]/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/20 text-[#C3EA39] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <SlidersHorizontal className="w-6 h-6" />
                  </div>
                  <p className="font-display font-bold text-white text-base">Thêm Juxtapose Before / After</p>
                  <p className="text-xs text-white/50 mt-1 font-mono max-w-xs">
                    Dán mã embed hoặc link từ juxtapose.knightlab.com để tạo thanh kéo so sánh 2 ảnh.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {coverBanners.map((banner, idx) => {
                  const isEmbed = banner.type === 'embed' || Boolean(banner.embedCode || banner.embedUrl);
                  const embedSrc = extractEmbedSrc(banner.embedUrl || banner.embedCode || banner.image);

                  return (
                    <div
                      key={banner.id || idx}
                      className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#121216] group flex flex-col hover:border-[#C3EA39]/40 transition-all shadow-xl"
                    >
                      {/* Widescreen Cover Preview (Locked 21:9 Aspect Ratio) */}
                      <div className="relative aspect-[21/9] w-full overflow-hidden bg-black border-b border-white/5">
                        {banner.beforeImage && banner.afterImage ? (
                          <BeforeAfterSlider
                            beforeImage={banner.beforeImage}
                            afterImage={banner.afterImage}
                            beforeLabel={banner.beforeLabel}
                            afterLabel={banner.afterLabel}
                          />
                        ) : isEmbed && embedSrc ? (
                          <div className="relative w-full h-full overflow-hidden">
                            <iframe
                              src={embedSrc}
                              title={banner.title || 'Juxtapose'}
                              className="absolute -top-2 left-0 w-full h-[120%] border-0 pointer-events-auto bg-[#0a0a0c]"
                              allowFullScreen
                              loading="lazy"
                            />
                            {/* Corner Shield */}
                            <div className="absolute bottom-0 right-0 w-24 h-7 bg-[#0a0a0c] z-20 pointer-events-none" />
                          </div>
                        ) : (
                          <img
                            src={banner.image}
                            alt={banner.title || `Cover Banner ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}

                        {/* Top Left: Badge Type */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md text-xs font-mono font-bold text-[#C3EA39] border border-white/15 flex items-center gap-1.5 shadow-md">
                          {isEmbed ? (
                            <>
                              <SlidersHorizontal className="w-3 h-3 text-[#C3EA39]" />
                              <span>Juxtapose #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3 text-white/70" />
                              <span>Ảnh #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                            </>
                          )}
                        </div>

                        {/* Top Right: Actions */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          {isEmbed ? (
                            <button
                              onClick={() => handleOpenEditEmbedBanner(banner, idx)}
                              className="px-2 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer border border-[#C3EA39]/40 shadow-md"
                              title="Chỉnh sửa mã nhúng & thông tin Juxtapose"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Sửa mã</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleReCropBanner(banner, idx)}
                                className="px-2 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer border border-[#C3EA39]/30"
                                title="Cắt / Căn chỉnh lại ảnh banner (21:9)"
                              >
                                <Crop className="w-3 h-3" />
                                <span>Cắt lại</span>
                              </button>
                              <button
                                onClick={() => setPreviewingImage(banner.image)}
                                className="p-1.5 rounded-lg bg-black/75 hover:bg-white text-white/80 hover:text-black transition-colors cursor-pointer border border-white/10"
                                title="Xem ảnh đầy đủ"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm("Xoá banner cover này?")) {
                                if (banner.image && !isEmbed) deleteFromR2(banner.image);
                                deleteCoverBanner(banner.id || idx);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-black/75 hover:bg-red-500 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10 shadow-md"
                            title="Xoá banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Form Fields & Reorder Controls */}
                      <div className="p-4 space-y-3 bg-[#121216] flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-mono text-white/40 block mb-1 uppercase tracking-wider">
                              Tiêu đề banner (tuỳ chọn)
                            </label>
                            <input
                              type="text"
                              value={banner.title || ''}
                              placeholder="Nhập tiêu đề (VD: So Sánh Bản Vẽ...)"
                              onChange={(e) => {
                                const newArr = [...coverBanners];
                                newArr[idx] = { ...newArr[idx], title: e.target.value };
                                updateCoverBannersList(newArr);
                              }}
                              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-[#C3EA39] focus:text-[#C3EA39] transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-white/40 block mb-1 uppercase tracking-wider">
                              Mô tả phụ (tuỳ chọn)
                            </label>
                            <input
                              type="text"
                              value={banner.subtitle || ''}
                              placeholder="Nhập mô tả ngắn..."
                              onChange={(e) => {
                                const newArr = [...coverBanners];
                                newArr[idx] = { ...newArr[idx], subtitle: e.target.value };
                                updateCoverBannersList(newArr);
                              }}
                              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-light text-white/80 placeholder-white/20 focus:outline-none focus:border-[#C3EA39] transition-all"
                            />
                          </div>
                        </div>

                        {/* Footer: Position Reorder */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs font-mono">
                          <span className="text-[11px] text-white/40">Thứ tự hiển thị:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => moveCoverBanner(idx, 'up')}
                              disabled={idx === 0}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Di chuyển lên trước"
                            >
                              <ArrowUp className="w-3 h-3" />
                              <span>Trước</span>
                            </button>
                            <button
                              onClick={() => moveCoverBanner(idx, 'down')}
                              disabled={idx === coverBanners.length - 1}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                              title="Di chuyển ra sau"
                            >
                              <span>Sau</span>
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tùm Lum Tà La (Square Rotating Works) */}
        {activeTab === 'random' && (
          <div className="space-y-5">
            {randomWorks.length === 0 ? (
              <div
                onClick={() => randomWorkFileInputRef.current?.click()}
                className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-[#121216]/50 hover:bg-[#121216] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="font-display font-bold text-white text-lg">Chưa có Artwork Tùm Lum Tà La nào</p>
                <p className="text-xs sm:text-sm text-white/50 mt-1 font-mono max-w-md">
                  Bấm vào đây để tải ảnh vuông hoặc GIF hiển thị trong khung xoay Section 01 Tùm lum tà la.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {randomWorks.map((work, idx) => (
                  <div
                    key={work.id || idx}
                    className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#121216] group flex flex-col hover:border-[#C3EA39]/40 transition-all shadow-xl"
                  >
                    {/* Square Artwork Thumbnail */}
                    <div className="relative aspect-square w-full overflow-hidden bg-black border-b border-white/5">
                      <img
                        src={work.image}
                        alt={work.title || `Artwork ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Top Left: Artwork Number Tag */}
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Artwork #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                      </div>

                      {/* Top Right: Actions */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <button
                          onClick={() => handleReCropRandomWork(work, idx)}
                          className="px-2 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-[11px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer border border-[#C3EA39]/30"
                          title="Cắt / Căn chỉnh lại artwork (1:1)"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Cắt lại</span>
                        </button>
                        <button
                          onClick={() => setPreviewingImage(work.image)}
                          className="p-1.5 rounded-lg bg-black/75 hover:bg-white text-white/80 hover:text-black transition-colors cursor-pointer border border-white/10"
                          title="Xem ảnh đầy đủ"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Xoá artwork này khỏi Tùm lum tà la?")) {
                              if (work.image) deleteFromR2(work.image);
                              deleteRandomWork(work.id || idx);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-black/75 hover:bg-red-500 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
                          title="Xoá artwork"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Form Fields & Reorder Controls */}
                    <div className="p-4 space-y-3 bg-[#121216] flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-mono text-white/40 block mb-1 uppercase tracking-wider">
                            Tên tác phẩm
                          </label>
                          <input
                            type="text"
                            value={work.title || ''}
                            placeholder="Nhập tên tác phẩm..."
                            onChange={(e) => {
                              const newArr = [...randomWorks];
                              newArr[idx] = { ...newArr[idx], title: e.target.value };
                              updateRandomWorksList(newArr);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-[#C3EA39] focus:text-[#C3EA39] transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-white/40 block mb-1 uppercase tracking-wider">
                            Mô tả phụ
                          </label>
                          <input
                            type="text"
                            value={work.subtitle || ''}
                            placeholder="VD: 3D Blender, Typography..."
                            onChange={(e) => {
                              const newArr = [...randomWorks];
                              newArr[idx] = { ...newArr[idx], subtitle: e.target.value };
                              updateRandomWorksList(newArr);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-light text-white/80 placeholder-white/20 focus:outline-none focus:border-[#C3EA39] transition-all"
                          />
                        </div>
                      </div>

                      {/* Footer: Position Reorder */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs font-mono">
                        <span className="text-[11px] text-white/40">Thứ tự hiển thị:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => moveRandomWork(idx, 'up')}
                            disabled={idx === 0}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                            title="Di chuyển lên trước"
                          >
                            <ArrowUp className="w-3 h-3" />
                            <span>Trước</span>
                          </button>
                          <button
                            onClick={() => moveRandomWork(idx, 'down')}
                            disabled={idx === randomWorks.length - 1}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/80 hover:text-white transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                            title="Di chuyển ra sau"
                          >
                            <span>Sau</span>
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}

                {/* Quick Add Card */}
                <div
                  onClick={() => randomWorkFileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center text-center cursor-pointer p-4 group"
                >
                  <Plus className="w-8 h-8 text-white/40 group-hover:text-[#C3EA39] group-hover:scale-110 transition-all mb-2" />
                  <span className="text-xs font-mono font-bold text-white/60 group-hover:text-white transition-colors">
                    + Thêm Artwork Mới
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Chữ Chạy Slide (Marquee) */}
        {activeTab === 'marquee' && (
          <div className="space-y-6">
            
            {/* Live Ticker Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-white/50">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-ping" />
                  <span>Xem trước dòng chữ chạy trực tiếp:</span>
                </span>
                <span>{marqueeItems.length} cụm từ</span>
              </div>

              <div className="py-3.5 px-4 rounded-2xl bg-[#0D0D12] border border-[#C3EA39]/40 overflow-hidden shadow-lg">
                {(() => {
                  const previewList = marqueeItems && marqueeItems.length > 0 ? marqueeItems : defaultMarqueeItems;
                  const repeatCount = Math.max(2, Math.ceil(16 / (previewList.length || 1)));
                  const repeated = Array(repeatCount).fill(previewList).flat();
                  return (
                    <div className="animate-marquee whitespace-nowrap flex items-center text-[#C3EA39] font-mono font-bold text-xs tracking-wider">
                      <div className="flex items-center gap-6 pr-6 shrink-0">
                        {repeated.map((item, idx) => (
                          <span key={`prev1-${idx}`} className="flex items-center gap-2">
                            <span className="text-white/40">✦</span>
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-6 pr-6 shrink-0">
                        {repeated.map((item, idx) => (
                          <span key={`prev2-${idx}`} className="flex items-center gap-2">
                            <span className="text-white/40">✦</span>
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Add New Phrase Form */}
            <form onSubmit={handleAddNewMarquee} className="flex gap-2 p-2 rounded-2xl bg-[#121216] border border-white/10">
              <input
                type="text"
                value={newMarqueeText}
                onChange={(e) => setNewMarqueeText(e.target.value)}
                placeholder="Nhập cụm từ mới (VD: 3D MOTION DESIGN, TYPOGRAPHY...)..."
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={!newMarqueeText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] disabled:opacity-40 text-black font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </form>

            {/* List of Phrases */}
            <div className="space-y-2.5">
              {marqueeItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-4 rounded-2xl bg-[#121216] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-mono font-bold text-[#C3EA39] w-6 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateMarqueeItem(idx, e.target.value)}
                      className="flex-1 bg-transparent text-sm font-mono font-bold text-white focus:outline-none focus:text-[#C3EA39] transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => moveMarqueeItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors"
                      title="Lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => moveMarqueeItem(idx, 'down')}
                      disabled={idx === marqueeItems.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors"
                      title="Xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (marqueeItems.length <= 2) {
                          alert("Nên giữ tối thiểu 2 cụm từ để dòng chữ chạy liên tục mượt mà!");
                          return;
                        }
                        deleteMarqueeItem(idx);
                      }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors cursor-pointer"
                      title="Xoá cụm từ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Reset to Default Terms */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  if (window.confirm("Khôi phục danh sách cụm từ mặc định ban đầu?")) {
                    updateMarqueeItems(defaultMarqueeItems);
                  }
                }}
                className="text-xs font-mono text-white/40 hover:text-[#C3EA39] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Khôi phục các cụm từ mặc định</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 4: Hiệu Ứng Lễ Hội & Khí Quyển */}
        {activeTab === 'seasonal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'none',
                  title: 'Tắt hiệu ứng',
                  desc: 'Giao diện nguyên bản, không có hiệu ứng rơi',
                  icon: '🚫',
                  badge: 'Mặc định',
                },
                {
                  id: 'snow',
                  title: 'Tuyết Rơi',
                  desc: 'Bông tuyết trắng pha lê rơi bồng bềnh (Noel & Mùa đông)',
                  icon: '❄️',
                  badge: 'Mùa Đông',
                },
                {
                  id: 'tet',
                  title: 'Tết Nguyên Đán',
                  desc: 'Cánh hoa mai vàng, hoa đào hồng & lộc xuân bay lượn',
                  icon: '🌸',
                  badge: 'Tết Âm Lịch',
                },
                {
                  id: 'mid_autumn',
                  title: 'Trung Thu',
                  desc: 'Đèn lồng phát sáng lung linh, lá thu vàng rơi & ánh trăng',
                  icon: '🥮',
                  badge: 'Rằm Tháng 8',
                },
              ].map((opt) => {
                const isSelected = seasonalEffect === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => updateSeasonalEffect(opt.id)}
                    className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#121216] border-[#C3EA39] shadow-lg shadow-[#C3EA39]/10'
                        : 'bg-[#121216]/60 border-white/10 hover:border-white/25 hover:bg-[#121216]'
                    }`}
                  >
                    {/* Top Row: Icon & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl sm:text-4xl select-none group-hover:scale-110 transition-transform">
                        {opt.icon}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-[#C3EA39]/20 text-[#C3EA39] border-[#C3EA39]/40 font-bold'
                            : 'bg-white/5 text-white/50 border-white/10'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>

                    {/* Middle Info */}
                    <div className="space-y-1 my-4">
                      <h3 className="text-base font-display font-bold text-white">
                        {opt.title}
                      </h3>
                      <p className="text-xs text-white/60 font-light leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    {/* Bottom Status Button */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs font-mono text-white/40">Trạng thái:</span>
                      {isSelected ? (
                        <span className="text-xs font-mono font-bold text-[#C3EA39] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đang Bật</span>
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-white/40 group-hover:text-white transition-colors">
                          Bấm để bật
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Thông tin cá nhân */}
        {activeTab === 'profile' && (
          <ProfileEditor profile={profile} onSave={updateProfile} />
        )}

      </main>

      {/* Project Editor Modal */}
      <ProjectEditorModal
        isOpen={isEditorOpen}
        project={editingProject}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveProject}
      />

      {/* Juxtapose Before/After Embed Modal */}
      {embedModalConfig && (
        <JuxtaposeEmbedModal
          isOpen={Boolean(embedModalConfig.isOpen)}
          initialData={embedModalConfig}
          onSave={handleSaveEmbedBanner}
          onClose={() => setEmbedModalConfig(null)}
        />
      )}

      {/* Unified Image Crop Modal */}
      {cropModalConfig && (
        <ImageCropModal
          isOpen={Boolean(cropModalConfig.isOpen)}
          imageSrc={cropModalConfig.imageSrc}
          onClose={() => setCropModalConfig(null)}
          onCropComplete={handleUnifiedCropComplete}
          mode={cropModalConfig.mode}
          projectTitle={cropModalConfig.title}
          projectSubtitle={cropModalConfig.subtitle}
        />
      )}

      {/* Fullscreen Preview Lightbox */}
      {previewingImage && (
        <div
          onClick={() => setPreviewingImage(null)}
          className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
        >
          <button
            onClick={() => setPreviewingImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-[#C3EA39] text-white hover:text-black border border-white/20 transition-all cursor-pointer shadow-2xl"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewingImage}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 select-none"
          />
        </div>
      )}

    </div>
  );
}
