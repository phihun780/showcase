import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioData } from '../context/PortfolioDataContext';
import ProjectModal from './ProjectModal';
import SmartImage from './SmartImage';
import { projectPath, slugFromLocation, findProjectBySlug } from '../utils/projectUrl';

export default function WorkSection() {
  const { projects, profile } = usePortfolioData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeProjectModal, setActiveProjectModal] = useState(null);
  // Toạ độ khung preview lúc bấm — điểm xuất phát cho ảnh bay vào modal.
  const previewRef = useRef(null);
  const [originRect, setOriginRect] = useState(null);

  const openProject = (project) => {
    const r = previewRef.current?.getBoundingClientRect();
    setOriginRect(r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null);
    setActiveProjectModal(project);
    // Đẩy URL riêng lên thanh địa chỉ -> copy link gửi được, và nút Back đóng modal.
    window.history.pushState({ duAn: project.id }, '', projectPath(project));
  };

  const closeProject = () => {
    setActiveProjectModal(null);
    setOriginRect(null);
    // Lùi lại đúng một bước thay vì đẩy thêm "/" mới, để bấm Back nhiều lần
    // không phải đi ngược qua một chuỗi dài các lần mở modal.
    if (window.history.state?.duAn) window.history.back();
    else window.history.replaceState({}, '', '/');
  };

  // Đồng bộ hai chiều giữa URL và modal.
  useEffect(() => {
    if (projects.length === 0) return;

    const dongBo = () => {
      const slug = slugFromLocation();
      const duAn = findProjectBySlug(projects, slug);
      if (duAn) {
        const idx = projects.findIndex(p => p.id === duAn.id);
        if (idx >= 0) setSelectedIndex(idx);
        // Mở từ link dán thẳng vào trình duyệt thì không có điểm xuất phát để bay.
        setOriginRect(null);
        setActiveProjectModal(duAn);
      } else {
        setActiveProjectModal(null);
        setOriginRect(null);
        // Link tới dự án đã bị xoá/đổi tên: đưa về trang chủ thay vì để lại một
        // đường dẫn rác trên thanh địa chỉ.
        if (slug) window.history.replaceState({}, '', '/');
      }
    };

    dongBo();                                     // lúc tải trang: /du-an/<slug> -> mở luôn
    window.addEventListener('popstate', dongBo);  // Back/Forward -> đóng/mở theo
    return () => window.removeEventListener('popstate', dongBo);
  }, [projects]);

  const safeIndex = selectedIndex < projects.length ? selectedIndex : 0;
  const currentProject = projects[safeIndex] || projects[0] || {};

  const handleNextProject = () => {
    const nextIdx = (selectedIndex + 1) % projects.length;
    setSelectedIndex(nextIdx);
    // Đổi dự án NGAY TRONG modal thì không bay: khung preview đang bị modal che,
    // bay từ chỗ khuất ra trông như ảnh nhảy lung tung.
    setOriginRect(null);
    setActiveProjectModal(projects[nextIdx]);
    // replaceState chứ không pushState: bấm "tiếp theo" 6 lần rồi bấm Back
    // không nên phải bấm 6 lần mới thoát ra.
    window.history.replaceState({ duAn: projects[nextIdx].id }, '', projectPath(projects[nextIdx]));
  };

  const MIN_SLOTS = 5;
  const placeholderCount = Math.max(0, MIN_SLOTS - projects.length);
  const isScrollable = projects.length > MIN_SLOTS;

  return (
    <section id="work" className="pt-8 sm:pt-16 pb-8 sm:pb-16 scroll-mt-16 relative w-full max-w-full overflow-hidden touch-pan-y">
      
      {/* Ambient background glow mapped to stage (GPU Radial Gradient) */}
      <div 
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[350px] pointer-events-none rounded-full" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.08) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        
        {/* Section Header with Reveal Motion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-baseline gap-3 sm:gap-4">
            <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold text-[#C3EA39]">
              {profile?.section02Number || '02'}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {profile?.section02Title || 'Dự án của tui'}
            </h2>
          </div>
        </motion.div>

        {/* 1-SECTION INTERACTIVE STAGE OR EMPTY STATE */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 sm:p-16 rounded-3xl border-2 border-dashed border-white/15 bg-[#121216]/40 text-center flex flex-col items-center justify-center space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#C3EA39]/10 text-[#C3EA39] flex items-center justify-center font-mono font-bold text-lg">
              ✦
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white">Chưa có dự án nào</h3>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            
            {/* Left: Clean Project Selector List (5 Cols) - Perfectly matching right preview height */}
            <div
              className={`lg:col-span-5 flex flex-col ${
                isScrollable
                  ? 'h-full max-h-[340px] sm:max-h-[425px] overflow-y-auto custom-scrollbar pr-1.5 space-y-2.5 sm:space-y-3'
                  : 'justify-between gap-2.5 sm:gap-3 h-full'
              }`}
            >
              {/* Actual Projects */}
              {projects.map((item, idx) => {
                const isActive = selectedIndex === idx;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onFocus={() => setSelectedIndex(idx)}
                    onClick={() => setSelectedIndex(idx)}
                    aria-pressed={isActive}
                    aria-label={`Xem dự án ${item.title}${item.year ? `, năm ${item.year}` : ''}`}
                    className={`w-full text-left cursor-pointer rounded-2xl transition-all duration-300 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C3EA39] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] ${
                      isScrollable ? 'py-3 sm:py-3.5 px-5 sm:px-6 min-h-[58px] sm:min-h-[75px]' : 'flex-1 py-3 sm:py-3.5 px-5 sm:px-6'
                    } flex items-center justify-between ${
                      isActive
                        ? 'bg-[#141418] border-2 border-[#C3EA39] shadow-lg shadow-[#C3EA39]/5'
                        : 'bg-[#121216]/60 border border-white/5 hover:border-white/20 hover:bg-[#141418]/80'
                    }`}
                  >
                    {/* Left: Index & Project Title */}
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold text-xs ${isActive ? 'text-[#C3EA39]' : 'text-white/40'}`}>
                        {idx < 9 ? `0${idx + 1}` : idx + 1}
                      </span>
                      {/* span chứ không phải h3: tiêu đề thật của dự án đang chọn
                          nằm ở khung preview bên phải, để h3 ở đây sẽ trùng lặp
                          và cũng không được phép nằm trong <button>. */}
                      <span className={`font-bold text-sm sm:text-base uppercase tracking-tight transition-colors ${
                        isActive ? 'text-white' : 'text-white/60'
                      }`}>
                        {item.title}
                      </span>
                    </div>

                    {/* Right: Year */}
                    <span className={`font-mono text-xs transition-colors ${
                      isActive ? 'text-[#C3EA39] font-bold' : 'text-white/40'
                    }`}>
                      {item.year}
                    </span>
                  </motion.button>
                );
              })}

              {/* Placeholder slots if less than MIN_SLOTS */}
              {!isScrollable && Array.from({ length: placeholderCount }).map((_, pIdx) => {
                const slotNum = projects.length + pIdx + 1;
                const numStr = slotNum < 10 ? `0${slotNum}` : `${slotNum}`;
                const totalSlots = Math.max(placeholderCount, 1);
                const stepDelay = 1.0;
                const cycleDelay = (totalSlots - 1) * stepDelay + 2.2;

                return (
                  <div
                    key={`placeholder-slot-${slotNum}`}
                    className="rounded-2xl transition-all duration-300 relative overflow-hidden flex-1 flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border border-dashed border-white/10 bg-[#121216]/30 select-none cursor-default"
                  >
                    {/* Cascading Gentle Light Streak from Top to Bottom (GPU Transform) */}
                    <motion.div
                      className="absolute inset-y-0 w-64 bg-gradient-to-r from-transparent via-[#C3EA39]/12 via-white/[0.08] to-transparent -skew-x-12 pointer-events-none"
                      initial={{ x: '-150%' }}
                      animate={{ x: '350%' }}
                      transition={{
                        repeat: Infinity,
                        repeatDelay: cycleDelay,
                        delay: pIdx * stepDelay,
                        duration: 2.8,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    />

                    {/* Left: Slot Number & Text [Đang thực hiện...] */}
                    <div className="flex items-center gap-3 relative z-10">
                      <span className="font-mono font-bold text-xs text-white/25">
                        {numStr}
                      </span>
                      <span className="font-mono text-xs sm:text-sm tracking-wide font-medium text-white/35">
                        Đang thực hiện...
                      </span>
                    </div>

                    {/* Right: Subtle Monochrome SOON badge */}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md border border-white/10 text-white/25 lowercase bg-white/[0.02] relative z-10">
                      soon
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right: Clean Visual Showcase Canvas (7 Cols) - LOCKED 16:10 ASPECT RATIO */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-center h-full"
            >
              {/* Cả thẻ vẫn bấm được bằng chuột, nhưng phần tử nhận focus là cái
                  <button> bọc tiêu đề bên dưới — nó phủ kín thẻ bằng ::after.
                  Nhờ vậy <h3> giữ nguyên (không thể đặt h3 trong button). */}
              <div
                className="group cursor-pointer relative aspect-[16/10] w-full rounded-3xl overflow-hidden bg-black border-2 border-white/10 hover:border-[#C3EA39] focus-within:border-[#C3EA39] transition-all duration-500 shadow-2xl flex flex-col justify-end p-6 sm:p-8 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#C3EA39] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#08080A]"
              >
                {/* Dynamic Project Image — ĐIỂM XUẤT PHÁT của hiệu ứng bay.
                    Chỉ cần một thẻ div thường có ref để đo toạ độ lúc bấm.
                    KHÔNG dùng layoutId của framer-motion: đã thử và dính 3 lỗi
                    (exit treo vĩnh viễn, transform cộng dồn mỗi lần mở/đóng, và
                    còn sót scale 1.59 sau khi bấm "dự án tiếp theo"). Tự tính
                    đường bay thì kiểm soát được hết, không có trạng thái ẩn. */}
                {currentProject.coverImage && (
                  <div ref={previewRef} className="absolute inset-0 w-full h-full">
                    <SmartImage
                      key={currentProject.coverImage}
                      src={currentProject.coverImage}
                      alt={currentProject.title}
                      /* Desktop: cột 7/12 của khung 1280px. Mobile: trọn bề ngang trừ lề */
                      sizes="(min-width: 1024px) 740px, calc(100vw - 40px)"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  </div>
                )}

                {/* Gradient Vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                {/* Bottom Clean Project Info */}
                <div className="relative z-10 space-y-1 sm:space-y-1.5">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold uppercase text-white tracking-tight group-hover:text-[#C3EA39] transition-colors">
                    <button
                      type="button"
                      onClick={() => openProject(currentProject)}
                      aria-label={`Mở chi tiết dự án ${currentProject.title}`}
                      className="text-left cursor-pointer focus:outline-none after:absolute after:inset-0 after:z-20 after:content-['']"
                    >
                      {currentProject.title}
                    </button>
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 font-light max-w-lg line-clamp-1">
                    {currentProject.subtitle}
                  </p>
                </div>

              </div>
            </motion.div>

          </div>
        )}

      </div>

      {/* Case Study Modal
          CỐ TÌNH KHÔNG bọc AnimatePresence. Đã thử và hỏng: AnimatePresence +
          createPortal + layoutId hai chiều làm animation bay ngược không bao giờ
          kết thúc, nên exit treo vĩnh viễn — modal không đóng được, scroll kẹt
          khoá, ảnh nguồn đứng nguyên ở opacity 0.
          Giữ một chiều: bay vào thì có hiệu ứng, đóng thì tắt ngay và dứt khoát. */}
      <ProjectModal
        project={activeProjectModal}
        isOpen={Boolean(activeProjectModal)}
        originRect={originRect}
        onClose={closeProject}
        onSelectNextProject={handleNextProject}
      />
    </section>
  );
}
