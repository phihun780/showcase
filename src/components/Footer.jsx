import React from 'react';
import { ArrowUp } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function Footer() {
  const { profile } = usePortfolioData();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="py-8 bg-transparent text-xs font-mono text-white/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        
        {/* Left: Clean Copyright */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span>
            © {new Date().getFullYear()} <span className="text-white/80 font-bold">{profile.name}</span> <span className="text-[#C3EA39]">✦</span> Graphic Designer Portfolio
          </span>
        </div>

        {/* Right: Back to top button */}
        <button
          onClick={scrollToTop}
          className="inline-flex items-center gap-1.5 text-white/50 hover:text-[#C3EA39] transition-colors cursor-pointer"
        >
          <span>LÊN ĐẦU TRANG</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

      </div>
    </footer>
  );
}
