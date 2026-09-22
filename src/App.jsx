import React, { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { PortfolioDataProvider, usePortfolioData } from './context/PortfolioDataContext';
import Header from './components/Header';
import Hero from './components/Hero';
import CoverBannerSection from './components/CoverBannerSection';
import ShowcaseWallSection from './components/ShowcaseWallSection';
import WorkSection from './components/WorkSection';
import AboutSection from './components/AboutSection';
import VibecodeSection from './components/VibecodeSection';
import ClientMemoriesSection from './components/ClientMemoriesSection';
import Footer from './components/Footer';
import CursorSpotlight from './components/CursorSpotlight';
import SeasonalAtmosphere from './components/SeasonalAtmosphere';
import ErrorBoundary from './components/ErrorBoundary';
import { PROJECT_ROUTE } from './utils/projectUrl';
import { CLIENT_ROUTE } from './utils/clientUrl';

// CMS chỉ mình chủ trang dùng, nhưng nó nặng hơn cả phần portfolio cộng lại.
// Tách riêng để khách vào xem trang không phải tải kèm toàn bộ trình quản trị.
const CMSPage = lazy(() => import('./components/CMS/CMSPage'));

// Màn hình chờ trong lúc tải gói CMS (chỉ chớp qua một nhịp ở lần vào đầu tiên)
function CMSLoadingScreen() {
  return (
    <div className="min-h-screen w-full bg-[#08080A] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-2xl border-2 border-[#C3EA39]/25 border-t-[#C3EA39] animate-spin" />
      <p className="text-xs font-mono text-white/40 tracking-wider">Đang mở CMS...</p>
    </div>
  );
}

// Chan luu anh kieu tien tay.
//
// GIU: chan chuot phai va chan keo tha anh. Khong ngan duoc nguoi quyet tam
// (mo tab Network la thay het file), nhung chan duoc kieu tien tay "luu anh
// thanh..." — voi mot trang portfolio thi bay nhieu la du va dang gia.
//
// DA BO: phan chan ban phim (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P).
// Ly do bo:
//   - Khong chan duoc gi that: DevTools va Save Page van mo duoc tu menu trinh
//     duyet, chi mat them mot cu bam.
//   - Ma lai chan dung nguoi dung that: Ctrl+P la khach khong in noi trang
//     portfolio de gui di, Ctrl+S la khong luu lai xem sau. Nguoi muon lay anh
//     thi khong vuong, nguoi muon xem tu te thi vuong.
//
// Tat o localhost/mang noi bo de con bam F12 thu giao dien dien thoai.
function SecurityShield() {
  useEffect(() => {
    const isDev = import.meta.env.DEV ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.startsWith('192.168.') ||
                  window.location.hostname.endsWith('.local');
    if (isDev) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
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
  // Giữ đường dẫn hiện tại ở dạng ref để so sánh được ngay trong handler,
  // không phải chờ React dựng lại.
  const currentPathRef = useRef(currentPath);

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
    const finalTitle = (profile?.tabTitle && profile.tabTitle.trim())
      || (profile?.name ? `${profile.name} — Showcase | Portfolio` : 'Phi Hùng — Showcase | Portfolio');
    
    document.title = finalTitle;
    
    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) ogTitle.content = finalTitle;

    const twTitle = document.querySelector("meta[name='twitter:title']");
    if (twTitle) twTitle.content = finalTitle;

    // 2. Dynamic Description (Meta Description / OpenGraph / Twitter)
    const descVal = (profile?.metaDescription && profile.metaDescription.trim())
      || 'Thiết kế không chỉ là thiết kế, mà còn là thiết kế...';
    
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

    // 3. Dynamic Favicon & Apple Touch Icon
    const favUrl = (profile?.favicon && profile.favicon.trim()) || '/favicon.png';
    let iconLink = document.querySelector("link[rel~='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.type = favUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    iconLink.href = favUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = favUrl;

    // 4. Dynamic OpenGraph Image & Twitter Image
    const ogImgUrl = (profile?.ogImage && profile.ogImage.trim()) || 'https://phihun.pages.dev/og-image.png';
    let ogImg = document.querySelector("meta[property='og:image']");
    if (!ogImg) {
      ogImg = document.createElement('meta');
      ogImg.setAttribute('property', 'og:image');
      document.head.appendChild(ogImg);
    }
    ogImg.content = ogImgUrl;

    let ogSecImg = document.querySelector("meta[property='og:image:secure_url']");
    if (ogSecImg) ogSecImg.content = ogImgUrl;

    let twImg = document.querySelector("meta[name='twitter:image']");
    if (!twImg) {
      twImg = document.createElement('meta');
      twImg.setAttribute('name', 'twitter:image');
      document.head.appendChild(twImg);
    }
    twImg.content = ogImgUrl;
  }, [profile?.tabTitle, profile?.metaDescription, profile?.name, profile?.title, profile?.favicon, profile?.ogImage]);

  // Route Synchronization & Scroll Reset
  useEffect(() => {
    const handleLocationChange = () => {
      const clean = getCleanPath();
      // CHỈ cuộn lên đầu khi đổi trang thật (/ <-> /cms).
      //
      // Mở rồi đóng một dự án cũng bắn popstate, nhưng getCleanPath() trả "/"
      // cho cả "/" lẫn "/du-an/<slug>" nên thực chất không đổi trang nào. Cuộn
      // lên đầu ở đây khiến đóng dự án xong bị văng về đầu trang thay vì đứng
      // yên tại mục Dự Án.
      const doiTrangThat = currentPathRef.current !== clean;
      currentPathRef.current = clean;
      setCurrentPath(clean);

      if (doiTrangThat) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }

      // Auto-normalize any extra path like /phihun or /phihun/ back to clean /
      if (typeof window !== 'undefined') {
        const rawPath = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
        if (
          rawPath !== '/' &&
          rawPath !== '/cms' &&
          !rawPath.endsWith('/cms') &&
          !rawPath.startsWith('/api') &&
          // Trang chi tiết dự án (/du-an/<slug>) là đường dẫn hợp lệ — WorkSection
          // tự quản lý nó. Không loại trừ ở đây thì link chia sẻ vừa mở đã bị
          // xoá ngay về "/" và người nhận không thấy dự án nào.
          !rawPath.startsWith(PROJECT_ROUTE) &&
          // Trang chi tiết brand (/brand/<slug>) cũng vậy — ClientMemoriesSection
          // tự quản lý nó.
          !rawPath.startsWith(CLIENT_ROUTE)
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
    return (
      <Suspense fallback={<CMSLoadingScreen />}>
        <CMSPage onBackToPortfolio={() => navigateTo('/')} />
      </Suspense>
    );
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
        <ShowcaseWallSection />
        <WorkSection />
        <ClientMemoriesSection />
        <AboutSection />
        <VibecodeSection />
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


