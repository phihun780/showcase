import React from 'react';
import { ArrowUp } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function Footer({ onOpenCMS }) {
  const { profile } = usePortfolioData();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-8 bg-transparent text-xs font-mono text-white/40 border-t border-white/5 mt-12">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        
        {/* Left: Clean Copyright & Discreet CMS access */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span>
            © {new Date().getFullYear()} <span className="text-white/80 font-bold">{profile?.name || 'Phi Hùng'}</span>
          </span>
          <button
            onClick={onOpenCMS}
            className="text-[#C3EA39] hover:scale-125 transition-transform cursor-pointer p-0.5"
            title="Mở Quản Trị CMS (/cms)"
          >
            ✦
          </button>
          <span>Graphic Designer Portfolio</span>
        </div>

        {/* Right: Back to top & CMS link */}
        <div className="flex items-center gap-4">
          {onOpenCMS && (
            <button
              onClick={onOpenCMS}
              className="text-white/30 hover:text-[#C3EA39] transition-colors cursor-pointer text-[11px] font-mono"
              title="Đăng nhập CMS (/cms)"
            >
              [CMS]
            </button>
          )}
          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 text-white/50 hover:text-[#C3EA39] transition-colors cursor-pointer"
          >
            <span>LÊN ĐẦU TRANG</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
}
