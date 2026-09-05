import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  MousePointer, 
  Square, 
  Eye, 
  Lock, 
  Move, 
  ChevronDown,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const ARTWORKS = [
  {
    id: 'cat',
    name: 'Mèo (Cat)',
    shortName: 'Mèo',
    fileName: 'cat.svg @ 100% (Vector Mascot, RGB/8#)',
    shortFileName: 'cat.svg',
    layerName: 'Vector: Cat_Mascot',
    dimensions: '3999 x 3999 px',
    viewBox: '0 0 3999.26 3999.26',
    swatchColor: '#000072',
    fgColor: '#FFC536',
    bgColor: '#000072'
  },
  {
    id: 'dog',
    name: 'Chó (Dog)',
    shortName: 'Chó',
    fileName: 'dog.svg @ 100% (Vector Mascot, RGB/8#)',
    shortFileName: 'dog.svg',
    layerName: 'Vector: Dog_Mascot',
    dimensions: '2000 x 2000 px',
    viewBox: '0 0 2000 2000',
    swatchColor: '#3D2C22',
    fgColor: '#F58634',
    bgColor: '#3D2C22'
  }
];

export default function PhotoshopSimulator() {
  const [selectedArtworkId, setSelectedArtworkId] = useState('cat');
  const [animKey, setAnimKey] = useState(0);
  const [drawStage, setDrawStage] = useState('drawing'); // 'drawing' | 'coloring' | 'detailing' | 'complete'
  const [showVectorNodes, setShowVectorNodes] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth Spring physics for 3D Tilt (Desktop only)
  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useTransform(mouseY, [-200, 200], [6, -6]);
  const rotateY = useTransform(mouseX, [-200, 200], [-8, 8]);
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const activeArtwork = ARTWORKS.find((a) => a.id === selectedArtworkId) || ARTWORKS[0];

  // Stage timeline tracking for realistic Photoshop status updates
  useEffect(() => {
    if (isMobile) {
      setDrawStage('complete');
      return;
    }
    setDrawStage('drawing');
    const t1 = setTimeout(() => setDrawStage('coloring'), 1600);
    const t2 = setTimeout(() => setDrawStage('detailing'), 2700);
    const t3 = setTimeout(() => setDrawStage('complete'), 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [selectedArtworkId, animKey, isMobile]);

  // Auto switch between Cat and Dog on desktop only
  useEffect(() => {
    if (isMobile) return;
    const timer = setInterval(() => {
      setSelectedArtworkId((prev) => (prev === 'cat' ? 'dog' : 'cat'));
      setAnimKey((k) => k + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [isMobile]);

  const handleSelectAnimal = (id) => {
    setSelectedArtworkId(id);
    setAnimKey((k) => k + 1);
  };

  const handleReplay = () => {
    setAnimKey((k) => k + 1);
  };

  // Handle 3D Pointer Move (Desktop only for smooth interaction, stable on mobile)
  const handleContainerMouseMove = (e) => {
    if (!containerRef.current || isMobile) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleContainerMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      style={{ perspective: isMobile ? 'none' : 1200 }}
      className="relative w-full max-w-[630px] lg:max-w-[670px] xl:max-w-[690px] mx-auto lg:mr-0 lg:ml-auto flex flex-col items-center justify-center py-2 sm:py-4 px-1"
    >
      
      {/* 3D Floating Shadow on the floor */}
      <motion.div
        animate={isMobile ? { opacity: 0.35 } : {
          scale: [0.92, 1.04, 0.92],
          opacity: [0.35, 0.55, 0.35],
          y: [0, 6, 0]
        }}
        transition={isMobile ? {} : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-3 sm:-bottom-5 w-4/5 h-8 bg-black/80 blur-2xl rounded-full pointer-events-none"
      />

      {/* Subtle Ambient Glow behind 3D Board (GPU Radial Gradient) */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none" 
        style={{ background: 'radial-gradient(circle, rgba(195, 234, 57, 0.12) 0%, transparent 70%)' }}
      />

      {/* 3D FLOATING MAIN WINDOW */}
      <motion.div
        style={{
          rotateX: isMobile ? 0 : springRotateX,
          rotateY: isMobile ? 0 : springRotateY,
          transformStyle: isMobile ? 'flat' : 'preserve-3d'
        }}
        animate={isMobile ? { y: 0, rotateZ: 0 } : {
          y: [0, -8, 0],
          rotateZ: [-0.3, 0.3, -0.3]
        }}
        transition={isMobile ? {} : {
          y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
          rotateZ: { duration: 7, repeat: Infinity, ease: 'easeInOut' }
        }}
        className="w-full max-w-full rounded-xl bg-[#282828] border border-[#444]/90 shadow-[0_22px_55px_rgba(0,0,0,0.85)] overflow-hidden text-[#d5d5d5] font-sans text-xs select-none relative group transition-shadow duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.95)]"
      >
        
        {/* 1. TOP MENU BAR */}
        <div className="bg-[#1f1f1f] border-b border-[#383838] px-3 py-1.5 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 text-[11px] text-[#b5b5b5]">
            <span className="px-1.5 py-0.5 bg-[#331400] text-[#FF9A00] font-bold text-[10px] rounded border border-[#FF9A00]/50 tracking-tight font-mono shadow-sm shadow-[#FF9A00]/20" title="Adobe Illustrator 2024">
              Ai
            </span>

            <div className="hidden sm:flex items-center gap-3">
              <span className="text-white hover:text-white cursor-pointer">File</span>
              <span className="hover:text-white cursor-pointer">Edit</span>
              <span className="hover:text-white cursor-pointer">Object</span>
              <span className="hover:text-white cursor-pointer">Type</span>
              <span className="hover:text-white cursor-pointer">Select</span>
              <span className="hover:text-white cursor-pointer">Effect</span>
              <span className="hover:text-white cursor-pointer">View</span>
              <span className="hover:text-white cursor-pointer">Window</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#888] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#FF9A00] animate-pulse" />
            <span className="hidden sm:inline">Adobe Illustrator • Vector Engine</span>
          </div>

        </div>


        {/* 2. OPTIONS & ANIMAL SWITCHER BAR (Choose Cat / Dog + Replay) */}
        <div className="bg-[#2b2b2b] border-b border-[#383838] px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 text-[11px]">
          
          {/* Left: Tool Parameters */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#202020] rounded border border-[#3e3e3e]">
              <PenTool className="w-3.5 h-3.5 text-[#FF9A00]" />
              <span className="text-white font-medium text-[10px] sm:text-[11px]">Pen Tool</span>
              <ChevronDown className="w-3 h-3 text-[#777] hidden xs:inline" />
            </div>

            {/* Artwork Swatch */}
            <div className="flex items-center gap-1">
              <div 
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm border border-[#555] shadow-inner"
                style={{ backgroundColor: activeArtwork.swatchColor }}
              />
            </div>

            <button
              onClick={() => setShowVectorNodes(!showVectorNodes)}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] border transition-colors cursor-pointer ${
                showVectorNodes 
                  ? 'bg-[#FF9A00]/15 border-[#FF9A00] text-[#FF9A00]' 
                  : 'bg-[#202020] border-[#3e3e3e] text-[#888]'
              }`}
            >
              Nodes
            </button>
          </div>

          {/* Right: Animal Tabs (Cat / Dog) + Replay button */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-[#1e1e1e] p-0.5 rounded border border-[#3e3e3e]">
              {ARTWORKS.map((art) => {
                const isSelected = selectedArtworkId === art.id;

                return (
                  <button
                    key={art.id}
                    onClick={() => handleSelectAnimal(art.id)}
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF9A00] text-black shadow-sm font-semibold'
                        : 'text-[#aaa] hover:text-white hover:bg-[#2e2e2e]'
                    }`}
                  >
                    <span>{art.id === 'cat' ? '🐱' : '🐶'}</span>
                    <span className="hidden xs:inline">{art.name}</span>
                    <span className="xs:hidden">{art.shortName}</span>
                  </button>
                );
              })}
            </div>

            {/* Replay draw button */}
            <button
              onClick={handleReplay}
              title="Vẽ lại từ đầu"
              className="p-1 rounded bg-[#202020] hover:bg-[#333] border border-[#3e3e3e] text-[#aaa] hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

        </div>


        {/* 3. DOCUMENT TAB BAR */}
        <div className="bg-[#202020] border-b border-[#383838] px-2 flex items-center justify-between">
          <div className="bg-[#282828] border-t-2 border-[#FF9A00] border-x border-[#383838] px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 text-[10px] sm:text-[11px] text-white font-medium">
            <span className="sm:hidden">{activeArtwork.shortFileName}</span>
            <span className="hidden sm:inline">{activeArtwork.fileName}</span>
            <span className="text-[#888] hover:text-white text-xs ml-1 cursor-pointer">×</span>
          </div>

          {/* Drawing Status Tag */}
          <div className="pr-1 sm:pr-2 flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px]">
            {drawStage === 'complete' ? (
              <span className="text-[#27c93f] flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Render Complete</span>
                <span className="sm:hidden">Complete</span>
              </span>
            ) : (
              <span className="text-[#FF9A00] flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A00] animate-ping" />
                <span>
                  {drawStage === 'drawing' && 'Drawing paths...'}
                  {drawStage === 'coloring' && 'Applying fills...'}
                  {drawStage === 'detailing' && 'Rendering details...'}
                </span>
              </span>
            )}
          </div>
        </div>


        {/* 4. MAIN WORKSPACE (Toolbar Left + Canvas Center + Layers Right) */}
        <div className="flex w-full min-h-[260px] xs:min-h-[285px] sm:min-h-[330px] bg-[#1a1a1a]">
          
          {/* Left: Illustrator Vertical Toolbar */}
          <div className="w-8 xs:w-9 sm:w-11 shrink-0 bg-[#282828] border-r border-[#383838] py-2 flex flex-col items-center gap-1 sm:gap-1.5">
            {[
              { id: 'move', icon: Move, label: 'Selection Tool (V)' },
              { id: 'select', icon: MousePointer, label: 'Direct Selection (A)' },
              { id: 'pen', icon: PenTool, label: 'Pen Tool (P)' },
              { id: 'shape', icon: Square, label: 'Rectangle (M)' },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = (drawStage === 'drawing' && tool.id === 'pen') || (drawStage !== 'drawing' && tool.id === 'select');

              return (
                <div
                  key={tool.id}
                  title={tool.label}
                  className={`p-1 sm:p-1.5 rounded transition-colors ${
                    isActive
                      ? 'bg-[#3e3e3e] text-[#FF9A00] shadow-inner'
                      : 'text-[#888]'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              );
            })}

            <div className="w-3 sm:w-4 h-px bg-[#3e3e3e] my-0.5 sm:my-1" />

            {/* Exact Artwork Color Swatches */}
            <div className="relative w-4 h-4 sm:w-5 sm:h-5 mt-0.5 sm:mt-1">
              <div 
                className="absolute top-0 left-0 w-3 h-3 sm:w-3.5 sm:h-3.5 border border-black z-10 rounded-[1px]"
                style={{ backgroundColor: activeArtwork.fgColor }}
              />
              <div 
                className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 border border-[#555] rounded-[1px]"
                style={{ backgroundColor: activeArtwork.bgColor }}
              />
            </div>
          </div>


          {/* Center: Illustrator Artboard Canvas displaying Step-by-Step Drawing -> Complete SVG Face */}
          <div 
            onClick={handleReplay}
            title="Nhấp để vẽ lại"
            className="flex-1 bg-[#1e1e1e] flex items-center justify-center p-2 xs:p-3 sm:p-4 overflow-hidden relative cursor-pointer"
          >
            
            {/* White / Dark Canvas Artboard with Drop Shadow */}
            <div className="relative w-[215px] h-[215px] xs:w-[240px] xs:h-[240px] sm:w-[270px] sm:h-[270px] max-w-full aspect-square bg-[#141419] border border-[#383838] shadow-2xl flex items-center justify-center p-2 rounded-sm">
              
              {/* Subtle Grid Texture */}
              <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

              {/* Animate Artwork Drawing Cycle */}
              <AnimatePresence mode="wait">
                
                {/* 🐱 100% EXACT CAT SVG ARTWORK - STEP-BY-STEP DRAWING */}
                {selectedArtworkId === 'cat' && (
                  <motion.svg
                    key={`cat-svg-${animKey}`}
                    viewBox="0 0 3999.26 3999.26"
                    className="w-full h-full drop-shadow-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    
                    {/* STEP 1: VECTOR PEN TOOL STROKE OUTLINE DRAWING (0s -> 1.8s) */}
                    <motion.path
                      fill="none"
                      stroke="#000072"
                      strokeWidth="28"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2000,3003.45c-0.06,0-0.13,0-0.2,0c-230.08-1.99-448.68-52.51-649.75-150.17 c-17.58-8.54-35.17-17.52-52.28-26.69c-214.16-114.79-362.26-324.54-396.17-561.06c-0.68-4.75-1.33-9.53-1.94-14.34 c-37.82-296.39,75.04-530.65,149.83-648.7c-20.95-81.21-32.34-164.64-33.88-248.13c-1.69-91.97,8.55-184.18,30.47-274.08 c7.01-28.77,24.83-53,50.19-68.2c25.08-15.05,54.46-19.34,82.69-12.09c58.16,14.92,113.9,37.59,165.68,67.38 c61.79,35.55,117.08,80.56,164.56,133.93c59.61-22.66,121.1-41.43,182.99-55.84c100.46-23.39,203.94-35.84,307.56-36.99 c0.17,0,0.33,0,0.5,0c103.62,1.15,207.1,13.6,307.57,36.99c61.89,14.41,123.38,33.18,182.99,55.84 c47.47-53.37,102.76-98.38,164.56-133.93c51.78-29.79,107.52-52.46,165.68-67.38c28.22-7.24,57.6-2.95,82.69,12.09 c25.36,15.21,43.18,39.43,50.19,68.2c21.91,89.9,32.16,182.11,30.47,274.08c-1.54,83.5-12.93,166.92-33.88,248.13 c74.79,118.05,187.66,352.31,149.83,648.72c-0.61,4.8-1.26,9.58-1.94,14.33c-33.92,236.52-182.02,446.26-396.17,561.05 c-17.11,9.17-34.7,18.15-52.28,26.69c-201.06,97.66-419.67,148.18-649.75,150.17C2000.13,3003.45,2000.06,3003.45,2000,3003.45z"
                      initial={{ pathLength: 0, opacity: 0.9 }}
                      animate={{ pathLength: 1, opacity: [0.9, 1, 0.3] }}
                      transition={{ duration: 1.8, ease: "easeInOut" }}
                    />

                    {/* STEP 2: BASE HEAD FILL (#FFFFFF) - Fades & Expands in (1.5s) */}
                    <motion.path
                      fill="#FFFFFF"
                      d="M3078.01,2248.36c-0.59,4.68-1.25,9.35-1.91,13.96c-33.29,232.27-177.71,433.58-384.53,544.43 c-16.63,8.9-33.81,17.7-51.48,26.26c-254.96,123.84-492.43,146.64-640.11,147.92c-147.64-1.28-385.11-24.08-640.08-147.92 c-17.67-8.56-34.85-17.36-51.48-26.26c-206.81-110.85-351.23-312.16-384.53-544.43c-0.69-4.61-1.32-9.28-1.91-13.96 c-41.29-323.66,104.13-568.54,151.77-642.05c-17.67-66.06-33.78-151.8-35.65-252.37c-1.91-104.41,12.06-195.38,29.83-268.34 c11.43-46.84,58.72-75.8,105.42-63.81c47.01,12.06,102.4,31.91,160.05,65.06c80.92,46.56,135.83,101.81,169.16,141.13 c56.12-22.07,121.28-43.51,194.72-60.62c115.01-26.78,218.35-35.47,302.7-36.41c6.76,0.07,13.61,0.21,20.61,0.38 c80.37,2.04,176.33,11.4,282.12,36.03c73.44,17.11,138.6,38.56,194.72,60.62c33.33-39.32,88.23-94.57,169.16-141.13 c57.64-33.15,113.04-53,160.05-65.06c46.7-11.99,93.98,16.97,105.42,63.81c17.77,72.96,31.73,163.93,29.83,268.34 c-1.87,100.57-17.98,186.3-35.68,252.37c20.09,31,57.61,92.49,91.14,177.54C3063.32,1900.41,3101.87,2061.22,3078.01,2248.36z"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
                    />

                    {/* STEP 2: EAR COLOR PATCH (#FFC536) - Slides in (1.9s) */}
                    <motion.path
                      fill="#FFC536"
                      d="M3017.35,1783.84c-45.55,7.27-92.25,11.02-139.81,11.02c-412.27,0-758.66-281.95-856.94-663.53 c80.37,2.04,176.33,11.4,282.12,36.03c73.44,17.11,138.6,38.56,194.72,60.62c33.33-39.32,88.23-94.57,169.16-141.13 c57.64-33.15,113.04-53,160.05-65.06c46.7-11.99,93.98,16.97,105.42,63.81c17.77,72.96,31.73,163.93,29.83,268.34 c-1.87,100.57-17.98,186.3-35.68,252.37C2946.3,1637.31,2983.82,1698.8,3017.35,1783.84z"
                      initial={{ opacity: 0, y: -60 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.9, duration: 0.5, ease: "easeOut" }}
                    />

                    {/* STEP 3: CHEEKS (#FF92B4) - Pops in with spring (2.3s) */}
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 2.3, duration: 0.4, type: "spring", stiffness: 260, damping: 18 }}
                      style={{ originX: "50%", originY: "50%" }}
                    >
                      <ellipse fill="#FF92B4" cx="1360.1" cy="2189.93" rx="224.03" ry="123.85" />
                      <ellipse fill="#FF92B4" cx="2639.9" cy="2189.93" rx="224.03" ry="123.85" />
                    </motion.g>

                    {/* STEP 3: EYES & PUPILS (#000072 & #FFFFFF) - Twinkles in (2.6s) */}
                    <motion.g
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 2.6, duration: 0.4, type: "spring", stiffness: 280, damping: 16 }}
                      style={{ originX: "50%", originY: "50%" }}
                    >
                      <ellipse fill="#000072" cx="1546.93" cy="1894.72" rx="143.86" ry="155.29" />
                      <ellipse fill="#000072" cx="2453.07" cy="1894.72" rx="143.86" ry="155.29" />
                      <ellipse fill="#FFFFFF" cx="1584.13" cy="1870.99" rx="51.31" ry="55.39" />
                      <ellipse fill="#FFFFFF" opacity="0.35" cx="1500.23" cy="1960.94" rx="35.07" ry="37.86" />
                      <ellipse fill="#FFFFFF" cx="2415.87" cy="1870.99" rx="51.31" ry="55.39" />
                      <ellipse fill="#FFFFFF" opacity="0.35" cx="2499.77" cy="1960.94" rx="37.86" ry="35.07" />
                    </motion.g>

                    {/* STEP 3: NOSE & MOUTH (#000072) - Fades in (2.9s) */}
                    <motion.g
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 2.9, duration: 0.4, ease: "easeOut" }}
                      style={{ originX: "50%", originY: "50%" }}
                    >
                      <path
                        fill="#000072"
                        d="M2087.55,1988.21c-19.4-6.79-47.37-11.97-87.55-11.97c-40.18,0-68.15,5.18-87.55,11.97 c-27.75,9.71-38.3,43.22-21.31,67.21c12.09,17.07,24.76,30.61,37.01,41.32c13.26,11.6,28.6,19.45,44.67,23.58l25.45,160.93h3.46 l25.45-160.93c16.07-4.14,31.41-11.98,44.67-23.58c12.25-10.71,24.92-24.25,37.01-41.32 C2125.85,2031.43,2115.3,1997.92,2087.55,1988.21z"
                      />
                      <ellipse fill="#FFFFFF" cx="2000" cy="2013.9" rx="56.93" ry="18.06" />
                    </motion.g>

                    {/* STEP 3: WHISKERS - Glide out left & right (3.2s) */}
                    <motion.g
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 3.2, duration: 0.4 }}
                    >
                      <motion.path 
                        fill="#000072" 
                        d="M1090.59,1928.08c-2.45,0-4.93-0.4-7.37-1.25l-319.48-110.7c-11.75-4.07-17.97-16.9-13.9-28.65 c4.07-11.75,16.89-17.98,28.65-13.9l319.48,110.7c11.75,4.07,17.97,16.9,13.9,28.65 C1108.65,1922.24,1099.92,1928.08,1090.59,1928.08z" 
                        initial={{ x: 40 }} animate={{ x: 0 }} transition={{ delay: 3.2, duration: 0.4 }}
                      />
                      <motion.path 
                        fill="#000072" 
                        d="M1027.54,2072.53H645c-12.44,0-22.52-10.08-22.52-22.52c0-12.44,10.08-22.52,22.52-22.52h382.54 c12.44,0,22.52,10.08,22.52,22.52C1050.06,2062.45,1039.98,2072.53,1027.54,2072.53z" 
                        initial={{ x: 40 }} animate={{ x: 0 }} transition={{ delay: 3.3, duration: 0.4 }}
                      />
                      <motion.path 
                        fill="#000072" 
                        d="M771.11,2323.15c-9.33,0-18.05-5.84-21.27-15.15c-4.07-11.75,2.15-24.58,13.9-28.65l319.48-110.7 c11.75-4.08,24.58,2.16,28.65,13.9c4.07,11.75-2.15,24.58-13.9,28.65l-319.48,110.7 C776.04,2322.75,773.56,2323.15,771.11,2323.15z" 
                        initial={{ x: 40 }} animate={{ x: 0 }} transition={{ delay: 3.4, duration: 0.4 }}
                      />
                      <motion.path 
                        fill="#000072" 
                        d="M2909.4,1928.08c-9.33,0-18.05-5.84-21.27-15.15c-4.07-11.75,2.15-24.58,13.9-28.65l319.49-110.7 c11.78-4.06,24.58,2.16,28.65,13.9c4.07,11.75-2.15,24.58-13.9,28.65l-319.49,110.7 C2914.33,1927.68,2911.84,1928.08,2909.4,1928.08z" 
                        initial={{ x: -40 }} animate={{ x: 0 }} transition={{ delay: 3.2, duration: 0.4 }}
                      />
                      <motion.path 
                        fill="#000072" 
                        d="M3355,2072.53h-382.54c-12.44,0-22.52-10.08-22.52-22.52c0-12.44,10.08-22.52,22.52-22.52H3355 c12.44,0,22.52,10.08,22.52,22.52C3377.52,2062.45,3367.43,2072.53,3355,2072.53z" 
                        initial={{ x: -40 }} animate={{ x: 0 }} transition={{ delay: 3.3, duration: 0.4 }}
                      />
                      <motion.path 
                        fill="#000072" 
                        d="M3228.89,2323.15c-2.45,0-4.93-0.4-7.37-1.25l-319.49-110.7c-11.75-4.07-17.97-16.89-13.9-28.65 c4.07-11.74,16.9-17.99,28.65-13.9l319.49,110.7c11.75,4.07,17.97,16.89,13.9,28.65 C3246.94,2317.31,3238.22,2323.15,3228.89,2323.15z" 
                        initial={{ x: -40 }} animate={{ x: 0 }} transition={{ delay: 3.4, duration: 0.4 }}
                      />
                    </motion.g>

                    {/* STEP 4: FINAL CRISP OUTLINE BORDER (#000072) */}
                    <motion.path
                      fill="#000072"
                      d="M2000,3003.45c-0.06,0-0.13,0-0.2,0c-230.08-1.99-448.68-52.51-649.75-150.17 c-17.58-8.54-35.17-17.52-52.28-26.69c-214.16-114.79-362.26-324.54-396.17-561.06c-0.68-4.75-1.33-9.53-1.94-14.34 c-37.82-296.39,75.04-530.65,149.83-648.7c-20.95-81.21-32.34-164.64-33.88-248.13c-1.69-91.97,8.55-184.18,30.47-274.08 c7.01-28.77,24.83-53,50.19-68.2c25.08-15.05,54.46-19.34,82.69-12.09c58.16,14.92,113.9,37.59,165.68,67.38 c61.79,35.55,117.08,80.56,164.56,133.93c59.61-22.66,121.1-41.43,182.99-55.84c100.46-23.39,203.94-35.84,307.56-36.99 c0.17,0,0.33,0,0.5,0c103.62,1.15,207.1,13.6,307.57,36.99c61.89,14.41,123.38,33.18,182.99,55.84 c47.47-53.37,102.76-98.38,164.56-133.93c51.78-29.79,107.52-52.46,165.68-67.38c28.22-7.24,57.6-2.95,82.69,12.09 c25.36,15.21,43.18,39.43,50.19,68.2c21.91,89.9,32.16,182.11,30.47,274.08c-1.54,83.5-12.93,166.92-33.88,248.13 c74.79,118.05,187.66,352.31,149.83,648.72c-0.61,4.8-1.26,9.58-1.94,14.33c-33.92,236.52-182.02,446.26-396.17,561.05 c-17.11,9.17-34.7,18.15-52.28,26.69c-201.06,97.66-419.67,148.18-649.75,150.17C2000.13,3003.45,2000.06,3003.45,2000,3003.45z M1151.99,1041.58c-11.34,0-22.52,3.08-32.55,9.1c-14.95,8.97-25.46,23.26-29.6,40.25c-20.99,86.14-30.82,174.49-29.19,262.59 c1.53,83.16,13.27,166.25,34.89,246.97c1.65,6.16,0.61,12.72-2.86,18.07c-71.25,109.93-185.27,337.56-148.34,626.94 c0.59,4.59,1.2,9.13,1.85,13.64c31.88,222.41,171.27,419.7,372.87,527.76c16.58,8.89,33.63,17.59,50.68,25.87 c194.94,94.68,407,143.68,630.26,145.64c223.27-1.96,435.33-50.96,630.27-145.64c17.05-8.28,34.1-16.99,50.68-25.87 c201.59-108.06,340.98-305.35,372.87-527.76c0.65-4.51,1.26-9.06,1.85-13.63c36.93-289.39-77.09-517.02-148.34-626.95 c-3.47-5.35-4.5-11.91-2.86-18.07c21.62-80.72,33.36-163.81,34.89-246.97c1.63-88.1-8.2-176.45-29.19-262.59 c-4.14-16.99-14.65-31.28-29.6-40.25c-14.68-8.81-31.84-11.32-48.33-7.09c-54.21,13.91-106.17,35.04-154.41,62.79 c-61.91,35.62-116.82,81.43-163.21,136.15c-6.23,7.35-16.46,9.92-25.42,6.4c-62.21-24.46-126.67-44.52-191.6-59.64 c-97.2-22.63-197.33-34.68-297.6-35.82c-100.27,1.13-200.4,13.18-297.6,35.82c-64.93,15.12-129.39,35.18-191.6,59.64 c-8.96,3.52-19.18,0.95-25.42-6.4c-46.39-54.73-101.3-100.54-163.21-136.15c-48.24-27.75-100.2-48.88-154.41-62.79 C1162.54,1042.25,1157.25,1041.58,1151.99,1041.58z"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.8, duration: 0.5 }}
                    />

                    {/* ANIMATED PEN TOOL CURSOR (Moves while drawing path) */}
                    <motion.g
                      initial={{ opacity: 1, x: 2000, y: 3003 }}
                      animate={{
                        opacity: [1, 1, 1, 0],
                        x: [2000, 1360, 922, 1152, 2000, 2853, 3078, 2000],
                        y: [3003, 2800, 2248, 1042, 1080, 1042, 2248, 3003]
                      }}
                      transition={{ duration: 1.8, ease: "easeInOut", times: [0, 0.15, 0.3, 0.5, 0.65, 0.8, 0.92, 1] }}
                    >
                      <circle r="40" fill="#31a8ff" fillOpacity="0.4" stroke="#31a8ff" strokeWidth="8" />
                      <line x1="-60" y1="0" x2="60" y2="0" stroke="#31a8ff" strokeWidth="12" />
                      <line x1="0" y1="-60" x2="0" y2="60" stroke="#31a8ff" strokeWidth="12" />
                    </motion.g>

                    {/* Direct Selection Vector Anchor Nodes overlay (Appears when completed) */}
                    {showVectorNodes && (
                      <motion.g
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: drawStage === 'complete' ? 1 : 0.4, scale: 1 }}
                        transition={{ delay: 1.8, duration: 0.4 }}
                      >
                        {[
                          { x: 1152, y: 1042 },
                          { x: 1475, y: 1145 },
                          { x: 2000, y: 1080 },
                          { x: 2525, y: 1145 },
                          { x: 2853, y: 1042 },
                          { x: 3078, y: 2248 },
                          { x: 2640, y: 2800 },
                          { x: 2000, y: 3003 },
                          { x: 1360, y: 2800 },
                          { x: 922, y: 2248 }
                        ].map((pt, i) => (
                          <rect
                            key={`cat-node-${i}`}
                            x={pt.x - 28}
                            y={pt.y - 28}
                            width="56"
                            height="56"
                            fill="#FFFFFF"
                            stroke="#1473e6"
                            strokeWidth="12"
                          />
                        ))}
                      </motion.g>
                    )}

                  </motion.svg>
                )}


                {/* 🐶 100% EXACT DOG SVG ARTWORK - STEP-BY-STEP DRAWING */}
                {selectedArtworkId === 'dog' && (
                  <motion.svg
                    key={`dog-svg-${animKey}`}
                    viewBox="0 0 2000 2000"
                    className="w-full h-full drop-shadow-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    
                    {/* STEP 1: VECTOR PEN TOOL STROKE OUTLINE DRAWING (0s -> 1.8s) */}
                    <motion.path
                      fill="none"
                      stroke="#3D2C22"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M534.84,735.53c-1.36-30.73-1.47-62.48-0.23-93.09c0.91-20.64,2.38-42.29,6.24-62.59 c3.17-16.55,8.84-38.21,24.6-47.05c33.56-18.48,103.63,12.02,135.61,26.19c22,9.75,43.88,20.52,65.2,31.97 c74.04-27.33,155.34-38.78,233.8-38.78c78.35,0,159.65,11.45,233.69,38.78c21.32-11.45,43.2-22.22,65.2-31.97 c31.97-14.17,102.05-44.67,135.61-26.19c15.76,8.84,21.43,30.5,24.6,47.05c3.86,20.3,5.33,41.95,6.24,62.59 c1.25,30.61,1.13,62.36-0.23,93.09c73.7,202.62,128.58,479.85-68.37,632.69c-109.53,84.93-262.03,104.77-396.73,104.77 c-134.82,0-287.32-19.84-396.73-104.77C406.26,1215.37,461.14,938.15,534.84,735.53L534.84,735.53z"
                      initial={{ pathLength: 0, opacity: 0.9 }}
                      animate={{ pathLength: 1, opacity: [0.9, 1, 0.3] }}
                      transition={{ duration: 1.8, ease: "easeInOut" }}
                    />

                    {/* STEP 2: HEAD BASE FILL (#3D2C22) - Fades & expands in (1.5s) */}
                    <motion.path
                      fill="#3D2C22"
                      d="M534.84,735.53c-1.36-30.73-1.47-62.48-0.23-93.09c0.91-20.64,2.38-42.29,6.24-62.59 c3.17-16.55,8.84-38.21,24.6-47.05c33.56-18.48,103.63,12.02,135.61,26.19c22,9.75,43.88,20.52,65.2,31.97 c74.04-27.33,155.34-38.78,233.8-38.78c78.35,0,159.65,11.45,233.69,38.78c21.32-11.45,43.2-22.22,65.2-31.97 c31.97-14.17,102.05-44.67,135.61-26.19c15.76,8.84,21.43,30.5,24.6,47.05c3.86,20.3,5.33,41.95,6.24,62.59 c1.25,30.61,1.13,62.36-0.23,93.09c73.7,202.62,128.58,479.85-68.37,632.69c-109.53,84.93-262.03,104.77-396.73,104.77 c-134.82,0-287.32-19.84-396.73-104.77C406.26,1215.37,461.14,938.15,534.84,735.53L534.84,735.53z"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
                    />

                    {/* STEP 2: WHITE FACE MASK (#FEFEFE) - Fills in (1.9s) */}
                    <motion.path
                      fill="#FEFEFE"
                      d="M1000.06,1453.14c-181.19,0-695.96-30.16-445.15-714.55c0,0-8.39-172.46,20.3-188.33 c30.84-17.12,134.02,32.31,189.58,62.48c48.87-18.94,128.24-40.71,235.27-40.71c106.92,0,186.29,21.77,235.16,40.71 c55.56-30.16,158.74-79.6,189.69-62.48c28.57,15.87,20.18,188.33,20.18,188.33C1696.01,1422.98,1181.13,1453.14,1000.06,1453.14 L1000.06,1453.14z"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.9, duration: 0.5, ease: "easeOut" }}
                    />

                    {/* STEP 2: EAR GREY ACCENT (#96989A) */}
                    <motion.path
                      fill="#96989A"
                      d="M1510.52,1010.71c26.08,317.03-190.03,407.39-363.63,432.79C1104.48,1260.96,1221.38,1034.75,1510.52,1010.71 L1510.52,1010.71z"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.1, duration: 0.4 }}
                    />

                    {/* STEP 2: ORANGE EYE PATCH (#F58634) - Fades in (2.3s) */}
                    <motion.path
                      fill="#F58634"
                      d="M493,978.17c8.84-69.28,28.57-148.65,61.91-239.58c0,0-8.39-172.46,20.3-188.33 c30.84-17.12,134.02,32.31,189.58,62.48c31.86-12.36,76.65-25.85,133.68-33.79C1002.78,967.63,704.57,1125.23,493,978.17L493,978.17 z"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.3, duration: 0.45, ease: "easeOut" }}
                    />

                    {/* STEP 2: INNER EARS (#FDD1A1) */}
                    <motion.path
                      fill="#FDD1A1"
                      d="M586.77,713.19c0,0-3.74-109.64,5.44-126.65s117.13,51.14,117.13,51.14s-20.3,26.53-48.19,26.08 c-27.78-0.34-43.65-16.55-43.65-16.55s14.17,26.53,26.65,31.97c0,0-28.69-2.72-36.4-11.79c0,0,5.22,15.99,13.49,24.72 C621.24,692.1,614.21,704.12,586.77,713.19L586.77,713.19z M1413.23,713.19c0,0,3.74-109.64-5.44-126.65 c-9.07-17.01-117.13,51.14-117.13,51.14s20.3,26.53,48.19,26.08c27.78-0.34,43.65-16.55,43.65-16.55s-14.17,26.53-26.65,31.97 c0,0,28.69-2.72,36.4-11.79c0,0-5.22,15.99-13.49,24.72C1378.76,692.1,1385.79,704.12,1413.23,713.19L1413.23,713.19z"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.5, duration: 0.4 }}
                    />

                    {/* STEP 3: SNOUT MUZZLE (#E6E7E8) - Fills in (2.7s) */}
                    <motion.path
                      fill="#E6E7E8"
                      d="M1000.06,1432.62c-623.51,0-378.14-469.41,0-469.41C1378.08,963.21,1623.45,1432.62,1000.06,1432.62 L1000.06,1432.62z"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 2.7, duration: 0.45, ease: "easeOut" }}
                      style={{ originX: "50%", originY: "50%" }}
                    />

                    {/* STEP 3: EYES & EYELIDS (#3D2C22 & #63412D) - Pops in (3.0s) */}
                    <motion.g
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 3.0, duration: 0.4, type: "spring", stiffness: 280, damping: 16 }}
                      style={{ originX: "50%", originY: "50%" }}
                    >
                      <path
                        fill="#3D2C22"
                        d="M791.54,820.68c25.06,0,45.47,30.27,45.47,67.46c0,37.3-20.41,67.58-45.47,67.58 c-19.28,0-35.72-17.91-42.29-43.09l42.29-24.49l-44.67-11.91C750.61,844.6,769.2,820.68,791.54,820.68L791.54,820.68z M1217.87,820.68c25.06,0,45.35,30.27,45.35,67.46c0,37.3-20.3,67.58-45.35,67.58c-19.28,0-35.83-17.91-42.41-43.09l42.41-24.49 l-44.67-11.91C1176.94,844.6,1195.53,820.68,1217.87,820.68L1217.87,820.68z"
                      />
                      <path
                        fill="#63412D"
                        d="M791.54,830.89c-8.62,0-15.53,4.54-20.75,11.11c1.13-0.11,2.27-0.11,3.4-0.11c25.06,0,45.35,30.16,45.35,67.46 c0,5.1-0.34,10.09-1.13,14.97c5.78-11.91,8.28-26.31,8.28-36.17C826.69,868.64,816.71,830.89,791.54,830.89L791.54,830.89z M1217.87,830.89c-8.62,0-15.53,4.54-20.75,11.11c1.02-0.11,2.15-0.11,3.4-0.11c25.06,0,45.35,30.16,45.35,67.46 c0,5.1-0.34,10.09-1.13,14.97c5.78-11.91,8.28-26.31,8.28-36.17C1253.02,868.64,1242.93,830.89,1217.87,830.89L1217.87,830.89z"
                      />
                    </motion.g>

                    {/* STEP 3: NOSE & MOUTH (#3D2C22 & #FEFEFE) - Fades in (3.2s) */}
                    <motion.g
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 3.2, duration: 0.4, ease: "easeOut" }}
                      style={{ originX: "50%", originY: "50%" }}
                    >
                      <path
                        fill="#3D2C22"
                        d="M906.85,984.07c0,27.78,42.75,70.3,84.25,75.85v82.66c-13.04,12.02-72.34,62.25-111.34,17.12 c-3.17-3.74-8.73-4.2-12.47-0.91c-3.63,3.17-4.08,8.73-0.91,12.36c47.39,54.77,113.27,4.99,133.68-12.81 c20.3,17.8,86.29,67.58,133.57,12.81c3.17-3.63,2.72-9.18-0.91-12.36c-3.74-3.29-9.3-2.83-12.47,0.91 c-39,45.13-98.31-5.1-111.34-17.12v-82.66c41.5-5.56,84.25-48.08,84.25-75.85C1093.15,938.71,906.85,938.71,906.85,984.07 L906.85,984.07z"
                      />
                      <path
                        fill="#FEFEFE"
                        d="M1001.19,963.21c-19.84,0.45-104.65,1.59-72.34,40.48C928.85,1003.68,931.34,976.02,1001.19,963.21 L1001.19,963.21z"
                      />
                    </motion.g>

                    {/* STEP 3: WHISKERS & FRECKLES - Slide & Pop in (3.5s) */}
                    <motion.g
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 3.5, duration: 0.4 }}
                    >
                      <path
                        fill="#3D2C22"
                        d="M553.32,994.39c-3.29-0.68-5.56-3.86-4.88-7.14c0.57-3.29,3.74-5.56,7.03-4.88l272.58,50.46 c3.29,0.68,5.56,3.86,4.88,7.14c-0.57,3.29-3.74,5.56-7.03,4.88L553.32,994.39z M555.47,1166.73c-3.29,0.57-6.46-1.59-7.03-4.88 c-0.68-3.4,1.59-6.58,4.88-7.14l272.58-50.57c3.29-0.57,6.46,1.59,7.03,4.88c0.68,3.4-1.59,6.58-4.88,7.14L555.47,1166.73z M827.03,1068.43c3.29,0,6.12,2.72,6.12,6.12c0,3.4-2.83,6.12-6.12,6.12H523.84c-3.4,0-6.12-2.72-6.12-6.12 c0-3.4,2.72-6.12,6.12-6.12H827.03z M1444.53,982.37c3.29-0.68,6.46,1.59,7.03,4.88c0.68,3.29-1.59,6.46-4.88,7.14l-272.58,50.46 c-3.29,0.68-6.46-1.59-7.03-4.88c-0.68-3.29,1.59-6.46,4.88-7.14L1444.53,982.37z M1446.68,1154.71c3.29,0.57,5.56,3.74,4.88,7.14 c-0.57,3.29-3.74,5.44-7.03,4.88l-272.58-50.57c-3.29-0.57-5.56-3.74-4.88-7.14c0.57-3.29,3.74-5.44,7.03-4.88L1446.68,1154.71z M1173.08,1080.67c-3.4,0-6.12-2.72-6.12-6.12c0-3.4,2.72-6.12,6.12-6.12h303.08c3.4,0,6.24,2.72,6.24,6.12 c0,3.4-2.83,6.12-6.24,6.12H1173.08z"
                      />
                      <path
                        fill="#3D2C22"
                        d="M949.15,1112.19c5.33,0,9.75,4.31,9.75,9.75c0,5.33-4.42,9.64-9.75,9.64c-5.33,0-9.75-4.31-9.75-9.64 C939.39,1116.5,943.82,1112.19,949.15,1112.19L949.15,1112.19z M1050.85,1112.19c-5.33,0-9.75,4.31-9.75,9.75 c0,5.33,4.42,9.64,9.75,9.64s9.75-4.31,9.75-9.64C1060.6,1116.5,1056.18,1112.19,1050.85,1112.19L1050.85,1112.19z M1095.3,1117.86 c-5.33,0-9.64,4.42-9.64,9.75c0,5.44,4.31,9.75,9.64,9.75c5.44,0,9.75-4.31,9.75-9.75 C1105.05,1122.29,1100.74,1117.86,1095.3,1117.86L1095.3,1117.86z M1078.41,1077.27c-5.33,0-9.75,4.31-9.75,9.75 c0,5.33,4.42,9.75,9.75,9.75c5.33,0,9.75-4.42,9.75-9.75C1088.16,1081.58,1083.73,1077.27,1078.41,1077.27L1078.41,1077.27z M904.7,1117.86c5.33,0,9.75,4.42,9.75,9.75c0,5.44-4.42,9.75-9.75,9.75c-5.44,0-9.75-4.31-9.75-9.75 C894.95,1122.29,899.26,1117.86,904.7,1117.86L904.7,1117.86z M921.59,1077.27c5.33,0,9.75,4.31,9.75,9.75 c0,5.33-4.42,9.75-9.75,9.75c-5.33,0-9.75-4.42-9.75-9.75C911.84,1081.58,916.26,1077.27,921.59,1077.27L921.59,1077.27z"
                      />
                    </motion.g>

                    {/* ANIMATED PEN TOOL CURSOR (Moves while drawing path) */}
                    <motion.g
                      initial={{ opacity: 1, x: 1000, y: 1475 }}
                      animate={{
                        opacity: [1, 1, 1, 0],
                        x: [1000, 605, 525, 565, 1000, 1435, 1475, 1000],
                        y: [1475, 1260, 735, 532, 570, 532, 735, 1475]
                      }}
                      transition={{ duration: 1.8, ease: "easeInOut", times: [0, 0.15, 0.3, 0.5, 0.65, 0.8, 0.92, 1] }}
                    >
                      <circle r="20" fill="#FF9A00" fillOpacity="0.35" stroke="#FF9A00" strokeWidth="4" />
                      <line x1="-30" y1="0" x2="30" y2="0" stroke="#FF9A00" strokeWidth="6" />
                      <line x1="0" y1="-30" x2="0" y2="30" stroke="#FF9A00" strokeWidth="6" />
                    </motion.g>

                    {/* Direct Selection Vector Anchor Nodes overlay (Appears when completed) */}
                    {showVectorNodes && (
                      <motion.g
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: drawStage === 'complete' ? 1 : 0.4, scale: 1 }}
                        transition={{ delay: 1.8, duration: 0.4 }}
                      >
                        {[
                          { x: 565, y: 532 },
                          { x: 765, y: 608 },
                          { x: 1000, y: 570 },
                          { x: 1235, y: 608 },
                          { x: 1435, y: 532 },
                          { x: 1475, y: 735 },
                          { x: 1395, y: 1260 },
                          { x: 1000, y: 1475 },
                          { x: 605, y: 1260 },
                          { x: 525, y: 735 }
                        ].map((pt, i) => (
                          <rect
                            key={`dog-node-${i}`}
                            x={pt.x - 14}
                            y={pt.y - 14}
                            width="28"
                            height="28"
                            fill="#FFFFFF"
                            stroke="#FF9A00"
                            strokeWidth="6"
                          />
                        ))}
                      </motion.g>
                    )}

                  </motion.svg>
                )}

              </AnimatePresence>

              {/* Vector Direct Selection / Draw Active Cursor Indicator */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111]/90 border border-[#333] text-[9px] font-mono text-[#aaa]">
                <MousePointer className="w-2.5 h-2.5 text-[#FF9A00]" />
                <span>{drawStage === 'complete' ? '100% Vector Complete' : 'Drawing in Progress...'}</span>
              </div>

            </div>

          </div>


          {/* Right: Illustrator Layers Panel */}
          <div className="hidden md:flex md:w-48 lg:w-52 shrink-0 bg-[#252525] border-l border-[#383838] flex-col justify-between">
            
            <div>
              {/* Panel Tabs Header */}
              <div className="bg-[#202020] border-b border-[#383838] px-3 py-1 flex items-center gap-3 text-[11px]">
                <span className="text-white font-medium border-b-2 border-[#FF9A00] pb-0.5">
                  Layers
                </span>
                <span className="text-[#777]">Artboards</span>
                <span className="text-[#777]">Appearance</span>
              </div>

              {/* Blend Mode & Opacity */}
              <div className="p-2 border-b border-[#333] flex items-center justify-between text-[11px] text-[#aaa]">
                <div className="flex items-center gap-1 bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3e3e3e]">
                  <span>Normal</span>
                  <ChevronDown className="w-3 h-3 text-[#777]" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#777]">Opacity:</span>
                  <span className="text-white font-mono">100%</span>
                </div>
              </div>

              {/* Layers List */}
              <div className="p-1 space-y-1">
                
                {/* Active Vector Shape Layer */}
                <div className="p-1.5 rounded bg-[#FF9A00] text-black font-semibold flex items-center justify-between text-[11px] transition-all">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-black" />
                    <div 
                      className="w-5 h-5 rounded-[2px] border border-black/30 flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: activeArtwork.swatchColor }}
                    >
                      <span>{activeArtwork.id === 'cat' ? '🐱' : '🐶'}</span>
                    </div>
                    <span className="font-medium truncate max-w-[95px] text-black">
                      {activeArtwork.layerName}
                    </span>
                  </div>
                  <span className="text-[9px] bg-black/20 text-black px-1 rounded font-mono">Vector</span>
                </div>

                {/* Sub Layer: Artwork details */}
                <div className="p-1.5 rounded bg-transparent hover:bg-[#2c2c2c] text-[#aaa] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-[#aaa]" />
                    <div className="w-5 h-5 rounded-[2px] bg-[#1a1a20] border border-[#3e3e3e] flex items-center justify-center text-[9px] text-[#C3EA39]">
                      ✦
                    </div>
                    <span className="truncate max-w-[95px]">Facial_Details</span>
                  </div>
                  <span className="text-[9px] text-[#666]">Vector</span>
                </div>

                {/* Background Layer */}
                <div className="p-1.5 rounded bg-transparent text-[#888] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-[#888]" />
                    <div className="w-5 h-5 rounded-[2px] bg-[#121216] border border-[#3e3e3e]" />
                    <span className="truncate max-w-[95px]">Artboard_BG</span>
                  </div>
                  <Lock className="w-3 h-3 text-[#666]" />
                </div>

              </div>
            </div>

            {/* Bottom Panel Actions */}
            <div className="bg-[#202020] border-t border-[#383838] p-1.5 px-3 flex items-center justify-between text-[10px] text-[#777]">
              <span className="text-[#aaa]">{activeArtwork.dimensions}</span>
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full border border-black"
                  style={{ backgroundColor: activeArtwork.fgColor }}
                />
                <span className="text-[#ccc]">100% SVG Vector</span>
              </div>
            </div>

          </div>

        </div>


        {/* 5. BOTTOM STATUS BAR */}
        <div className="bg-[#1f1f1f] border-t border-[#383838] px-3 py-1 flex items-center justify-between text-[10px] text-[#888] font-mono">
          <div className="flex items-center gap-3">
            <span>Doc: 3.8M / 8.2M</span>
            <span className="hidden sm:inline">
              {drawStage === 'complete' ? '✨ Vector Mascot Finished' : '✒️ Drawing vector strokes...'}
            </span>
          </div>
          <div className="text-[#aaa] flex items-center gap-2">
            <span>100%</span>
          </div>
        </div>

      </motion.div>

    </div>
  );
}

