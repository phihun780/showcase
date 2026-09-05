import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, Crop, Sparkles, Loader2, Maximize2, Eye, EyeOff, Image as ImageIcon, Sliders } from 'lucide-react';
import { uploadToR2 } from '../../utils/r2Storage';

const FILTER_PRESETS = [
  { id: 'none', label: 'Màu gốc', icon: '🎨', filterString: 'none' },
  { id: 'bw_contrast', label: 'Trắng Đen (Tương phản cao ⭐)', icon: '🖤', filterString: 'grayscale(100%) contrast(125%)' },
  { id: 'bw_classic', label: 'Trắng Đen (Chuẩn)', icon: '⚪', filterString: 'grayscale(100%) contrast(110%)' },
  { id: 'bw_soft', label: 'Trắng Đen (Film dịu)', icon: '🎞️', filterString: 'grayscale(100%) contrast(100%) brightness(105%)' },
  { id: 'vintage', label: 'Tone Ấm Vintage', icon: '☕', filterString: 'sepia(30%) contrast(105%) brightness(102%)' },
];

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose,
  mode = 'project', // 'banner' | 'project' | 'portrait' | 'avatar' | 'random'
  initialAspectRatio = null,
  projectTitle = 'Tên Dự Án',
  projectSubtitle = 'Mô tả ngắn dự án'
}) {
  const isBannerMode = mode === 'banner';
  const isRandomMode = mode === 'random';
  const isPortraitMode = mode === 'portrait' || mode === 'avatar';

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

  // 1. All State Hooks (Unconditionally at top)
  const [aspectRatio, setAspectRatio] = useState(defaultRatio);
  const [aspectName, setAspectName] = useState(defaultRatioName);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageObj, setImageObj] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showLiveMockup, setShowLiveMockup] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('none');

  // 2. All Ref Hooks (Unconditionally at top)
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 });

  const BASE_WIDTH = 720;

  // 3. Reset / initialize on open
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

  // 4. Load Image Object safely
  useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImageObj(null);
      return;
    }
    let isMounted = true;
    const img = new Image();

    const isDataOrBlob = imageSrc.startsWith('data:') || imageSrc.startsWith('blob:');
    if (!isDataOrBlob && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (!isMounted) return;
      setImageObj(img);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };

    img.onerror = () => {
      if (!isMounted) return;
      if (img.crossOrigin) {
        const fallback = new Image();
        fallback.onload = () => {
          if (!isMounted) return;
          setImageObj(fallback);
          setScale(1);
          setOffset({ x: 0, y: 0 });
        };
        fallback.onerror = (e) => {
          console.warn("Failed to load fallback image in ImageCropModal:", e);
        };
        fallback.src = imageSrc;
      } else {
        console.warn("Failed to load image in ImageCropModal:", imageSrc);
      }
    };

    img.src = imageSrc;

    return () => {
      isMounted = false;
    };
  }, [imageSrc, isOpen]);

  // 5. Safe Canvas Drawing Callback
  const drawCanvases = useCallback(() => {
    if (!imageObj) return;
    if (!imageObj.complete || !imageObj.naturalWidth || imageObj.naturalWidth <= 0) return;

    try {
      const baseHeight = Math.max(1, Math.round(BASE_WIDTH / (aspectRatio || (16 / 10))));
      const imgW = imageObj.naturalWidth || imageObj.width || BASE_WIDTH;
      const imgH = imageObj.naturalHeight || imageObj.height || baseHeight;
      const imgRatio = (imgW > 0 && imgH > 0) ? (imgW / imgH) : (aspectRatio || 1);
      const targetRatio = BASE_WIDTH / baseHeight;

      let renderW, renderH;
      if (imgRatio > targetRatio) {
        renderH = baseHeight;
        renderW = baseHeight * imgRatio;
      } else {
        renderW = BASE_WIDTH;
        renderH = BASE_WIDTH / imgRatio;
      }

      const currentScale = scale || 1;
      renderW *= currentScale;
      renderH *= currentScale;

      const currentOffsetX = offset?.x || 0;
      const currentOffsetY = offset?.y || 0;
      const renderX = (BASE_WIDTH - renderW) / 2 + currentOffsetX;
      const renderY = (baseHeight - renderH) / 2 + currentOffsetY;

      const activeFilter = FILTER_PRESETS.find(f => f.id === selectedFilter)?.filterString || 'none';

      // 1. Draw Main Interactive Canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = BASE_WIDTH;
        canvas.height = baseHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, BASE_WIDTH, baseHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.filter = activeFilter;
          ctx.drawImage(imageObj, renderX, renderY, renderW, renderH);
          ctx.filter = 'none';
        }
      }

      // 2. Draw Live Preview Mirror Canvas
      if (previewCanvasRef.current) {
        const pCanvas = previewCanvasRef.current;
        pCanvas.width = BASE_WIDTH;
        pCanvas.height = baseHeight;
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, BASE_WIDTH, baseHeight);
          pCtx.imageSmoothingEnabled = true;
          pCtx.imageSmoothingQuality = 'high';
          pCtx.filter = activeFilter;
          pCtx.drawImage(imageObj, renderX, renderY, renderW, renderH);
          pCtx.filter = 'none';
        }
      }
    } catch (err) {
      console.warn('Canvas render error in ImageCropModal:', err);
    }
  }, [imageObj, scale, offset, aspectRatio, selectedFilter]);

  // 6. Draw whenever state changes
  useEffect(() => {
    if (isOpen && imageObj) {
      drawCanvases();
    }
  }, [drawCanvases, isOpen, imageObj]);

  // 7. Lock body scroll while Crop Modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // 8. Isolated Non-Passive Wheel Zooming
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleNonPassiveWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      setScale((s) => {
        const next = Math.max(0.4, Math.min(3.5, s + zoomFactor));
        return Number(next.toFixed(2));
      });
    };

    container.addEventListener('wheel', handleNonPassiveWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNonPassiveWheel);
    };
  }, [isOpen]);

  // 9. Interaction Handlers
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
    const scaleRatio = BASE_WIDTH / (containerRect.width || BASE_WIDTH);

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
    const scaleRatio = BASE_WIDTH / (containerRect.width || BASE_WIDTH);

    const deltaX = (e.touches[0].clientX - dragStartRef.current.clientX) * scaleRatio;
    const deltaY = (e.touches[0].clientY - dragStartRef.current.clientY) * scaleRatio;

    setOffset({
      x: dragStartRef.current.offsetX + deltaX,
      y: dragStartRef.current.offsetY + deltaY,
    });
  };

  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // High-Resolution WebP Exporter
  const handleConfirmCrop = async () => {
    if (!imageObj) {
      if (imageSrc) onCropComplete(imageSrc);
      onClose();
      return;
    }
    setIsSaving(true);

    try {
      const exportW = 1920;
      const exportH = Math.max(1, Math.round(exportW / (aspectRatio || (16 / 10))));

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportW;
      exportCanvas.height = exportH;
      const ctx = exportCanvas.getContext('2d');

      const imgW = imageObj.naturalWidth || imageObj.width || exportW;
      const imgH = imageObj.naturalHeight || imageObj.height || exportH;
      const imgRatio = (imgW > 0 && imgH > 0) ? (imgW / imgH) : (exportW / exportH);
      const targetRatio = exportW / exportH;

      let renderW, renderH;
      if (imgRatio > targetRatio) {
        renderH = exportH;
        renderW = exportH * imgRatio;
      } else {
        renderW = exportW;
        renderH = exportW / imgRatio;
      }

      const currentScale = scale || 1;
      renderW *= currentScale;
      renderH *= currentScale;

      const ratioScale = exportW / BASE_WIDTH;
      const currentOffsetX = offset?.x || 0;
      const currentOffsetY = offset?.y || 0;
      const renderX = (exportW - renderW) / 2 + currentOffsetX * ratioScale;
      const renderY = (exportH - renderH) / 2 + currentOffsetY * ratioScale;

      const activeFilter = FILTER_PRESETS.find(f => f.id === selectedFilter)?.filterString || 'none';
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.filter = activeFilter;
        ctx.drawImage(imageObj, renderX, renderY, renderW, renderH);
        ctx.filter = 'none';
      }

      let dataUrl;
      try {
        dataUrl = exportCanvas.toDataURL('image/webp', 0.92);
        if (!dataUrl || dataUrl === 'data:,' || !dataUrl.startsWith('data:image/')) {
          dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (err) {
        dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      }

      const prefix = isBannerMode
        ? 'cover_banners/banner'
        : isRandomMode
        ? 'random/artwork'
        : isPortraitMode
        ? 'profile/avatar'
        : 'projects/cover';
      const key = `${prefix}_${Date.now()}.webp`;

      exportCanvas.toBlob(
        async (blob) => {
          if (blob) {
            try {
              const res = await uploadToR2(blob, key, 'image/webp');
              if (res && res.url) {
                onCropComplete(res.url);
                setIsSaving(false);
                onClose();
                return;
              }
            } catch (err) {
              console.warn('R2 upload fallback to dataUrl:', err);
            }
          }
          onCropComplete(dataUrl || imageSrc);
          setIsSaving(false);
          onClose();
        },
        'image/webp',
        0.92
      );
    } catch (err) {
      console.error('Crop export error:', err);
      setIsSaving(false);
      if (imageSrc) onCropComplete(imageSrc);
      onClose();
    }
  };

  // 10. UNCONDITIONAL RETURN CHECK (Guaranteed AFTER all hooks)
  if (!isOpen || !imageSrc) return null;

  // Presets configuration
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#121216] border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-3.5 sm:p-5 flex flex-col max-h-[92vh] text-white overflow-hidden animate-fadeIn">
        {/* Sticky Header */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39] shrink-0">
              <Crop className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2 truncate">
                <span>{modalTitle}</span>
              </h3>
              <p className="text-[11px] text-white/50 font-mono truncate hidden sm:block">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 py-2 text-xs">
          
          {/* Top Bar 1: Aspect Presets & Live Overlay Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-black/40 p-2 sm:p-2.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
              <div className="flex items-center gap-1 text-xs font-mono text-white/60 mr-1 shrink-0">
                <Maximize2 className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span className="hidden sm:inline">Tỷ lệ:</span>
              </div>

              {presets.map((ratio) => (
                <button
                  key={ratio.name}
                  type="button"
                  onClick={() => {
                    setAspectRatio(ratio.value);
                    setAspectName(ratio.name);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
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
              className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                showLiveMockup
                  ? 'bg-white/15 text-[#C3EA39] border border-[#C3EA39]/30'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {showLiveMockup ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showLiveMockup ? 'Hiện mockup chữ' : 'Ẩn mockup chữ'}</span>
            </button>
          </div>

          {/* Top Bar 2: B&W & Color Filters */}
          <div className="flex items-center justify-between gap-2 bg-black/40 p-2 sm:p-2.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
              <div className="flex items-center gap-1 text-xs font-mono text-white/60 mr-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#C3EA39]" />
                <span className="hidden sm:inline">Bộ lọc:</span>
              </div>

              {FILTER_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedFilter === f.id
                      ? 'bg-[#C3EA39] text-black shadow-md shadow-[#C3EA39]/15'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            {selectedFilter !== 'none' && (
              <button
                type="button"
                onClick={() => setSelectedFilter('none')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                Về màu gốc
              </button>
            )}
          </div>

          {/* Main Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-center">
            {/* Left / Center: Interactive Draggable Crop Canvas */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center w-full">
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                style={{
                  aspectRatio: `${aspectRatio}`,
                  maxHeight: 'min(45vh, 380px)',
                  maxWidth: '100%',
                }}
                className="relative mx-auto rounded-2xl overflow-hidden bg-black border-2 border-[#C3EA39] shadow-2xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center group touch-none"
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
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none transition-opacity" />
                    
                    {/* Top Left Slide Tag Mockup for Banner */}
                    {isBannerMode && (
                      <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] sm:text-[11px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1.5 pointer-events-none">
                        <ImageIcon className="w-3 h-3" />
                        <span>Cover #01</span>
                      </div>
                    )}

                    {/* Bottom Info Overlay */}
                    <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3 sm:left-4 sm:right-4 z-10 space-y-0.5 pointer-events-none">
                      <span className="text-[8px] sm:text-[9px] font-mono text-[#C3EA39] uppercase tracking-wider block">
                        Preview Trực Tiếp
                      </span>
                      <h3 className="text-xs sm:text-base font-bold uppercase text-white tracking-tight leading-tight drop-shadow-md truncate">
                        {projectTitle || (isBannerMode ? 'Slide Banner' : isPortraitMode ? 'Ảnh Chân Dung' : 'Tên Dự Án')}
                      </h3>
                      {projectSubtitle && (
                        <p className="text-[10px] text-white/80 font-light drop-shadow line-clamp-1">
                          {projectSubtitle}
                        </p>
                      )}
                    </div>

                    {/* Bottom Dots Mockup for Banner */}
                    {isBannerMode && (
                      <div className="absolute bottom-2 sm:bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 border border-white/10 pointer-events-none">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C3EA39]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      </div>
                    )}
                  </>
                )}

                {/* Interaction Guide Badge */}
                <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-black/80 backdrop-blur-md text-[9px] sm:text-[10px] font-mono text-[#C3EA39] border border-white/15 pointer-events-none">
                  ✦ Kéo để dời • Zoom
                </div>
              </div>

              {/* Zoom Controls & Slider */}
              <div className="w-full max-w-[500px] mt-2 sm:mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="0.4"
                    max="3"
                    step="0.02"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="flex-1 accent-[#C3EA39] cursor-pointer h-2"
                  />

                  <button
                    type="button"
                    onClick={() => setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))))}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs font-mono font-bold text-[#C3EA39] w-10 text-right">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-mono text-white/70 flex items-center gap-1 transition-colors cursor-pointer min-h-[32px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Căn giữa</span>
                </button>
              </div>
            </div>

            {/* Right: Real-time Synchronized Mirror Card */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-stretch space-y-2 w-full">
              <div className="flex items-center justify-between w-full">
                <label className="text-xs font-mono text-white/60 uppercase block">
                  {isBannerMode
                    ? 'Khung Banner (21:9):'
                    : isRandomMode
                    ? 'Khung Artwork (1:1):'
                    : isPortraitMode
                    ? 'Khung Chân Dung (3:4):'
                    : 'Khung Dự Án (16:10):'}
                </label>
                <span className="text-[10px] font-mono text-[#C3EA39]">Tỉ lệ: {aspectName}</span>
              </div>

              <div
                style={{
                  aspectRatio: `${aspectRatio}`,
                  maxHeight: 'min(34vh, 260px)',
                  maxWidth: '100%',
                }}
                className="relative mx-auto w-full max-w-[240px] rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-xl flex flex-col justify-end p-3 sm:p-3.5 group"
              >
                {/* Synchronized Real-time Canvas */}
                <canvas
                  ref={previewCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />

                {/* Gradient Vignette at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Top Left Tag Mockup */}
                {isBannerMode && (
                  <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[9px] sm:text-[10px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1 pointer-events-none">
                    <ImageIcon className="w-2.5 h-2.5" />
                    <span>Cover #01</span>
                  </div>
                )}

                {isRandomMode && (
                  <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[9px] sm:text-[10px] font-mono font-bold text-[#C3EA39] border border-white/10 flex items-center gap-1 pointer-events-none">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Artwork #01</span>
                  </div>
                )}

                {/* Title & Subtitle Mockup */}
                <div className="relative z-10 space-y-0.5 pointer-events-none">
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-white tracking-tight truncate">
                    {projectTitle || (isBannerMode ? 'Slide Banner' : isRandomMode ? 'Artwork' : 'Tên Dự Án')}
                  </h4>
                  {projectSubtitle && (
                    <p className="text-[10px] text-white/70 font-light truncate">
                      {projectSubtitle}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-white/40 font-mono text-center pt-0.5">
                Xuất WebP: <span className="text-[#C3EA39]">1920 × {Math.round(1920 / aspectRatio)}px</span>
              </p>
            </div>
          </div>

        </div>

        {/* Sticky Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2.5 sm:pt-3 border-t border-white/10 shrink-0 bg-[#121216]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer min-h-[36px]"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-[#C3EA39]/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 min-h-[36px]"
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
      </div>
    </div>
  );
}
