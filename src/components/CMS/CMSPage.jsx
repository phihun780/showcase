import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { usePortfolioData, defaultMarqueeItems } from '../../context/PortfolioDataContext';
import ProjectEditorModal from './ProjectEditorModal';
import ProfileEditor from './ProfileEditor';
import ImageCropModal from './ImageCropModal';
import JuxtaposeEmbedModal from './JuxtaposeEmbedModal';
import MediaItemEditorModal from './MediaItemEditorModal';
import BeforeAfterSlider from '../BeforeAfterSlider';
import CMSAuthGate from './CMSAuthGate';
import SeasonalAtmosphere from '../SeasonalAtmosphere';
import { extractEmbedSrc } from '../../utils/juxtaposeUtils';
import { optimizeAndUploadToR2, getProjectFolderPath } from '../../utils/imageOptimizer';
import { deleteFromR2, deleteMultipleFromR2, deleteFolderFromR2, clearCmsToken } from '../../utils/r2Storage';
import {
  FolderKanban,
  User,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
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
  Check,
  Loader2
} from 'lucide-react';

const AUTH_STORAGE_KEY = 'phihung_cms_authenticated';
const AUTH_TIMESTAMP_KEY = 'phihung_cms_last_active';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function StickySaveBar({ isSaved, onSave, isSyncing, label = "Lưu Thay Đổi", hint = "Nhớ bấm lưu sau khi thay đổi dữ liệu" }) {
  return (
    <div className="sticky bottom-4 z-30 p-3.5 sm:p-4 rounded-2xl bg-[#121216]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-3 animate-fadeIn">
      {isSaved ? (
        <span className="text-xs font-mono text-[#C3EA39] font-bold flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>Đã lưu thành công!</span>
        </span>
      ) : isSyncing ? (
        <span className="text-xs font-mono text-[#C3EA39] font-bold flex items-center gap-1.5 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang lưu lên Cloud...</span>
        </span>
      ) : (
        <span className="text-xs font-mono text-white/40 hidden sm:inline">
          {hint}
        </span>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isSyncing}
        className="ml-auto px-6 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] disabled:opacity-50 text-black font-display font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.01] cursor-pointer min-h-[42px] active:scale-95"
      >
        {isSyncing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang Lưu...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}

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
          clearCmsToken();
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
    clearCmsToken();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    sessionStorage.removeItem(AUTH_TIMESTAMP_KEY);
    if (isExpired) {
      sessionStorage.setItem('phihung_cms_session_expired', 'true');
    }
    setIsAuthenticated(false);
  };

  // Ensure scroll is at top immediately when CMSPage loads
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

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
    saveToCloud,
    isCloudSyncing,
    syncStatus,
    lastSavedTime,
    resetToDefault,
  } = usePortfolioData();

  const [activeTab, setActiveTab] = useState('projects');
  const [editingProject, setEditingProject] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newMarqueeText, setNewMarqueeText] = useState('');
  const [cropModalConfig, setCropModalConfig] = useState(null);
  const [previewingImage, setPreviewingImage] = useState(null);
  const [embedModalConfig, setEmbedModalConfig] = useState(null);
  const [editingMediaItem, setEditingMediaItem] = useState(null);
  const projectFileInputRef = useRef(null);
  const coverBannerFileInputRef = useRef(null);
  const replaceBannerFileInputRef = useRef(null);
  const randomWorkFileInputRef = useRef(null);
  const replaceRandomFileInputRef = useRef(null);
  const [replacingBannerIndex, setReplacingBannerIndex] = useState(null);
  const [replacingRandomIndex, setReplacingRandomIndex] = useState(null);

  // Local Working States for Tabs (Changes are applied upon clicking "Lưu Thay Đổi")
  const [localProjects, setLocalProjects] = useState(projects);
  const [localCoverBanners, setLocalCoverBanners] = useState(coverBanners);
  const [localRandomWorks, setLocalRandomWorks] = useState(randomWorks);
  const [localMarqueeItems, setLocalMarqueeItems] = useState(marqueeItems);
  const [localSeasonalEffect, setLocalSeasonalEffect] = useState(seasonalEffect);

  // Success Feedback Alert State for each tab
  const [savedAlerts, setSavedAlerts] = useState({
    projects: false,
    home: false,
  });

  const triggerSaveAlert = (tabKey) => {
    setSavedAlerts(prev => ({ ...prev, [tabKey]: true }));
    setTimeout(() => {
      setSavedAlerts(prev => ({ ...prev, [tabKey]: false }));
    }, 2500);
  };

  // Sync with global store on external data updates (import / reset / cloud load)
  useEffect(() => { setLocalProjects(projects); }, [projects]);
  useEffect(() => { setLocalCoverBanners(coverBanners); }, [coverBanners]);
  useEffect(() => { setLocalRandomWorks(randomWorks); }, [randomWorks]);
  useEffect(() => { setLocalMarqueeItems(marqueeItems); }, [marqueeItems]);
  useEffect(() => { setLocalSeasonalEffect(seasonalEffect); }, [seasonalEffect]);

  // Tab Save Handlers (Persist to Store & Sync to Cloudflare R2)
  const handleSaveProjectsTab = async () => {
    updateProjectsList(localProjects);
    await saveToCloud({
      updatedAt: new Date().toISOString(),
      profile,
      projects: localProjects,
      coverBanners: localCoverBanners,
      randomWorks: localRandomWorks,
      marqueeItems: localMarqueeItems,
      seasonalEffect: localSeasonalEffect,
    });
    triggerSaveAlert('projects');
  };

  const handleSaveHomeTab = async () => {
    updateCoverBannersList(localCoverBanners);
    updateRandomWorksList(localRandomWorks);
    updateMarqueeItems(localMarqueeItems);
    updateSeasonalEffect(localSeasonalEffect);
    await saveToCloud({
      updatedAt: new Date().toISOString(),
      profile,
      projects: localProjects,
      coverBanners: localCoverBanners,
      randomWorks: localRandomWorks,
      marqueeItems: localMarqueeItems,
      seasonalEffect: localSeasonalEffect,
    });
    triggerSaveAlert('home');
  };

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
    let updated;
    if (editingProject) {
      updated = localProjects.map(p => (p.id === editingProject.id ? { ...formData, id: editingProject.id } : p));
    } else {
      const newProj = {
        ...formData,
        id: Date.now().toString(),
      };
      updated = [newProj, ...localProjects];
    }
    setLocalProjects(updated);
    updateProjectsList(updated);
    saveToCloud({
      updatedAt: new Date().toISOString(),
      profile,
      projects: updated,
      coverBanners: localCoverBanners,
      randomWorks: localRandomWorks,
      marqueeItems: localMarqueeItems,
      seasonalEffect: localSeasonalEffect,
    });
    setIsEditorOpen(false);
  };

  const handleDeleteProject = async (proj) => {
    if (window.confirm(`Xoá dự án "${proj.title}"? Toàn bộ ảnh trên Cloud R2 cũng sẽ được dọn dẹp.`)) {
      // 1. Delete all images of this project from R2
      const imagesToDelete = [proj.coverImage, ...(proj.gallery || [])].filter(Boolean);
      if (imagesToDelete.length > 0) {
        await deleteMultipleFromR2(imagesToDelete);
      }

      // 2. Delete the entire project folder in R2
      const projectFolder = getProjectFolderPath(proj.title, proj.id);
      await deleteFolderFromR2(projectFolder);

      // 3. Remove from local projects list & save immediately
      const updated = localProjects.filter(p => p.id !== proj.id);
      setLocalProjects(updated);
      updateProjectsList(updated);
      await saveToCloud({
        updatedAt: new Date().toISOString(),
        profile,
        projects: updated,
        coverBanners: localCoverBanners,
        randomWorks: localRandomWorks,
        marqueeItems: localMarqueeItems,
        seasonalEffect: localSeasonalEffect,
      });
    }
  };

  const moveLocalProject = (index, direction) => {
    setLocalProjects(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  // --- Unified Framing / Preview Modal Completion Handler ---
  const handleUnifiedCropComplete = (croppedUrl) => {
    if (!cropModalConfig) return;
    const { mode, actionType, targetIndex, title, subtitle } = cropModalConfig;

    if (mode === 'banner') {
      if (actionType === 'add') {
        const newBanner = {
          id: Date.now().toString(),
          type: 'image',
          title: title || 'Slide Banner',
          subtitle: subtitle || '',
          image: croppedUrl,
        };
        setLocalCoverBanners(prev => [...prev, newBanner]);
      } else if (actionType === 'replace' || actionType === 'adjust') {
        if (targetIndex !== null && targetIndex !== undefined) {
          setLocalCoverBanners(prev => {
            const updated = [...prev];
            const oldImg = updated[targetIndex]?.image;
            if (oldImg && oldImg !== croppedUrl && updated[targetIndex]?.type !== 'embed') {
              deleteFromR2(oldImg);
            }
            updated[targetIndex] = {
              ...updated[targetIndex],
              image: croppedUrl,
            };
            return updated;
          });
        }
      }
    } else if (mode === 'random') {
      if (actionType === 'add') {
        const newWork = {
          id: Date.now().toString(),
          title: title || 'Artwork mới',
          subtitle: subtitle || 'Tác phẩm lúc rảnh rỗi',
          image: croppedUrl,
        };
        setLocalRandomWorks(prev => [...prev, newWork]);
      } else if (actionType === 'replace' || actionType === 'adjust') {
        if (targetIndex !== null && targetIndex !== undefined) {
          setLocalRandomWorks(prev => {
            const updated = [...prev];
            const oldImg = updated[targetIndex]?.image;
            if (oldImg && oldImg !== croppedUrl) {
              deleteFromR2(oldImg);
            }
            updated[targetIndex] = {
              ...updated[targetIndex],
              image: croppedUrl,
            };
            return updated;
          });
        }
      }
    } else if (mode === 'project') {
      if (actionType === 'add') {
        const newProj = {
          id: Date.now().toString(),
          title: title || 'Dự án mới',
          subtitle: subtitle || 'Dự án thiết kế sáng tạo',
          category: 'Graphic Design',
          year: new Date().getFullYear().toString(),
          coverImage: croppedUrl,
          gallery: [],
          description: '',
        };
        setLocalProjects(prev => [newProj, ...prev]);
      } else if (actionType === 'replace' || actionType === 'adjust') {
        if (targetIndex !== null && targetIndex !== undefined) {
          setLocalProjects(prev => {
            const updated = [...prev];
            const oldImg = updated[targetIndex]?.coverImage;
            if (oldImg && oldImg !== croppedUrl) {
              deleteFromR2(oldImg);
            }
            updated[targetIndex] = {
              ...updated[targetIndex],
              coverImage: croppedUrl,
            };
            return updated;
          });
        }
      }
    }

    setCropModalConfig(null);
  };

  // 0. Project Handlers (Framing Preview on Upload & Adjustment)
  const handleUploadNewProject = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const title = file.name.replace(/\.[^/.]+$/, "") || "Dự án mới";
        const folderPrefix = getProjectFolderPath(title, Date.now().toString());
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'project',
          actionType: 'add',
          targetIndex: null,
          title: title,
          subtitle: "Dự án thiết kế sáng tạo",
          initialAspectRatio: 16 / 10,
          folderPrefix: folderPrefix,
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAdjustProjectCover = (proj, idx) => {
    const folderPrefix = getProjectFolderPath(proj.title, proj.id);
    setCropModalConfig({
      isOpen: true,
      imageSrc: proj.coverImage,
      mode: 'project',
      actionType: 'adjust',
      targetIndex: idx,
      title: proj.title || `Dự án ${idx + 1}`,
      subtitle: proj.subtitle || "",
      initialAspectRatio: 16 / 10,
      folderPrefix: folderPrefix,
    });
  };

  // 1. Cover Banners Handlers (Framing Preview 21:9 on Upload & Adjustment)
  const handleUploadCoverBanner = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'banner',
          actionType: 'add',
          targetIndex: null,
          title: file.name.replace(/\.[^/.]+$/, "") || "Slide Banner",
          subtitle: "",
          initialAspectRatio: 21 / 9,
          folderPrefix: 'cover_banners',
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleTriggerReplaceBanner = (idx) => {
    setReplacingBannerIndex(idx);
    replaceBannerFileInputRef.current?.click();
  };

  const handleReplaceBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (file && replacingBannerIndex !== null) {
      const targetIdx = replacingBannerIndex;
      const currentBanner = localCoverBanners[targetIdx];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'banner',
          actionType: 'replace',
          targetIndex: targetIdx,
          title: currentBanner?.title || file.name.replace(/\.[^/.]+$/, ""),
          subtitle: currentBanner?.subtitle || "",
          initialAspectRatio: 21 / 9,
          folderPrefix: 'cover_banners',
        });
      };
      reader.readAsDataURL(file);
    }
    setReplacingBannerIndex(null);
    e.target.value = '';
  };

  const handleOpenEditBanner = (banner, idx) => {
    setEditingMediaItem({ item: banner, index: idx, mode: 'banner' });
  };

  const handleOpenEditRandomWork = (work, idx) => {
    setEditingMediaItem({ item: work, index: idx, mode: 'random' });
  };

  const handleSaveMediaItem = (updatedItem) => {
    if (!editingMediaItem) return;
    const { mode, index } = editingMediaItem;
    if (mode === 'banner') {
      setLocalCoverBanners(prev => {
        const updated = [...prev];
        const oldImg = updated[index]?.image;
        if (oldImg && oldImg !== updatedItem.image && updated[index]?.type !== 'embed') {
          deleteFromR2(oldImg);
        }
        updated[index] = {
          ...updated[index],
          title: updatedItem.title,
          subtitle: updatedItem.subtitle,
          image: updatedItem.image,
        };
        return updated;
      });
    } else if (mode === 'random') {
      setLocalRandomWorks(prev => {
        const updated = [...prev];
        const oldImg = updated[index]?.image;
        if (oldImg && oldImg !== updatedItem.image) {
          deleteFromR2(oldImg);
        }
        updated[index] = {
          ...updated[index],
          title: updatedItem.title,
          subtitle: updatedItem.subtitle,
          image: updatedItem.image,
        };
        return updated;
      });
    }
    setEditingMediaItem(null);
  };

  const handleAdjustBanner = (banner, idx) => {
    setCropModalConfig({
      isOpen: true,
      imageSrc: banner.image,
      mode: 'banner',
      actionType: 'adjust',
      targetIndex: idx,
      title: banner.title || `Slide Banner ${idx + 1}`,
      subtitle: banner.subtitle || "",
      initialAspectRatio: 21 / 9,
      folderPrefix: 'cover_banners',
    });
  };

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
      setLocalCoverBanners(prev => {
        const updated = [...prev];
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
        return updated;
      });
    } else {
      const newBanner = {
        id: Date.now().toString(),
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
      };
      setLocalCoverBanners(prev => [...prev, newBanner]);
    }
    setEmbedModalConfig(null);
  };

  const handleAddCoverBannerUrl = () => {
    const url = window.prompt("Nhập đường dẫn URL ảnh banner:");
    if (url && url.trim()) {
      const title = window.prompt("Nhập tiêu đề banner (hoặc để trống):") || "";
      const newBanner = {
        id: Date.now().toString(),
        type: 'image',
        title: title.trim(),
        subtitle: "",
        image: url.trim(),
      };
      setLocalCoverBanners(prev => [...prev, newBanner]);
    }
  };

  const moveLocalCoverBanner = (index, direction) => {
    setLocalCoverBanners(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  const handleDeleteCoverBanner = (banner, idx) => {
    if (window.confirm("Xoá banner cover này?")) {
      if (banner.image && banner.type !== 'embed') deleteFromR2(banner.image);
      setLocalCoverBanners(prev => prev.filter((_, i) => i !== idx));
    }
  };

  // 2. Random Works Handlers (Framing Preview 1:1 on Upload & Adjustment)
  const handleUploadRandomWork = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'random',
          actionType: 'add',
          targetIndex: null,
          title: file.name.replace(/\.[^/.]+$/, "") || "Artwork mới",
          subtitle: "Tác phẩm lúc rảnh rỗi",
          initialAspectRatio: 1,
          folderPrefix: 'random_works',
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleTriggerReplaceRandom = (idx) => {
    setReplacingRandomIndex(idx);
    replaceRandomFileInputRef.current?.click();
  };

  const handleReplaceRandomFile = (e) => {
    const file = e.target.files?.[0];
    if (file && replacingRandomIndex !== null) {
      const targetIdx = replacingRandomIndex;
      const currentWork = localRandomWorks[targetIdx];
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setCropModalConfig({
          isOpen: true,
          imageSrc: loadEvent.target.result,
          mode: 'random',
          actionType: 'replace',
          targetIndex: targetIdx,
          title: currentWork?.title || file.name.replace(/\.[^/.]+$/, ""),
          subtitle: currentWork?.subtitle || "Tác phẩm lúc rảnh rỗi",
          initialAspectRatio: 1,
          folderPrefix: 'random_works',
        });
      };
      reader.readAsDataURL(file);
    }
    setReplacingRandomIndex(null);
    e.target.value = '';
  };

  const handleAdjustRandomWork = (work, idx) => {
    setCropModalConfig({
      isOpen: true,
      imageSrc: work.image,
      mode: 'random',
      actionType: 'adjust',
      targetIndex: idx,
      title: work.title || `Artwork ${idx + 1}`,
      subtitle: work.subtitle || "Tác phẩm lúc rảnh rỗi",
      initialAspectRatio: 1,
      folderPrefix: 'random_works',
    });
  };

  const handleEditRandomWorkInfo = (work, idx) => {
    const newTitle = window.prompt("Nhập tên tác phẩm:", work.title || "");
    if (newTitle !== null) {
      const newSubtitle = window.prompt("Nhập mô tả phụ:", work.subtitle || "");
      if (newSubtitle !== null) {
        setLocalRandomWorks(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            title: newTitle.trim(),
            subtitle: newSubtitle.trim(),
          };
          return updated;
        });
      }
    }
  };

  const handleAddRandomWorkUrl = () => {
    const url = window.prompt("Nhập đường dẫn URL ảnh artwork:");
    if (url && url.trim()) {
      const title = window.prompt("Nhập tên tác phẩm (hoặc để trống):") || "Artwork mới";
      const newWork = {
        id: Date.now().toString(),
        title: title.trim(),
        subtitle: "Tác phẩm lúc rảnh rỗi",
        image: url.trim(),
      };
      setLocalRandomWorks(prev => [...prev, newWork]);
    }
  };

  const moveLocalRandomWork = (index, direction) => {
    setLocalRandomWorks(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  const handleDeleteRandomWork = (work, idx) => {
    if (window.confirm("Xoá artwork này khỏi Tùm lum tà la?")) {
      if (work.image) deleteFromR2(work.image);
      setLocalRandomWorks(prev => prev.filter((_, i) => i !== idx));
    }
  };



  const moveLocalMarqueeItem = (index, direction) => {
    setLocalMarqueeItems(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  const handleAddNewMarquee = (e) => {
    e.preventDefault();
    if (newMarqueeText && newMarqueeText.trim()) {
      setLocalMarqueeItems(prev => [...prev, newMarqueeText.trim()]);
      setNewMarqueeText('');
    }
  };

  const updateLocalMarqueeItem = (index, value) => {
    setLocalMarqueeItems(prev => {
      const newArr = [...prev];
      newArr[index] = value;
      return newArr;
    });
  };

  const deleteLocalMarqueeItem = (index) => {
    if (localMarqueeItems.length <= 2) {
      alert("Nên giữ tối thiểu 2 cụm từ để dòng chữ chạy liên tục mượt mà!");
      return;
    }
    setLocalMarqueeItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetLocalMarquee = () => {
    if (window.confirm("Khôi phục danh sách cụm từ mặc định ban đầu?")) {
      setLocalMarqueeItems(defaultMarqueeItems);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#EDEDED] font-sans antialiased selection:bg-[#C3EA39] selection:text-black relative">
      
      {/* Live Seasonal Atmosphere Overlay */}
      <SeasonalAtmosphere effectOverride={localSeasonalEffect} />

      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-[#08080A]/95 backdrop-blur-xl border-b border-white/10 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Top Line on Mobile: Brand, Exit & Lock */}
          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBackToPortfolio}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Xem Web</span>
              </button>
              <span className="text-white/20">/</span>
              <span className="font-mono font-bold text-xs sm:text-sm tracking-wider text-white flex items-center gap-1.5">
                <span className="text-[#C3EA39] text-base leading-none">✦</span> PHI HÙNG CMS
              </span>
            </div>

            {/* Lock button on mobile top line */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] hover:text-black text-white/80 border border-white/10 transition-all cursor-pointer"
                title="Khóa bảo mật CMS"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action buttons (Cloud sync, export, import, reset, lock) */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 text-xs font-mono overflow-x-auto no-scrollbar py-0.5">
            {/* Interactive Cloudflare R2 Sync Button / Status */}
            <button
              onClick={async () => {
                const res = await saveToCloud();
                if (res.success) {
                  alert("Đã lưu và đồng bộ toàn bộ website lên Cloudflare R2 thành công! ✓");
                } else {
                  alert("Lỗi lưu lên Cloud: " + (res.error || 'Vui lòng thử lại'));
                }
              }}
              disabled={isCloudSyncing}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl font-mono text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                isCloudSyncing
                  ? 'bg-[#C3EA39]/20 border-[#C3EA39] text-[#C3EA39] animate-pulse'
                  : 'bg-[#C3EA39]/15 border-[#C3EA39]/40 hover:bg-[#C3EA39] hover:text-black text-[#C3EA39]'
              }`}
              title={lastSavedTime ? `Đã lưu lúc ${lastSavedTime}. Bấm để đồng bộ ngay lập tức.` : 'Bấm để lưu và đồng bộ toàn bộ website lên Cloudflare R2'}
            >
              {isCloudSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C3EA39]" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#C3EA39]" />
                  <span className="font-bold">Lưu lên Cloud ✓</span>
                </>
              )}
            </button>

            <button
              onClick={resetToDefault}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm shrink-0"
              title="Khôi phục dữ liệu mẫu mặc định ban đầu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset</span>
            </button>

            <button
              onClick={handleLogout}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] hover:text-black text-white/80 items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm hover:scale-[1.02] shrink-0"
              title="Khóa bảo mật CMS"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Khóa CMS</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-4 sm:space-y-6">
        
        {/* Sleek Tab Navigation Bar (3 Clean Tabs) */}
        <div className="w-full pb-2 sm:pb-4 border-b border-white/10">
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#121216] border border-white/10 shadow-lg w-full">
            
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'projects'
                  ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/15'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderKanban className="w-4 h-4 shrink-0" />
              <span>Dự Án</span>
              <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.2 rounded-md ${
                activeTab === 'projects' ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-white/50'
              }`}>
                {localProjects.length < 10 ? `0${localProjects.length}` : localProjects.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('home')}
              className={`py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'home'
                  ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/15'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate">Trang Chủ & Banner</span>
              {localSeasonalEffect !== 'none' && (
                <span className="w-2 h-2 rounded-full bg-[#C3EA39] animate-ping shrink-0" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/15'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Thông Tin</span>
            </button>

          </div>

          {/* Hidden File Inputs for Direct Actions */}
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
            ref={replaceBannerFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplaceBannerFile}
            className="hidden"
          />
          <input
            ref={randomWorkFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
            onChange={handleUploadRandomWork}
            className="hidden"
          />
          <input
            ref={replaceRandomFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.gif,image/*"
            onChange={handleReplaceRandomFile}
            className="hidden"
          />
        </div>

        {/* Tab 1: Dự án */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Top Action Controls Bar */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121216] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white">
                    Quản Lý Danh Sách Dự Án
                  </h3>
                  <p className="text-[11px] font-mono text-white/50">
                    Thêm, chỉnh sửa và sắp xếp các dự án trưng bày
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
                  title="Tải ảnh bìa trực tiếp từ máy tính"
                >
                  <Upload className="w-3.5 h-3.5 text-[#C3EA39]" />
                  <span>+ Tải Ảnh Bìa</span>
                </button>

                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer min-h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Dự Án</span>
                </button>
              </div>
            </div>

            {localProjects.length === 0 ? (
              <div
                onClick={handleOpenCreate}
                className="p-8 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-[#121216]/50 hover:bg-[#121216] transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <p className="font-display font-bold text-white text-base sm:text-lg">Chưa có dự án nào</p>
                <p className="text-xs sm:text-sm text-white/50 mt-1 font-mono max-w-md">
                  Bấm vào đây để tạo và tải ảnh dự án đầu tiên lên website
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
                {localProjects.map((proj, idx) => {
                  const isGif = proj.coverImage && (proj.coverImage.startsWith('data:image/gif') || proj.coverImage.toLowerCase().endsWith('.gif'));
                  const galleryCount = Array.isArray(proj.gallery) ? proj.gallery.length : 0;

                  return (
                    <div
                      key={proj.id || idx}
                      className="p-3.5 sm:p-5 rounded-2xl bg-[#121216] border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4 group shadow-lg"
                    >
                      {/* Left: Thumbnail, Number & Info */}
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                        <span className="text-xs font-mono font-bold text-[#C3EA39] w-6 sm:w-7 text-center shrink-0 pt-1 sm:pt-0">
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        
                        {/* Thumbnail with overlay crop button */}
                        <div className="relative w-20 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 group/thumb">
                          {proj.coverImage ? (
                            <>
                              <img
                                src={proj.coverImage}
                                alt={proj.title}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                              />
                              {isGif && (
                                <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[#C3EA39] text-[8px] sm:text-[9px] font-mono font-bold border border-[#C3EA39]/40">
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
                                className="absolute inset-0 bg-black/60 opacity-0 sm:group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-mono font-bold text-[#C3EA39] cursor-pointer"
                                title="Cắt lại ảnh bìa này (16:10)"
                              >
                                <Crop className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Cắt lại</span>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/25 text-[10px] font-mono text-center p-1">
                              Trống
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className="text-sm sm:text-base font-display font-bold text-white truncate max-w-full">
                              {proj.title}
                            </h3>
                            {proj.year && (
                              <span className="text-[10px] font-mono text-[#C3EA39] px-2 py-0.5 rounded-full bg-[#C3EA39]/10 border border-[#C3EA39]/30">
                                {proj.year}
                              </span>
                            )}
                            {galleryCount > 0 && (
                              <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                {galleryCount} ảnh
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/60 font-light truncate max-w-xl">
                            {proj.subtitle || 'Chưa có mô tả ngắn'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(proj)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#C3EA39] text-white/80 hover:text-black text-xs font-mono font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          <button
                            onClick={() => moveLocalProject(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Di chuyển lên trước"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => moveLocalProject(idx, 'down')}
                            disabled={idx === localProjects.length - 1}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Di chuyển ra sau"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteProject(proj)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500 text-white/70 hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Xoá dự án"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sticky Bottom Save Bar for Projects */}
            <StickySaveBar
              isSaved={savedAlerts.projects}
              onSave={handleSaveProjectsTab}
              isSyncing={isCloudSyncing}
              label="Lưu Danh Sách Dự Án"
              hint="Nhớ bấm lưu để cập nhật thứ tự và danh sách dự án"
            />
          </div>
        )}

        {/* Tab 2: Trang Chủ & Banner (Tích hợp: Slide Banner + Tùm Lum Tà La + Chữ Chạy + Hiệu Ứng) */}
        {activeTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            
            {/* 1. SLIDE BANNER (21:9 & Juxtapose) */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-white">
                      1. Slide Banner Trang Chủ (21:9 & Juxtapose)
                    </h3>
                    <p className="text-[11px] font-mono text-white/50">
                      Banner góc rộng đầu trang chủ & thanh trượt Before/After
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => coverBannerFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#C3EA39]" />
                    <span>+ Tải Ảnh (21:9)</span>
                  </button>

                  <button
                    onClick={handleOpenAddEmbedBanner}
                    className="px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer min-h-[38px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Juxtapose</span>
                  </button>

                  <button
                    onClick={handleAddCoverBannerUrl}
                    className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[38px]"
                    title="Nhập trực tiếp URL ảnh"
                  >
                    <span>🔗 URL Ảnh</span>
                  </button>
                </div>
              </div>

              {localCoverBanners.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => coverBannerFileInputRef.current?.click()}
                    className="p-8 sm:p-10 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 text-[#C3EA39] mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-display font-bold text-white text-sm">Tải Ảnh Slide Banner (21:9)</p>
                    <p className="text-xs text-white/40 mt-1 font-mono">Tải ảnh cover góc nhìn rộng 21:9</p>
                  </div>

                  <div
                    onClick={handleOpenAddEmbedBanner}
                    className="p-8 sm:p-10 rounded-2xl border-2 border-dashed border-[#C3EA39]/30 hover:border-[#C3EA39] bg-[#C3EA39]/5 hover:bg-[#C3EA39]/10 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <SlidersHorizontal className="w-8 h-8 text-[#C3EA39] mb-2 group-hover:scale-110 transition-transform" />
                    <p className="font-display font-bold text-white text-sm">Thêm Juxtapose Before / After</p>
                    <p className="text-xs text-white/40 mt-1 font-mono">Slider so sánh Before & After</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {localCoverBanners.map((banner, idx) => {
                    const isEmbed = banner.type === 'embed' || Boolean(banner.embedCode || banner.embedUrl);
                    const embedSrc = extractEmbedSrc(banner.embedUrl || banner.embedCode || banner.image);

                    return (
                      <div
                        key={banner.id || idx}
                        className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group flex flex-col hover:border-[#C3EA39]/40 transition-all shadow-xl"
                      >
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
                              <div className="absolute bottom-0 right-0 w-24 h-7 bg-[#0a0a0c] z-20 pointer-events-none" />
                            </div>
                          ) : (
                            <img
                              src={banner.image}
                              alt={banner.title || `Cover Banner ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}

                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-md text-[10px] font-mono font-bold text-[#C3EA39] border border-white/15 flex items-center gap-1.5 shadow-md z-20">
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

                          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                            <button
                              onClick={() => isEmbed ? handleOpenEditEmbedBanner(banner, idx) : handleOpenEditBanner(banner, idx)}
                              className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-[#C3EA39]/40 shadow-md active:scale-95"
                              title="Sửa banner"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>

                            <button
                              onClick={() => handleDeleteCoverBanner(banner, idx)}
                              className="p-1.5 rounded-lg bg-black/75 hover:bg-red-500 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10 shadow-md active:scale-95"
                              title="Xoá banner"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-[#121216] flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-display font-bold text-white truncate">
                              {banner.title || `Slide Banner #${idx + 1 < 10 ? `0${idx + 1}` : idx + 1}`}
                            </h4>
                            {banner.subtitle && (
                              <p className="text-[11px] text-white/50 font-light truncate mt-0.5">
                                {banner.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => moveLocalCoverBanner(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer"
                              title="Lên trước"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveLocalCoverBanner(idx, 'down')}
                              disabled={idx === localCoverBanners.length - 1}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors cursor-pointer"
                              title="Ra sau"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. TÙM LUM TÀ LA (Artwork Vuông 1:1) */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-white">
                      2. Tùm Lum Tà La (Section 01 - Artwork 1:1)
                    </h3>
                    <p className="text-[11px] font-mono text-white/50">
                      Artwork vuông & GIF xoay vòng ở Section 01
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => randomWorkFileInputRef.current?.click()}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/15 hover:scale-[1.02] cursor-pointer min-h-[38px]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Tải Ảnh (1:1)</span>
                  </button>

                  <button
                    onClick={handleAddRandomWorkUrl}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-1 min-h-[38px]"
                    title="Nhập trực tiếp URL ảnh"
                  >
                    <span>🔗 URL</span>
                  </button>
                </div>
              </div>

              {localRandomWorks.length === 0 ? (
                <div
                  onClick={() => randomWorkFileInputRef.current?.click()}
                  className="p-8 sm:p-12 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#C3EA39]/50 bg-black/30 hover:bg-black/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
                >
                  <Upload className="w-8 h-8 text-[#C3EA39] mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-display font-bold text-white text-sm">Chưa có Artwork Tùm Lum Tà La nào</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">Bấm để tải ảnh vuông 1:1 hoặc GIF</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {localRandomWorks.map((work, idx) => (
                    <div
                      key={work.id || idx}
                      className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group flex flex-col hover:border-[#C3EA39]/40 transition-all shadow-lg"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-black border-b border-white/5">
                        <img
                          src={work.image}
                          alt={work.title || `Artwork ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1 z-20">
                          <span>#{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                        </div>

                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                          <button
                            onClick={() => handleOpenEditRandomWork(work, idx)}
                            className="p-1 rounded-md bg-black/80 hover:bg-[#C3EA39] text-[#C3EA39] hover:text-black transition-colors cursor-pointer border border-[#C3EA39]/30"
                            title="Sửa ảnh"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteRandomWork(work, idx)}
                            className="p-1 rounded-md bg-black/80 hover:bg-red-500 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Xoá artwork"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 bg-[#121216]">
                        <h4 className="text-xs font-display font-bold text-white truncate">
                          {work.title || `Artwork #${idx + 1}`}
                        </h4>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">
                          {work.subtitle || 'Tác phẩm ngẫu hứng'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. DẢI CHỮ CHẠY (Infinite Marquee) */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                    <MoveHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-white">
                      3. Dải Chữ Chạy Vô Tận (Infinite Marquee)
                    </h3>
                    <p className="text-[11px] font-mono text-white/50">
                      Các cụm từ kỹ năng, slogan chạy ngang mượt mà giữa các phần
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetLocalMarquee}
                  className="text-xs font-mono text-white/40 hover:text-[#C3EA39] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Khôi phục mặc định</span>
                </button>
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-2xl bg-black/60 border border-white/10 overflow-hidden relative">
                {(() => {
                  const repeated = [...localMarqueeItems, ...localMarqueeItems];
                  return (
                    <div className="flex whitespace-nowrap overflow-hidden py-1 text-xs font-mono font-bold text-[#C3EA39] tracking-wider uppercase">
                      <div className="flex items-center gap-6 pr-6 shrink-0">
                        {repeated.map((item, idx) => (
                          <span key={`prev-${idx}`} className="flex items-center gap-2">
                            <span className="text-white/40">✦</span>
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Add New Phrase Form */}
              <form onSubmit={handleAddNewMarquee} className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
                <input
                  type="text"
                  value={newMarqueeText}
                  onChange={(e) => setNewMarqueeText(e.target.value)}
                  placeholder="Nhập cụm từ mới (VD: 3D MOTION DESIGN, TYPOGRAPHY...)..."
                  className="flex-1 bg-transparent px-3.5 py-2 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMarqueeText.trim()}
                  className="px-4 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] disabled:opacity-40 text-black font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Cụm Từ</span>
                </button>
              </form>

              {/* List of Phrases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {localMarqueeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-[#C3EA39] w-5 text-center shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateLocalMarqueeItem(idx, e.target.value)}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none focus:text-[#C3EA39] transition-colors py-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveLocalMarqueeItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors"
                        title="Lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveLocalMarqueeItem(idx, 'down')}
                        disabled={idx === localMarqueeItems.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white transition-colors"
                        title="Xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteLocalMarqueeItem(idx)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
                        title="Xoá"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. HIỆU ỨNG KHÍ QUYỂN (Seasonal Effects) */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121216] border border-white/10 space-y-4">
              <div className="pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/15 text-[#C3EA39] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-white">
                      4. Hiệu Ứng Lễ Hội & Khí Quyển
                    </h3>
                    <p className="text-[11px] font-mono text-white/50">
                      Hiệu ứng rơi động tăng thêm tính sống động cho website
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
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
                  const isSelected = localSeasonalEffect === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setLocalSeasonalEffect(opt.id)}
                      className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-black/60 border-[#C3EA39] shadow-lg shadow-[#C3EA39]/10'
                          : 'bg-black/30 border-white/10 hover:border-white/25 hover:bg-black/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl sm:text-3xl select-none group-hover:scale-110 transition-transform">
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

                      <div className="space-y-1 my-3">
                        <h4 className="text-sm font-display font-bold text-white">
                          {opt.title}
                        </h4>
                        <p className="text-xs text-white/50 font-light leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-white/40">Trạng thái:</span>
                        {isSelected ? (
                          <span className="text-xs font-mono font-bold text-[#C3EA39] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đang Chọn</span>
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-white/40 group-hover:text-white transition-colors">
                            Chọn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Bottom Save Bar for Home Tab */}
            <StickySaveBar
              isSaved={savedAlerts.home}
              onSave={handleSaveHomeTab}
              isSyncing={isCloudSyncing}
              label="Lưu Thay Đổi Trang Chủ"
              hint="Lưu toàn bộ Banner, Tùm lum tà la, Chữ chạy & Hiệu ứng lên Cloud R2"
            />
          </div>
        )}

        {/* Tab 3: Thông tin cá nhân */}
        {activeTab === 'profile' && (
          <ProfileEditor
            profile={profile}
            onSave={async (updatedProfile) => {
              const fullProfile = {
                ...profile,
                ...updatedProfile,
              };
              updateProfile(fullProfile);
              await saveToCloud({
                updatedAt: new Date().toISOString(),
                profile: fullProfile,
                projects: localProjects,
                coverBanners: localCoverBanners,
                randomWorks: localRandomWorks,
                marqueeItems: localMarqueeItems,
                seasonalEffect: localSeasonalEffect,
              });
            }}
          />
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

      {/* Unified Image Framing / Crop Modal */}
      {cropModalConfig && (
        <ImageCropModal
          isOpen={Boolean(cropModalConfig.isOpen)}
          imageSrc={cropModalConfig.imageSrc}
          onClose={() => setCropModalConfig(null)}
          onCropComplete={handleUnifiedCropComplete}
          mode={cropModalConfig.mode}
          initialAspectRatio={cropModalConfig.initialAspectRatio}
          folderPrefix={cropModalConfig.folderPrefix}
        />
      )}

      {/* Unified Media Item Editor Modal (Banner & Random Work) */}
      {editingMediaItem && (
        <MediaItemEditorModal
          isOpen={Boolean(editingMediaItem)}
          item={editingMediaItem.item}
          index={editingMediaItem.index}
          mode={editingMediaItem.mode}
          onSave={handleSaveMediaItem}
          onClose={() => setEditingMediaItem(null)}
          onPreviewImage={(src) => setPreviewingImage(src)}
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
