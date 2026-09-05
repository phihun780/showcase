import React from 'react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function Footer({ onOpenCMS }) {
  const { profile } = usePortfolioData();

  return (
    <footer className="relative z-10 w-full py-8 pb-12 sm:pb-10 bg-transparent text-xs font-mono text-white/50 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-center select-none text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>
            © {new Date().getFullYear()} <span className="text-white/80 font-bold">{profile?.footerCopyright || profile?.name || 'Phi Hùng'}</span>
          </span>
          <span 
            onClick={onOpenCMS} 
            className="text-[#C3EA39] cursor-pointer hover:scale-125 transition-transform inline-block px-0.5"
            title="Phi Hùng Portfolio"
          >
            ✦
          </span>
          <span>{profile?.footerTagline || 'Graphic Designer Portfolio'}</span>
        </div>
      </div>
    </footer>
  );
}
