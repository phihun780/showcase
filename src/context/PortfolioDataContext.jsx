import React, { createContext, useContext, useState, useEffect } from 'react';
import { projects as defaultProjects } from '../data/projects';
import { profile as defaultProfile } from '../data/profile';
import { defaultRandomWorks } from '../data/randomWorks';
import { defaultCoverBanners } from '../data/coverBanners';
import { savePortfolioDataToR2, fetchPortfolioDataFromR2 } from '../utils/r2Storage';

const PortfolioDataContext = createContext(null);

const STORAGE_PROJECTS_KEY = 'phihung_portfolio_projects';
const STORAGE_PROFILE_KEY = 'phihung_portfolio_profile';
const STORAGE_RANDOM_WORKS_KEY = 'phihung_portfolio_random_works';
const STORAGE_COVER_BANNERS_KEY = 'phihung_portfolio_cover_banners';
const STORAGE_SEASONAL_EFFECT_KEY = 'phihung_portfolio_seasonal_effect';
const STORAGE_MARQUEE_KEY = 'phihung_portfolio_marquee';

export const defaultMarqueeItems = [
  "UI/UX PRODUCT DESIGN",
  "BRAND IDENTITY",
  "DESIGN SYSTEMS",
  "2 NĂM KINH NGHIỆM",
  "FIGMA & SPLINE 3D",
  "MOBILE APP EXPERIENCES",
  "EDITORIAL & PACKAGING"
];

