import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function Header({ activeSection, setActiveSection, onOpenCMS }) {
  const { projects, profile } = usePortfolioData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);

  const rawTitle1 = profile?.headerTitle1 || 'PORTFOLIO // SHOWCASE';
  const rawTitle2 = profile?.headerTitle2 || 'GRAPHIC DESIGNER';

  const formatTitle = (str) => {
    if (!str) return '';
    if (str.includes('//')) {
      const parts = str.split('//');
      return (
        <>
          {parts[0].trim()} <span className="text-[#C3EA39] font-normal">//</span> {parts.slice(1).join('//').trim()}
        </>
      );
    }
    return str;
  };

  const titles = [
    {
      id: 'title-1',
      content: formatTitle(rawTitle1),
    },
    {
      id: 'title-2',
      content: formatTitle(rawTitle2),
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % titles.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [titles.length]);

  const navItems = [
    { label: profile?.headerNavWork || 'Dự án của tui', id: 'work', count: `${projects.length}` },
    { label: profile?.headerNavAbout || 'Về tui', id: 'about' },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080A]/75 backdrop-blur-xl border-b border-white/10 py-4 transition-all">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        
        {/* Left: Brand Monogram & Sliding Title (Sliding out from logo smoothly every 7s) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-2.5 text-white hover:text-[#C3EA39] transition-colors select-none"
        >
          {/* Monogram Logo Icon */}
          <span className="text-[#C3EA39] font-black text-base shrink-0 group-hover:rotate-12 transition-transform z-10">
            ✦
          </span>

          {/* Masked Sliding Text Container */}
          <div className="relative overflow-hidden h-6 flex items-center min-w-[190px] sm:min-w-[220px]">
            <AnimatePresence mode="wait">
              <motion.span
                key={titleIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono font-bold text-xs sm:text-sm tracking-wider text-white group-hover:text-[#C3EA39] transition-colors whitespace-nowrap block"
              >
                {titles[titleIndex].content}
              </motion.span>
            </AnimatePresence>
          </div>
        </a>

        {/* Right: Clean Text Nav Links (No rounded pill containers) */}
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-mono tracking-wider">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`relative py-1 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'text-[#C3EA39] font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count && (
                    <span className={`text-[11px] ${isActive ? 'text-[#C3EA39]/80' : 'text-white/40'}`}>
                      [{item.count}]
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C3EA39] rounded-full animate-fadeIn" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-white/80 hover:text-[#C3EA39] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-[#C3EA39]" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-5 pt-3 pb-5 bg-[#08080A]/95 border-b border-white/10 backdrop-blur-2xl animate-fadeIn space-y-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`w-full text-left py-2 text-sm font-mono flex items-center justify-between ${
                activeSection === item.id
                  ? 'text-[#C3EA39] font-bold'
                  : 'text-white/70'
              }`}
            >
              <span>{item.label}</span>
              {item.count && <span className="text-xs text-white/40">[{item.count}]</span>}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
