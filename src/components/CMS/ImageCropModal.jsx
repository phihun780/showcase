import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, Crop, Sparkles, Loader2, Maximize2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { uploadToR2 } from '../../utils/r2Storage';

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose,
  mode = 'project', // 'banner' | 'project'
  initialAspectRatio = null,
  projectTitle = 'Tên Dự Án',
  projectSubtitle = 'Mô tả ngắn dự án'
}) {
  const isBannerMode = mode === 'banner';
  const isRandomMode = mode === 'random';
  const isPortraitMode = mode === 'portrait' || mode === 'avatar';
  const isProjectMode = !isBannerMode && !isRandomMode && !isPortraitMode;

  const defaultRatio = initialAspectRatio || (
    isBannerMode ? 21 / 9 :
    isRandomMode ? 1 :
    isPortraitMode ? 3 / 4 :
    16 / 10
  );

  const defaultRatioName = (
    isBannerMode ? '21:9' :
    isRandomMode ? '1:1' :
    isPortraitMode ? '3:4' :
    '16:10'
  );

  const [aspectRatio, setAspectRatio] = useState(defaultRatio);
  const [aspectName, setAspectName] = useState(defaultRatioName);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageObj, setImageObj] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLiveMockup, setShowLiveMockup] = useState(true);

  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 });

  const BASE_WIDTH = 720;

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      const ratio = initialAspectRatio || (
        mode === 'banner' ? 21 / 9 :
        mode === 'random' ? 1 :
        mode === 'portrait' || mode === 'avatar' ? 3 / 4 :
        16 / 10
      );
      const name = (
        ratio === 21 / 9 ? '21:9' :
        ratio === 1 ? '1:1' :
        ratio === 3 / 4 ? '3:4' :
        ratio === 16 / 10 ? '16:10' :
        ratio === 16 / 9 ? '16:9' :
        'Custom'
      );
      setAspectRatio(ratio);
      setAspectName(name);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, mode, initialAspectRatio]);

  // Load Image Object
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Core Render Function: draws both main interactive canvas and secondary preview canvas
  const drawCanvases = useCallback(() => {
    if (!imageObj) return;

    const baseHeight = Math.round(BASE_WIDTH / aspectRatio);

    // Calculate Cover Fit Dimensions
    const imgRatio = imageObj.width / imageObj.height;
    const targetRatio = BASE_WIDTH / baseHeight;

    let renderW, renderH;
    if (imgRatio > targetRatio) {
      renderH = baseHeight;
      renderW = baseHeight * imgRatio;
    } else {
      renderW = BASE_WIDTH;
      renderH = BASE_WIDTH / imgRatio;
    }

    renderW *= scale;
    renderH *= scale;

    const renderX = (BASE_WIDTH - renderW) / 2 + offset.x;
    const renderY = (baseHeight - renderH) / 2 + offset.y;

    // 1. Draw Main Interactive Canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = BASE_WIDTH;
      canvas.height = baseHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, BASE_WIDTH, baseHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageObj, renderX, renderY, renderW, renderH);
    }

    // 2. Draw Live Preview Mirror Canvas
    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      pCanvas.width = BASE_WIDTH;
      pCanvas.height = baseHeight;
      const pCtx = pCanvas.getContext('2d');
      pCtx.clearRect(0, 0, BASE_WIDTH, baseHeight);
      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = 'high';
      pCtx.drawImage(imageObj, renderX, renderY, renderW, renderH);
    }
  }, [imageObj, scale, offset, aspectRatio]);

  useEffect(() => {
    drawCanvases();
  }, [drawCanvases]);

  if (!isOpen || !imageSrc) return null;

  // 1:1 Hardware-Accurate Mouse Drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleRatio = BASE_WIDTH / containerRect.width;

    const deltaX = (e.clientX - dragStartRef.current.clientX) * scaleRatio;
    const deltaY = (e.clientY - dragStartRef.current.clientY) * scaleRatio;

    setOffset({
      x: dragStartRef.current.offsetX + deltaX,
      y: dragStartRef.current.offsetY + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 1:1 Hardware-Accurate Touch Drag
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1 || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleRatio = BASE_WIDTH / containerRect.width;

    const deltaX = (e.touches[0].clientX - dragStartRef.current.clientX) * scaleRatio;
    const deltaY = (e.touches[0].clientY - dragStartRef.current.clientY) * scaleRatio;

    setOffset({
      x: dragStartRef.current.offsetX + deltaX,
      y: dragStartRef.current.offsetY + deltaY,
    });
  };

  // Smooth Wheel Zooming
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((s) => {
      const next = Math.max(0.4, Math.min(3.5, s + zoomDelta));
      return Number(next.toFixed(2));
    });
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // High-Resolution WebP Exporter
  const handleConfirmCrop = async () => {
    if (!imageObj) return;
    setIsSaving(true);

    try {
      const exportW = 1920;
      const exportH = Math.round(exportW / aspectRatio);

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext('2d');

      const imgRatio = imageObj.width / imageObj.height;
      const targetRatio = exportW / exportH;

      let renderW, renderH;
      if (imgRatio > targetRatio) {
        renderH = exportH;
        renderW = exportH * imgRatio;
      } else {
        renderW = exportW;
        renderH = exportW / imgRatio;
      }

      renderW *= scale;
      renderH *= scale;

      const ratioScale = exportW / BASE_WIDTH;
      const renderX = (exportW - renderW) / 2 + offset.x * ratioScale;
      const renderY = (exportH - renderH) / 2 + offset.y * ratioScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageObj, renderX, renderY, renderW, renderH);

      exportCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsSaving(false);
            return;
          }

          const dataUrl = exportCanvas.toDataURL('image/webp', 0.92);
          const prefix = isBannerMode
            ? 'cover_banners/banner'
            : isRandomMode
            ? 'random/artwork'
            : isPortraitMode
            ? 'profile/avatar'
            : 'projects/cover';
          const key = `${prefix}_${Date.now()}.webp`;

          try {
            const res = await uploadToR2(blob, key, 'image/webp');
            onCropComplete(res.url);
          } catch (err) {
            console.warn('R2 upload fallback to dataUrl:', err);
            onCropComplete(dataUrl);
          }
          setIsSaving(false);
          onClose();
        },
        'image/webp',
        0.92
      );
    } catch (err) {
      console.error('Crop export error:', err);
      setIsSaving(false);
    }
  };

  // Aspect ratio presets list prioritized by mode
  const presets = isBannerMode
    ? [
        { label: '21:9 (Chuẩn Cover Banner ⭐)', value: 21 / 9, name: '21:9' },
        { label: '16:9 (Widescreen)', value: 16 / 9, name: '16:9' },
        { label: '16:10 (Dự án)', value: 16 / 10, name: '16:10' },
        { label: '1:1 (Vuông)', value: 1, name: '1:1' },
      ]
    : isRandomMode
    ? [
        { label: '1:1 (Chuẩn Vuông Tùm Lum Tà La ⭐)', value: 1, name: '1:1' },
        { label: '4:3 (Tiêu chuẩn)', value: 4 / 3, name: '4:3' },
        { label: '16:10 (Dự án)', value: 16 / 10, name: '16:10' },
        { label: '21:9 (Cover Banner)', value: 21 / 9, name: '21:9' },
      ]
    : isPortraitMode
    ? [
        { label: '3:4 (Chuẩn Chân Dung ⭐)', value: 3 / 4, name: '3:4' },
        { label: '4:5 (Portrait)', value: 4 / 5, name: '4:5' },
        { label: '1:1 (Vuông)', value: 1, name: '1:1' },
        { label: '16:10 (Ngang)', value: 16 / 10, name: '16:10' },
      ]
    : [
        { label: '16:10 (Chuẩn Dự Án Trang Chủ ⭐)', value: 16 / 10, name: '16:10' },
        { label: '16:9 (Widescreen)', value: 16 / 9, name: '16:9' },
        { label: '21:9 (Cover Banner)', value: 21 / 9, name: '21:9' },
        { label: '1:1 (Vuông)', value: 1, name: '1:1' },
      ];

  const modalTitle = isBannerMode
    ? 'Cắt & Căn Chỉnh Ảnh Slide Banner Cover (21:9)'
    : isRandomMode
    ? 'Cắt & Căn Chỉnh Artwork Tùm Lum Tà La (1:1)'
    : isPortraitMode
    ? 'Cắt & Căn Chỉnh Ảnh Chân Dung (3:4)'
    : 'Cắt & Căn Chỉnh Ảnh Bìa Dự Án (16:10)';

  const modalSubtitle = isBannerMode
    ? 'Tỉ lệ chuẩn 21:9 giống 100% khung banner ngoài trang chủ. Kéo thả & zoom để căn lề ảnh chuẩn nhất.'
    : isRandomMode
    ? 'Tỉ lệ vuông 1:1 chuẩn ngoài mục 01 Tùm lum tà la. Kéo thả & zoom để căn lề ảnh.'
    : isPortraitMode
    ? 'Tỉ lệ dọc 3:4 chuẩn cho ảnh đại diện mục Về tui. Kéo thả & zoom để căn lề.'
    : 'Tỉ lệ chuẩn 16:10 giống 100% khung dự án ngoài trang chủ. Kéo thả & zoom để căn lề ảnh.';

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-[#121216] border border-white/20 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5 text-white max-h-[94vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39]">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
                <span>{modalTitle}</span>
              </h3>
              <p className="text-xs text-white/50 font-mono">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Bar: Aspect Presets & Live Overlay Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-white/60 mr-1">
              <Maximize2 className="w-3.5 h-3.5 text-[#C3EA39]" />
              <span>Tỷ lệ khung:</span>
            </div>

            {presets.map((ratio) => (
              <button
                key={ratio.name}
                type="button"
                onClick={() => {
                  setAspectRatio(ratio.value);
                  setAspectName(ratio.name);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  aspectName === ratio.name
                    ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/15'
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>

          {/* Toggle Live Title Overlay */}
          <button
            type="button"
            onClick={() => setShowLiveMockup(!showLiveMockup)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              showLiveMockup
                ? 'bg-white/15 text-[#C3EA39] border border-[#C3EA39]/30'
                : 'bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {showLiveMockup ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showLiveMockup ? 'Đang hiện mockup chữ' : 'Ẩn mockup chữ'}</span>
          </button>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Left / Center: Interactive Draggable Crop Canvas */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
              style={{ aspectRatio: `${aspectRatio}` }}
              className="relative w-full max-w-[620px] rounded-2xl overflow-hidden bg-black border-2 border-[#C3EA39] shadow-2xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center group"
            >
              {/* Active High-Definition Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Grid 3x3 Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/10 opacity-30">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div />
              </div>

              {/* Live Mockup Overlay on Stage */}
              {showLiveMockup && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none transition-opacity" />
                  
                  {/* Top Left Slide Tag Mockup for Banner */}
                  {isBannerMode && (
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1.5 pointer-events-none">
                      <ImageIcon className="w-3 h-3" />
                      <span>Cover #01</span>
                    </div>
                  )}

                  {/* Bottom Info Overlay */}
                  <div className="absolute bottom-3.5 left-4 right-4 sm:bottom-4 sm:left-5 sm:right-5 z-10 space-y-0.5 pointer-events-none">
                    <span className="text-[9px] font-mono text-[#C3EA39] uppercase tracking-wider block">
                      Preview Trực Tiếp
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold uppercase text-white tracking-tight leading-tight drop-shadow-md truncate">
                      {projectTitle || (isBannerMode ? 'Slide Banner' : 'Tên Dự Án')}
                    </h3>
                    {projectSubtitle && (
                      <p className="text-xs text-white/80 font-light drop-shadow line-clamp-1">
                        {projectSubtitle}
                      </p>
                    )}
                  </div>

                  {/* Bottom Dots Mockup for Banner */}
                  {isBannerMode && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C3EA39]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    </div>
                  )}
                </>
              )}

              {/* Interaction Guide Badge */}
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-mono text-[#C3EA39] border border-white/15 pointer-events-none">
                ✦ Kéo để dời • Cuộn để Zoom
              </div>
            </div>

            {/* Zoom Controls & Slider */}
            <div className="w-full max-w-[620px] mt-3.5 p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="0.4"
                  max="3"
                  step="0.02"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="flex-1 accent-[#C3EA39] cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-[#C3EA39] w-12 text-right">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-mono text-white/70 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Căn giữa</span>
              </button>
            </div>
          </div>

          {/* Right: Real-time Synchronized Mirror Card */}
          <div className="lg:col-span-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-white/60 uppercase block">
                {isBannerMode
                  ? 'Khung Banner Trang Chủ (21:9):'
                  : isRandomMode
                  ? 'Khung Artwork Trang Chủ (1:1):'
                  : isPortraitMode
                  ? 'Khung Chân Dung Về Tui (3:4):'
                  : 'Khung Dự Án Trang Chủ (16:10):'}
              </label>
              <span className="text-[10px] font-mono text-[#C3EA39]">Tỉ lệ: {aspectName}</span>
            </div>

            <div
              style={{ aspectRatio: `${aspectRatio}` }}
              className="relative w-full rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-xl flex flex-col justify-end p-4 group"
            >
              {/* Synchronized Real-time Canvas */}
              <canvas
                ref={previewCanvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              {/* Top Left Tag Mockup */}
              {isBannerMode && (
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1 pointer-events-none">
                  <ImageIcon className="w-2.5 h-2.5" />
                  <span>Cover #01</span>
                </div>
              )}

              {isRandomMode && (
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1 pointer-events-none">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Artwork #01</span>
                </div>
              )}

              {/* Title & Subtitle Mockup */}
              <div className="relative z-10 space-y-0.5 pointer-events-none">
                <h4 className="text-sm sm:text-base font-bold uppercase text-white tracking-tight truncate">
                  {projectTitle || (isBannerMode ? 'Slide Banner' : isRandomMode ? 'Artwork' : 'Tên Dự Án')}
                </h4>
                {projectSubtitle && (
                  <p className="text-[11px] text-white/70 font-light truncate">
                    {projectSubtitle}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-white/40 font-mono text-center pt-1">
              Độ phân giải xuất: <span className="text-[#C3EA39]">1920 × {Math.round(1920 / aspectRatio)}px (WebP)</span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm tracking-wide flex items-center gap-2 transition-all shadow-md shadow-[#C3EA39]/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý & lưu R2...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Cắt & Áp Dụng Ảnh Bìa</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
