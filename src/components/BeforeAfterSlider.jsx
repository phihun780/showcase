import React, { useState, useRef, useCallback, useEffect } from 'react';

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = '',
  afterLabel = '',
  initialPosition = 50,
  className = '',
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPos);
  }, []);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative w-full h-full overflow-hidden select-none cursor-ew-resize touch-none ${className}`}
    >
      {/* 1. Background Image (After / Right Image) */}
      <img
        src={afterImage}
        alt={afterLabel || 'Sau (After)'}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      {afterLabel && (
        <span className="absolute bottom-4 right-4 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-mono pointer-events-none z-10 border border-white/10 shadow-lg">
          {afterLabel}
        </span>
      )}

      {/* 2. Foreground Image (Before / Left Image - Clipped by Slider) */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel || 'Trước (Before)'}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        {beforeLabel && (
          <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-mono pointer-events-none z-10 border border-white/10 shadow-lg">
            {beforeLabel}
          </span>
        )}
      </div>

      {/* 3. Divider Line & Interactive Handle */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)] z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-black shadow-2xl border-2 border-black/80 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform">
          <div className="flex items-center gap-0.5 text-[9px] font-bold text-black select-none">
            <span>◀</span>
            <span>▶</span>
          </div>
        </div>
      </div>
    </div>
  );
}
