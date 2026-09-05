import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowUpRight, Check, Copy, Loader2 } from 'lucide-react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function AboutSection() {
  const { profile } = usePortfolioData();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleCopyEmail = (e, emailVal) => {
    e.preventDefault();
    const emailToCopy = emailVal || profile.email || 'phihung.contact@example.com';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(emailToCopy).catch(() => {});
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleDownloadCV = (e) => {
    e?.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadComplete(false);

    let current = 0;
    const interval = setInterval(() => {
      // Dynamic non-linear progress increments (+6% to +16%)
      const increment = Math.floor(Math.random() * 11) + 6;
      current = Math.min(100, current + increment);
      setDownloadProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setDownloadComplete(true);

        // Open/download file upon reaching 100%
        setTimeout(() => {
          const cvLink = profile.cvUrl || profile.resumeUrl;
          const targetUrl = (cvLink && cvLink.trim()) ? cvLink.trim() : '/cv.pdf';
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }, 200);

        // Reset state after 2.5s
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
          setDownloadComplete(false);
        }, 2500);
      }
    }, 55);
  };

  return (
    <section id="about" className="pt-10 sm:pt-16 pb-16 sm:pb-24 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[550px] h-[350px] bg-[#C3EA39]/10 blur-[170px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {/* Synchronized Section Header with Reveal Motion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-[#C3EA39]">
              03
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Về tui
            </h2>
          </div>
        </motion.div>

        {/* Unified Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Visual Identity Photo Card (5 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 h-full"
          >
            {/* Visual Photo Card */}
            <div className="relative rounded-3xl overflow-hidden h-full min-h-[380px] sm:min-h-[440px] bg-[#121216] border border-white/10 group flex flex-col justify-end">
              {profile.avatar || profile.image ? (
                <img
                  src={profile.avatar || profile.image}
                  alt={profile.name}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 select-none"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#16161C] to-[#0A0A0D] flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-2xl font-bold font-display text-[#C3EA39] mb-3 shadow-lg shadow-[#C3EA39]/5">
                    {profile.name ? profile.name.slice(0, 2).toUpperCase() : 'PH'}
                  </div>
                  <span className="text-xs text-white/50 font-mono font-medium">Chưa có ảnh đại diện</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8 pointer-events-none">
                <span className="text-3xl font-display font-black text-white tracking-tight">
                  {profile.name}
                </span>
                <span className="text-sm font-mono font-bold text-[#C3EA39] uppercase tracking-wider mt-1">
                  {profile.title}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Experience, Channels & CV Button (7 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-between space-y-5 sm:space-y-6"
          >
            
            {/* Experience Timeline */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#121216] border border-white/10 space-y-5">
              
              {/* Header: Quá Khứ Của Tui (Brand Color + Faint Divider Line) */}
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-xl font-display font-bold text-[#C3EA39] tracking-tight">
                  Quá Khứ Của Tui
                </h3>
              </div>

              {/* Items: Title + Faint Sub + Year with Active (Glow/Sáng) vs Inactive (Mờ) Status */}
              <div className="space-y-4 sm:space-y-5">
                {profile.experience.map((exp, idx) => {
                  const isCurrent = typeof exp.isCurrent === 'boolean'
                    ? exp.isCurrent
                    : (exp.period?.toLowerCase().includes('hiện tại') || exp.period?.toLowerCase().includes('present'));

                  return (
                    <div
                      key={idx}
                      className={`space-y-1 transition-all duration-300 ${
                        isCurrent
                          ? 'opacity-100'
                          : 'opacity-40 hover:opacity-75'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm sm:text-base font-bold transition-colors ${
                            isCurrent ? 'text-white drop-shadow-sm' : 'text-white/80'
                          }`}>
                            {exp.company}
                          </h4>
                          {isCurrent && (
                            <span 
                              className="relative flex h-2 w-2"
                              title="Đang làm việc"
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C3EA39] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C3EA39] shadow-sm shadow-[#C3EA39]/80" />
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-mono ${
                          isCurrent ? 'text-[#C3EA39] font-bold' : 'text-white/40'
                        }`}>
                          {exp.period}
                        </span>
                      </div>
                      <span className={`block text-xs font-mono ${
                        isCurrent ? 'text-white/70' : 'text-white/40'
                      }`}>
                        // {exp.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Những Nơi Khác (Brand Color + Faint Divider Line + 4 Buttons) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#121216] border border-white/10 space-y-5">
              
              {/* Header: Những Nơi Khác */}
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-xl font-display font-bold text-[#C3EA39] tracking-tight">
                  Những Nơi Khác
                </h3>
              </div>

              {/* 4 Clean Compact Buttons in 1 Single Row: Behance, Facebook, Pinterest, Email */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {profile.socials.map((soc, idx) => {
                  const isEmail = soc.name.toLowerCase().includes('email') || soc.url.startsWith('mailto:');
                  const emailAddress = soc.url.startsWith('mailto:') ? soc.url.replace('mailto:', '') : (profile.email || soc.url);

                  if (isEmail) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => handleCopyEmail(e, emailAddress)}
                        className={`py-3 px-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                          copiedEmail
                            ? 'border-[#C3EA39] bg-[#C3EA39]/10 text-[#C3EA39]'
                            : 'border-white/5 bg-white/[0.02] hover:border-[#C3EA39]/60 hover:bg-white/5 text-white'
                        }`}
                        title={`Bấm để sao chép email: ${emailAddress}`}
                      >
                        <span className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                          copiedEmail ? 'text-[#C3EA39]' : 'text-white group-hover:text-[#C3EA39]'
                        }`}>
                          {copiedEmail ? 'Đã sao chép!' : soc.name}
                        </span>
                        {copiedEmail ? (
                          <Check className="w-3.5 h-3.5 text-[#C3EA39] shrink-0 ml-1.5 animate-fadeIn" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-[#C3EA39] transition-all shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={idx}
                      href={soc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[#C3EA39]/60 hover:bg-white/5 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#C3EA39] transition-colors truncate">
                        {soc.name}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-white/40 group-hover:text-[#C3EA39] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1.5" />
                    </a>
                  );
                })}
              </div>

            </div>

            {/* Resume / CV Download Button with Interactive 0-100% Progress Simulator */}
            <button
              onClick={handleDownloadCV}
              disabled={isDownloading}
              className={`relative overflow-hidden w-full py-4 px-6 rounded-2xl font-display font-bold text-sm tracking-wide transition-all shadow-lg select-none cursor-pointer group ${
                isDownloading || downloadComplete
                  ? 'bg-[#181820] text-black border border-[#C3EA39]'
                  : 'bg-[#C3EA39] hover:bg-[#d4f854] text-black shadow-[#C3EA39]/15 hover:scale-[1.01]'
              }`}
            >
              {/* Background Animated Progress Bar */}
              {(isDownloading || downloadComplete) && (
                <div
                  className="absolute inset-0 bg-[#C3EA39] transition-all duration-75 ease-out"
                  style={{ width: `${downloadProgress}%` }}
                />
              )}

              {/* Shimmer Light effect while downloading */}
              {isDownloading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -skew-x-12 animate-pulse pointer-events-none" />
              )}

              {/* Button Label & Status Icon */}
              <div className="relative z-10 flex items-center justify-center gap-2.5">
                {downloadComplete ? (
                  <>
                    <Check className="w-4 h-4 text-black stroke-[3] animate-bounce" />
                    <span className="font-mono font-bold text-black uppercase tracking-wider">
                      ĐÃ XONG 100% ✓
                    </span>
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                    <span className="font-mono font-bold text-black tracking-wider">
                      ĐANG TẢI... {downloadProgress}%
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-black stroke-[2.5]" />
                    <span className="text-black uppercase">
                      TẢI CV / RESUME (PDF)
                    </span>
                  </>
                )}
              </div>
            </button>

          </motion.div>

        </div>

      </div>
    </section>
  );
}
