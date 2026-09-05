import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, Crop, Sparkles, Loader2, Maximize2 } from 'lucide-react';
import { uploadToR2 } from '../../utils/r2Storage';

const FILTER_PRESETS = [
  {
    id: 'none',
    label: 'Màu gốc (Full color)',
    filterString: 'none',
    bgClass: 'bg-gradient-to-tr from-[#FF5E7E] via-[#FFD166] to-[#06D6A0]',
  },
  {
    id: 'bw_contrast',
    label: 'Trắng đen tương phản cao',
    filterString: 'grayscale(100%) contrast(125%)',
    bgClass: 'bg-gradient-to-tr from-black via-zinc-800 to-white',
  },
  {
    id: 'bw_classic',
    label: 'Trắng đen chuẩn',
    filterString: 'grayscale(100%) contrast(110%)',
    bgClass: 'bg-gradient-to-tr from-zinc-900 via-zinc-500 to-zinc-200',
  },
  {
    id: 'bw_soft',
    label: 'Trắng đen Film dịu',
    filterString: 'grayscale(100%) contrast(100%) brightness(105%)',
    bgClass: 'bg-gradient-to-tr from-zinc-700 via-zinc-400 to-zinc-100',
  },
  {
    id: 'vintage',
    label: 'Tone ấm Vintage',
    filterString: 'sepia(30%) contrast(105%) brightness(102%)',
    bgClass: 'bg-gradient-to-tr from-[#4a2e18] via-[#a3683b] to-[#f4d19b]',
  },
];

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose,
  mode = 'project', // 'banner' | 'project' | 'portrait' | 'avatar' | 'random'
  initialAspectRatio = null,
  folderPrefix = null,
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

  // 1. State Hooks
  const [aspectRatio, setAspectRatio] = useState(defaultRatio);
  const [aspectName, setAspectName] = useState(defaultRatioName);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageObj, setImageObj] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');

  // 2. Ref Hooks
  const canvasRef = useRef(null);
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
        '1:1'
      );
      setAspectRatio(ratio);
      setAspectName(name);
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setSelectedFilter('none');
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
  const drawCanvas = useCallback(() => {
    if (!imageObj) return;
    if (!imageObj.complete || !imageObj.naturalWidth || imageObj.naturalWidth <= 0) return;

    try {
      const baseHeight = Math.max(1, Math.round(BASE_WIDTH / (aspectRatio || 1)));
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
    } catch (err) {
      console.warn('Canvas render error in ImageCropModal:', err);
    }
  }, [imageObj, scale, offset, aspectRatio, selectedFilter]);

  // 6. Draw whenever state changes
  useEffect(() => {
    if (isOpen && imageObj) {
      drawCanvas();
    }
  }, [drawCanvas, isOpen, imageObj]);

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

  // 9. Drag Handlers
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
      const exportH = Math.max(1, Math.round(exportW / (aspectRatio || 1)));

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
      } catch {
        dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      }

      let finalPrefix = folderPrefix;
      if (!finalPrefix) {
        finalPrefix = isBannerMode
          ? 'cover_banners'
          : isRandomMode
          ? 'random_works'
          : isPortraitMode
          ? 'profile'
          : 'projects';
      }
      const key = `${finalPrefix}/${Date.now()}_cropped.webp`;

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

  if (!isOpen || !imageSrc) return null;

  // Aspect Ratio Presets
  const presets = isRandomMode
    ? [
        { label: '1:1 (Vuông)', value: 1, name: '1:1' },
        { label: '4:3', value: 4 / 3, name: '4:3' },
        { label: '16:10', value: 16 / 10, name: '16:10' },
        { label: '21:9', value: 21 / 9, name: '21:9' },
      ]
    : isBannerMode
    ? [
        { label: '21:9 (Widescreen)', value: 21 / 9, name: '21:9' },
        { label: '16:9', value: 16 / 9, name: '16:9' },
        { label: '16:10', value: 16 / 10, name: '16:10' },
        { label: '1:1', value: 1, name: '1:1' },
      ]
    : isPortraitMode
    ? [
        { label: '3:4 (Chân dung)', value: 3 / 4, name: '3:4' },
        { label: '4:5', value: 4 / 5, name: '4:5' },
        { label: '1:1', value: 1, name: '1:1' },
        { label: '16:10', value: 16 / 10, name: '16:10' },
      ]
    : [
        { label: '16:10 (Dự án)', value: 16 / 10, name: '16:10' },
        { label: '16:9', value: 16 / 9, name: '16:9' },
        { label: '21:9', value: 21 / 9, name: '21:9' },
        { label: '1:1', value: 1, name: '1:1' },
      ];

  const exportHeight = Math.round(1920 / aspectRatio);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#121216] border border-white/15 rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col text-white overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C3EA39]/10 border border-[#C3EA39]/30 flex items-center justify-center text-[#C3EA39]">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
                <span>Khung Xem Trước & Căn Chỉnh</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#C3EA39]">
                  {aspectName}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Controls Bar (Tỉ lệ & Bộ lọc dạng icon tròn) */}
        <div className="pt-3 pb-2 space-y-2 text-xs">
          {/* Ratio Pills & Circular Filters Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Aspect Ratio Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-mono text-white/40 mr-1 shrink-0 flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-[#C3EA39]" />
                <span>Tỉ lệ:</span>
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/5">
                {presets.map((ratio) => (
                  <button
                    key={ratio.name}
                    type="button"
                    onClick={() => {
                      setAspectRatio(ratio.value);
                      setAspectName(ratio.name);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shrink-0 ${
                      aspectName === ratio.name
                        ? 'bg-[#C3EA39] text-black font-bold shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Circular Filter Swatches */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-mono text-white/40 mr-0.5 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C3EA39]" />
                <span>Màu:</span>
              </span>
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 border border-white/5">
                {FILTER_PRESETS.map((f) => {
                  const isSelected = selectedFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFilter(f.id)}
                      title={f.label}
                      className={`relative w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${f.bgClass} ${
                        isSelected
                          ? 'ring-2 ring-[#C3EA39] ring-offset-2 ring-offset-[#121216] scale-110 shadow-sm shadow-[#C3EA39]/30'
                          : 'opacity-65 hover:opacity-100 hover:scale-105 border border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Cropper Stage (Clean, centered, unobstructed) */}
        <div className="py-2 flex flex-col items-center justify-center">
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
              maxHeight: 'min(50vh, 420px)',
              maxWidth: `min(100%, calc(min(50vh, 420px) * ${aspectRatio}))`,
              width: '100%',
            }}
            className="relative mx-auto rounded-2xl overflow-hidden bg-black border-2 border-[#C3EA39]/70 shadow-2xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center group touch-none"
          >
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Rule of Thirds Guide (Subtle grid) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/5 opacity-25">
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

            {/* Sleek Floating Helper Badge */}
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[9px] font-mono text-white/60 border border-white/10 pointer-events-none">
              Kéo để dời • Cuộn để zoom
            </div>
          </div>

          {/* Zoom & Centering Control Bar */}
          <div className="w-full max-w-md mt-3 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
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
                className="flex-1 accent-[#C3EA39] cursor-pointer h-1.5"
              />

              <button
                type="button"
                onClick={() => setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))))}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-mono text-white/70 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Căn giữa</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/10 shrink-0">
          <div className="text-[11px] font-mono text-white/40 hidden sm:block">
            Xuất WebP: <span className="text-[#C3EA39]">1920 × {exportHeight}px</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#C3EA39] hover:bg-[#d4f854] text-black font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C3EA39]/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp Dụng & Lưu Ảnh</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

