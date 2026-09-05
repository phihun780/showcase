import React, { useState, useEffect, useLayoutEffect } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';

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

    // 4. Mobile Gesture Zoom Prevention (Lightweight & 100% Non-blocking)
    const handleGesture = (e) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('gesturestart', handleGesture, { passive: false });
    document.addEventListener('gesturechange', handleGesture, { passive: false });
    document.addEventListener('gestureend', handleGesture, { passive: false });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('keydown', handleKeyDown, true);
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
    const search = (window.location.search || '').toLowerCase();
    if (
      rawPath === '/cms' || 
      rawPath.endsWith('/cms') || 
      hash === '#/cms' || 
      hash === '#cms' || 
      hash.includes('cms') ||
      search.includes('cms')
    ) {
      return '/cms';
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState(getCleanPath);

  const [activeSection, setActiveSection] = useState('work');

  // Disable browser automatic scroll restoration to avoid being stuck at old scroll coordinates
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

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

    // 2. Dynamic Description (Meta Description / OpenGraph / Twitter)
    if (profile?.metaDescription && profile.metaDescription.trim()) {
      const descVal = profile.metaDescription.trim();
      
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = descVal;

      let ogDesc = document.querySelector("meta[property='og:description']");
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.content = descVal;

      let twDesc = document.querySelector("meta[name='twitter:description']");
      if (!twDesc) {
        twDesc = document.createElement('meta');
        twDesc.setAttribute('name', 'twitter:description');
        document.head.appendChild(twDesc);
      }
      twDesc.content = descVal;
    }

    // 3. Dynamic Favicon
    if (profile?.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = profile.favicon;
    }

    // 4. Dynamic OpenGraph Image
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
  }, [profile?.tabTitle, profile?.metaDescription, profile?.name, profile?.title, profile?.favicon, profile?.ogImage]);

  // Route Synchronization & Scroll Reset
  useEffect(() => {
    const handleLocationChange = () => {
      const clean = getCleanPath();
      setCurrentPath(clean);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

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

  // Ensure scroll is instantly at top whenever path changes
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [currentPath]);

  const navigateTo = (path) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    if (path === '/cms') {
      window.history.pushState({}, '', '/cms');
    } else {
      window.history.pushState({}, '', '/');
    }
    setCurrentPath(path);
  };

  // If on /cms, show full CMS Dashboard
  if (currentPath === '/cms') {
    return <CMSPage onBackToPortfolio={() => navigateTo('/')} />;
  }

  // Otherwise, render main Portfolio
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#08080A] text-[#EDEDED] antialiased selection:bg-[#C3EA39] selection:text-black relative">
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
      <main id="top" className="relative z-10 w-full max-w-full overflow-x-hidden">
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
    <ErrorBoundary>
      <PortfolioDataProvider>
        <PortfolioApp />
      </PortfolioDataProvider>
    </ErrorBoundary>
  );
}