export function PortfolioDataProvider({ children }) {
  // Load initial projects from localStorage or default
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !['kanso-banking', 'aura-soundworks', 'nara-artisan', 'monolith-coffee'].includes(p.id));
        }
      }
    } catch (e) {
      console.error("Failed to load projects from localStorage", e);
    }
    return defaultProjects;
  });

  // Load initial profile from localStorage or default
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          if (parsed.avatar && parsed.avatar.includes('images.unsplash.com/photo-1534528741775-53994a69daeb')) {
            parsed.avatar = '';
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load profile from localStorage", e);
    }
    return defaultProfile;
  });

  // Load cover banners from localStorage or default
  const [coverBanners, setCoverBanners] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COVER_BANNERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to load coverBanners from localStorage", e);
    }
    return defaultCoverBanners;
  });

  // Load random works from localStorage or default
  const [randomWorks, setRandomWorks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RANDOM_WORKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(w => !['random-1', 'random-2', 'random-3', 'random-4', 'random-5'].includes(w.id));
        }
      }
    } catch (e) {
      console.error("Failed to load randomWorks from localStorage", e);
    }
    return defaultRandomWorks;
  });

  // Load marquee text items
  const [marqueeItems, setMarqueeItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MARQUEE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load marqueeItems from localStorage", e);
    }
    return defaultMarqueeItems;
  });

  // Load seasonal effect (none | snow | tet | mid_autumn)
  const [seasonalEffect, setSeasonalEffect] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SEASONAL_EFFECT_KEY);
      if (saved && ['none', 'snow', 'tet', 'mid_autumn'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error("Failed to load seasonalEffect from localStorage", e);
    }
    return 'none';
  });

  // Cloud sync tracking refs & states
  const isInitialCloudSyncDone = React.useRef(false);
  const hasUserEditedRef = React.useRef(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'saved' | 'error'
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // 1. Initial Sync from Cloudflare R2 (Guaranteed non-destructive read)
  useEffect(() => {
    let isMounted = true;
    async function syncFromCloudflareR2() {
      setIsCloudSyncing(true);
      try {
        const cloudData = await fetchPortfolioDataFromR2();
        if (cloudData && isMounted) {
          if (Array.isArray(cloudData.projects)) {
            setProjects(cloudData.projects);
          }
          if (cloudData.profile && typeof cloudData.profile === 'object') {
            setProfile(cloudData.profile);
          }
          if (Array.isArray(cloudData.coverBanners)) {
            setCoverBanners(cloudData.coverBanners);
          }
          if (Array.isArray(cloudData.randomWorks)) {
            setRandomWorks(cloudData.randomWorks);
          }
          if (Array.isArray(cloudData.marqueeItems) && cloudData.marqueeItems.length > 0) {
            setMarqueeItems(cloudData.marqueeItems);
          }
          if (cloudData.seasonalEffect) {
            setSeasonalEffect(cloudData.seasonalEffect);
          }
          if (cloudData.updatedAt) {
            setLastSavedTime(cloudData.updatedAt);
          }
          setSyncStatus('saved');
          console.log("Cloudflare R2 synchronized successfully ✓");
        }
      } catch (err) {
        console.warn("R2 initial fetch error:", err);
        if (isMounted) setSyncStatus('error');
      } finally {
        if (isMounted) {
          isInitialCloudSyncDone.current = true;
          setIsCloudSyncing(false);
        }
      }
    }
    syncFromCloudflareR2();
    return () => { isMounted = false; };
  }, []);

  // Explicit Save to Cloudflare R2 function
  const saveToCloud = async (customPayload = null) => {
    isInitialCloudSyncDone.current = true;
    setIsCloudSyncing(true);
    setSyncStatus('syncing');

    const payload = customPayload || {
      updatedAt: new Date().toISOString(),
      profile,
      projects,
      coverBanners,
      randomWorks,
      marqueeItems,
      seasonalEffect,
    };

    // Immediately synchronize context state & localStorage with payload values
    if (customPayload) {
      if (customPayload.profile) {
        setProfile(customPayload.profile);
        try { localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(customPayload.profile)); } catch (e) {}
      }
      if (Array.isArray(customPayload.projects)) {
        setProjects(customPayload.projects);
        try { localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(customPayload.projects)); } catch (e) {}
      }
      if (Array.isArray(customPayload.coverBanners)) {
        setCoverBanners(customPayload.coverBanners);
        try { localStorage.setItem(STORAGE_COVER_BANNERS_KEY, JSON.stringify(customPayload.coverBanners)); } catch (e) {}
      }
      if (Array.isArray(customPayload.randomWorks)) {
        setRandomWorks(customPayload.randomWorks);
        try { localStorage.setItem(STORAGE_RANDOM_WORKS_KEY, JSON.stringify(customPayload.randomWorks)); } catch (e) {}
      }
      if (Array.isArray(customPayload.marqueeItems)) {
        setMarqueeItems(customPayload.marqueeItems);
        try { localStorage.setItem(STORAGE_MARQUEE_KEY, JSON.stringify(customPayload.marqueeItems)); } catch (e) {}
      }
      if (customPayload.seasonalEffect) {
        setSeasonalEffect(customPayload.seasonalEffect);
        try { localStorage.setItem(STORAGE_SEASONAL_EFFECT_KEY, customPayload.seasonalEffect); } catch (e) {}
      }
    }

    try {
      const res = await savePortfolioDataToR2(payload);
      if (res && res.success) {
        setSyncStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
        setIsCloudSyncing(false);
        return { success: true };
      } else {
        throw new Error(res?.error || 'Save to R2 failed');
      }
    } catch (err) {
      console.error("Save to R2 failed:", err);
      setSyncStatus('error');
      setIsCloudSyncing(false);
      return { success: false, error: err.message };
    }
  };

  // 2. Save to LocalStorage safely (handles quota limit without crashing)
  useEffect(() => {
    const safeSet = (key, val) => {
      try {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      } catch (e) {}
    };

    safeSet(STORAGE_MARQUEE_KEY, marqueeItems);
    safeSet(STORAGE_SEASONAL_EFFECT_KEY, seasonalEffect);
    safeSet(STORAGE_COVER_BANNERS_KEY, coverBanners);
    safeSet(STORAGE_RANDOM_WORKS_KEY, randomWorks);
    safeSet(STORAGE_PROJECTS_KEY, projects);
    safeSet(STORAGE_PROFILE_KEY, profile);
  }, [marqueeItems, seasonalEffect, coverBanners, randomWorks, projects, profile]);

  // 3. Auto-sync to Cloudflare R2 ONLY when user has made real edits in CMS
  useEffect(() => {
    // Only auto-save if user explicitly edited data and initial sync has completed
    if (!hasUserEditedRef.current || !isInitialCloudSyncDone.current) {
      return;
    }

    const timer = setTimeout(() => {
      saveToCloud().catch(err => console.warn('R2 auto-sync warning:', err));
    }, 1500);

    return () => clearTimeout(timer);
  }, [projects, profile, coverBanners, randomWorks, marqueeItems, seasonalEffect]);

  // Project CRUD Actions
  const addProject = (newProjectData) => {
    hasUserEditedRef.current = true;
    const generatedId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProject = {
      ...newProjectData,
      id: (newProjectData.id && String(newProjectData.id).trim()) || generatedId,
      title: (newProjectData.title && newProjectData.title.trim()) || "Dự án mới",
      subtitle: (newProjectData.subtitle && newProjectData.subtitle.trim()) || "",
      category: newProjectData.category || "Graphic Design",
      coverImage: newProjectData.coverImage || "",
      gallery: Array.isArray(newProjectData.gallery) ? newProjectData.gallery : [],
      year: newProjectData.year || `${new Date().getFullYear()}`,
      tags: Array.isArray(newProjectData.tags)
        ? newProjectData.tags
        : (typeof newProjectData.tags === 'string'
            ? newProjectData.tags.split(',').map(t => t.trim()).filter(Boolean)
            : ["Graphic Design", "Branding"]),
    };
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = (id, updatedData) => {
    hasUserEditedRef.current = true;
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updatedData } : p)));
  };

  const updateProjectsList = (newList) => {
    if (Array.isArray(newList)) {
      hasUserEditedRef.current = true;
      setProjects(newList);
    }
  };

  const deleteProject = (id) => {
    hasUserEditedRef.current = true;
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const moveProject = (index, direction) => {
    hasUserEditedRef.current = true;
    setProjects(prev => {
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  // Profile Update Actions
  const updateProfileData = (newProfileData) => {
    hasUserEditedRef.current = true;
    setProfile(prev => ({ ...prev, ...newProfileData }));
  };

  // Cover Banners CRUD Actions (Top Standalone Cover Slider)
  const addCoverBanner = (imgData) => {
    hasUserEditedRef.current = true;
    const newItem = typeof imgData === 'string' ? {
      id: `banner-${Date.now()}`,
      title: '',
      subtitle: '',
      image: imgData,
    } : {
      id: imgData.id || `banner-${Date.now()}`,
      title: imgData.title || '',
      subtitle: imgData.subtitle || '',
      image: imgData.image || imgData,
      ...imgData,
    };
    setCoverBanners(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateCoverBanner = (id, updatedData) => {
    hasUserEditedRef.current = true;
    setCoverBanners(prev => prev.map(item => (item.id === id ? { ...item, ...updatedData } : item)));
  };

  const deleteCoverBanner = (idOrIdx) => {
    hasUserEditedRef.current = true;
    setCoverBanners(prev => prev.filter((item, idx) => item.id !== idOrIdx && idx !== idOrIdx));
  };

  const moveCoverBanner = (index, direction) => {
    hasUserEditedRef.current = true;
    setCoverBanners(prev => {
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  const updateCoverBannersList = (newList) => {
    hasUserEditedRef.current = true;
    setCoverBanners(newList);
  };

  // Random Works CRUD Actions (Section 01 Tùm Lum Tà La)
  const addRandomWork = (imgData) => {
    hasUserEditedRef.current = true;
    const newItem = typeof imgData === 'string' ? {
      id: `rand-${Date.now()}`,
      title: 'Artwork ngẫu hứng',
      subtitle: 'Tác phẩm tự do lúc rảnh rỗi',
      image: imgData,
    } : {
      id: imgData.id || `rand-${Date.now()}`,
      title: imgData.title || 'Artwork ngẫu hứng',
      subtitle: imgData.subtitle || 'Tác phẩm tự do lúc rảnh rỗi',
      image: imgData.image || imgData,
      ...imgData,
    };
    setRandomWorks(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateRandomWork = (id, updatedData) => {
    hasUserEditedRef.current = true;
    setRandomWorks(prev => prev.map(item => (item.id === id ? { ...item, ...updatedData } : item)));
  };

  const deleteRandomWork = (idOrIdx) => {
    hasUserEditedRef.current = true;
    setRandomWorks(prev => prev.filter((item, idx) => item.id !== idOrIdx && idx !== idOrIdx));
  };

  const moveRandomWork = (index, direction) => {
    hasUserEditedRef.current = true;
    setRandomWorks(prev => {
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr;
    });
  };

  const updateRandomWorksList = (newList) => {
    hasUserEditedRef.current = true;
    setRandomWorks(newList);
  };

  // Marquee Actions
  const addMarqueeItem = (text) => {
    if (!text || !text.trim()) return;
    hasUserEditedRef.current = true;
    setMarqueeItems(prev => [...prev, text.trim().toUpperCase()]);
  };

  const deleteMarqueeItem = (index) => {
    hasUserEditedRef.current = true;
    setMarqueeItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateMarqueeItem = (index, newText) => {
    hasUserEditedRef.current = true;
    setMarqueeItems(prev => prev.map((item, idx) => (idx === index ? newText.toUpperCase() : item)));
  };

  const updateMarqueeItems = (newList) => {
    hasUserEditedRef.current = true;
    setMarqueeItems(newList);
  };

  // Seasonal Effect Setter
  const updateSeasonalEffect = (effect) => {
    hasUserEditedRef.current = true;
    setSeasonalEffect(effect);
  };

  // Reset to default
  const resetToDefault = () => {
    if (window.confirm("Bạn có chắc muốn khôi phục toàn bộ dữ liệu mẫu ban đầu không?")) {
      localStorage.removeItem(STORAGE_PROJECTS_KEY);
      localStorage.removeItem(STORAGE_PROFILE_KEY);
      localStorage.removeItem(STORAGE_COVER_BANNERS_KEY);
      localStorage.removeItem(STORAGE_RANDOM_WORKS_KEY);
      localStorage.removeItem(STORAGE_SEASONAL_EFFECT_KEY);
      localStorage.removeItem(STORAGE_MARQUEE_KEY);
      setProjects(defaultProjects);
      setProfile(defaultProfile);
      setCoverBanners(defaultCoverBanners);
      setRandomWorks(defaultRandomWorks);
      setSeasonalEffect('none');
      setMarqueeItems(defaultMarqueeItems);
      return true;
    }
    return false;
  };

  // Export JSON file
  const exportDataJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      profile,
      projects,
      coverBanners,
      randomWorks,
      marqueeItems,
      seasonalEffect,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phihung_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const importDataJSON = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.projects && Array.isArray(parsed.projects)) {
            setProjects(parsed.projects);
          }
          if (parsed.profile && parsed.profile.name) {
            setProfile(parsed.profile);
          }
          if (parsed.coverBanners && Array.isArray(parsed.coverBanners)) {
            setCoverBanners(parsed.coverBanners);
          }
          if (parsed.randomWorks && Array.isArray(parsed.randomWorks)) {
            setRandomWorks(parsed.randomWorks);
          }
          if (parsed.marqueeItems && Array.isArray(parsed.marqueeItems)) {
            setMarqueeItems(parsed.marqueeItems);
          }
          if (parsed.seasonalEffect && ['none', 'snow', 'tet', 'mid_autumn'].includes(parsed.seasonalEffect)) {
            setSeasonalEffect(parsed.seasonalEffect);
          }
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <PortfolioDataContext.Provider
      value={{
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
        updateProfile: updateProfileData,
        addCoverBanner,
        updateCoverBanner,
        deleteCoverBanner,
        moveCoverBanner,
        updateCoverBannersList,
        addRandomWork,
        updateRandomWork,
        deleteRandomWork,
        moveRandomWork,
        updateRandomWorksList,
        addMarqueeItem,
        deleteMarqueeItem,
        updateMarqueeItem,
        updateMarqueeItems,
        updateSeasonalEffect,
        setSeasonalEffect,
        saveToCloud,
        isCloudSyncing,
        syncStatus,
        lastSavedTime,
        resetToDefault,
        exportDataJSON,
        importDataJSON,
      }}
    >
      {children}
    </PortfolioDataContext.Provider>
  );
}

export function usePortfolioData() {
  const context = useContext(PortfolioDataContext);
  if (!context) {
    throw new Error("usePortfolioData must be used within a PortfolioDataProvider");
  }
  return context;
}
