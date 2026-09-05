import React, { useEffect, useState } from 'react';

export default function CursorSpotlight() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable on desktop mouse pointer devices (never on mobile touch)
    if (
      typeof window === 'undefined' ||
      window.innerWidth < 1024 ||
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window
    ) {
      return;
    }

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Compact Focused Lime Spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(150px circle at ${position.x}px ${position.y}px, rgba(195, 234, 57, 0.22) 0%, rgba(195, 234, 57, 0.08) 45%, transparent 70%)`,
        }}
      />

      {/* Subtle Central Focus Core */}
      <div
        className="pointer-events-none fixed z-40 transition-transform duration-75 ease-out"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#C3EA39]/30 blur-[2px]" />
      </div>
    </>
  );

}
