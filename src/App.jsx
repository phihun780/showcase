import React, { useState, useEffect } from 'react';
import { PortfolioDataProvider, usePortfolioData } from './context/PortfolioDataContext';
import Header from './components/Header';
import Hero from './components/Hero';
import CoverBannerSection from './components/CoverBannerSection';
import RandomWorkSection from './components/RandomWorkSection';
import WorkSection from './components/WorkSection';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';
import CursorSpotlight from './components/CursorSpotlight';
import SeasonalAtmosphere from './components/SeasonalAtmosphere';
import CMSPage from './components/CMS/CMSPage';

// Multi-layer Anti-Theft & Content Protection Shield (Active on live production domains)
function SecurityShield() {
  useEffect(() => {
    // Tự động bỏ chặn khi đang chạy dev mode hoặc trên localhost / 127.0.0.1 / mạng nội bộ để thoải mái bấm F12 test mobile
    const isDev = import.meta.env.DEV || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.startsWith('192.168.') ||
                  window.location.hostname.endsWith('.local');
    if (isDev) return;

    // 1. Disable Right-Click Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Drag & Drop of Images
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // 3. Block Developer Shortcuts: F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key ? e.key.toUpperCase() : '';
      const keyCode = e.keyCode || e.which;

      // F12
      if (key === 'F12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + Shift + I / J / C (DevTools & Element Inspector)
      if (isCtrlOrCmd && isShift && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U (View Source)
      if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S (Save Page)
      if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + P (Print Page)
      if (isCtrlOrCmd && (key === 'P' || keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 4. Mobile Anti-Zoom & Double-Tap Zoom Prevention
    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    let lastTap = 0;
    const handleTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastTap <= 300) {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
        if (!isInput) {
          e.preventDefault();
        }
      }
      lastTap = now;
    };

    const handleGesture = (e) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', handleGesture, { passive: false });
    document.addEventListener('gesturechange', handleGesture, { passive: false });
    document.addEventListener('gestureend', handleGesture, { passive: false });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      document.removeEventListener('gestureend', handleGesture);
    };
  }, []);

  return null;
}

function PortfolioApp() {
  const { profile } = usePortfolioData();

  const getCleanPath = () => {
    if (typeof window === 'undefined') return '/';
    const rawPath = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
    const hash = (window.location.hash || '').toLowerCase().replace(/\/+$/, '') || '';
    if (
      rawPath === '/cms' || 
      rawPath.endsWith('/cms') || 
      hash === '#/cms' || 
      hash === '#cms' || 
      hash.includes('cms')
    ) {
      return '/cms';
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState(getCleanPath);

  const [activeSection, setActiveSection] = useState('work');

  // Dynamic Tab Title, Favicon & Social Preview Meta Tags sync
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Dynamic Browser Tab Title & Social Title
    if (profile?.tabTitle && profile.tabTitle.trim()) {
      document.title = profile.tabTitle.trim();
      
      const ogTitle = document.querySelector("meta[property='og:title']");
      if (ogTitle) ogTitle.content = profile.tabTitle.trim();

      const twTitle = document.querySelector("meta[name='twitter:title']");
      if (twTitle) twTitle.content = profile.tabTitle.trim();
    } else if (profile?.name) {
      const defaultTitle = `${profile.name} — ${profile.title || 'Graphic Designer'} | Portfolio Showcase`;
      document.title = defaultTitle;
    }

    // 2. Dynamic Favicon
    if (profile?.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = profile.favicon;
    }

    // 3. Dynamic OpenGraph Image
    if (profile?.ogImage) {
      let ogImg = document.querySelector("meta[property='og:image']");
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.content = profile.ogImage;

      let twImg = document.querySelector("meta[name='twitter:image']");
      if (!twImg) {
        twImg = document.createElement('meta');
        twImg.setAttribute('name', 'twitter:image');
        document.head.appendChild(twImg);
      }
      twImg.content = profile.ogImage;
    }
  }, [profile?.tabTitle, profile?.name, profile?.title, profile?.favicon, profile?.ogImage]);

  // Route Synchronization & Scroll Reset
  useEffect(() => {
    const handleLocationChange = () => {
      const clean = getCleanPath();
      setCurrentPath(clean);
      window.scrollTo(0, 0);

      // Auto-normalize any extra path like /phihun or /phihun/ back to clean /
      if (typeof window !== 'undefined') {
        const rawPath = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
        if (
          rawPath !== '/' && 
          rawPath !== '/cms' && 
          !rawPath.endsWith('/cms') && 
          !rawPath.startsWith('/api')
        ) {
          window.history.replaceState({}, '', '/');
        }
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Ensure scroll is at top whenever path changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  const navigateTo = (path) => {
    if (path === '/cms') {
      window.history.pushState({}, '', '/cms');
    } else {
      window.history.pushState({}, '', '/');
    }
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // If on /cms, show full CMS Dashboard
  if (currentPath === '/cms') {
    return <CMSPage onBackToPortfolio={() => navigateTo('/')} />;
  }

  // Otherwise, render main Portfolio
  return (
    <div className="min-h-screen bg-[#08080A] text-[#EDEDED] antialiased selection:bg-[#C3EA39] selection:text-black relative">
      {/* Active Anti-Theft Protection Shield */}
      <SecurityShield />

      {/* Seamless Global Fixed Grid Background Layer */}
      <div className="fixed inset-0 pointer-events-none bg-grid-pattern z-0 opacity-100" />

      {/* Interactive Mouse Brand Glow Effect */}
      <CursorSpotlight />

      {/* Festive Seasonal Atmosphere Canvas (Snow, Tet, Mid-Autumn) */}
      <SeasonalAtmosphere />

      {/* Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onOpenCMS={() => navigateTo('/cms')}
      />

      {/* Main Content Sections */}
      <main id="top" className="relative z-10">
        <Hero />
        <CoverBannerSection />
        <RandomWorkSection />
        <WorkSection />
        <AboutSection />
      </main>

      {/* Footer */}
      <Footer onOpenCMS={() => navigateTo('/cms')} />
    </div>
  );
}

export default function App() {
  return (
    <PortfolioDataProvider>
      <PortfolioApp />
    </PortfolioDataProvider>
  );
}


