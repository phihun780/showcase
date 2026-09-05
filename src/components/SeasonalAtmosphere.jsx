import React, { useEffect, useRef } from 'react';
import { usePortfolioData } from '../context/PortfolioDataContext';

export default function SeasonalAtmosphere() {
  const { seasonalEffect } = usePortfolioData();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!seasonalEffect || seasonalEffect === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;

    // ==========================================
    // 1. SNOW PARTICLES (Tuyết Rơi - Thưa & Nhẹ Nhàng)
    // ==========================================
    const createSnowFlakes = () => {
      const count = isMobile ? 8 : Math.min(Math.floor(width / 75), 24);
      const flakes = [];
      for (let i = 0; i < count; i++) {
        flakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.5 + 1.2,
          speedY: Math.random() * 1.0 + 0.4,
          speedX: Math.random() * 0.4 - 0.2,
          swayAngle: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.015 + 0.008,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
      return flakes;
    };

    // ==========================================
    // 2. TET BLOSSOM PETALS (Hoa Mai & Hoa Đào - Thưa & Bay Bổng)
    // ==========================================
    const createTetPetals = () => {
      const count = isMobile ? 6 : Math.min(Math.floor(width / 95), 16);
      const petals = [];
      const colors = [
        { fill: '#FFD700', stroke: '#FFA500', type: 'mai' }, // Mai vàng
        { fill: '#FFC400', stroke: '#FF8C00', type: 'mai' }, // Mai nghệ
        { fill: '#FF85A1', stroke: '#FF5376', type: 'dao' }, // Đào hồng
        { fill: '#FFA8BA', stroke: '#FF6B8B', type: 'dao' }, // Đào phớt
        { fill: '#FF5252', stroke: '#D32F2F', type: 'loc' }, // Đỏ may mắn
      ];

      for (let i = 0; i < count; i++) {
        const scheme = colors[Math.floor(Math.random() * colors.length)];
        petals.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 7 + 6,
          speedY: Math.random() * 1.2 + 0.7,
          speedX: Math.random() * 1.0 + 0.3,
          angle: Math.random() * Math.PI * 2,
          rotateSpeed: (Math.random() * 0.02 - 0.01),
          flipAngle: Math.random() * Math.PI * 2,
          flipSpeed: Math.random() * 0.025 + 0.01,
          opacity: Math.random() * 0.45 + 0.35,
          color: scheme.fill,
          strokeColor: scheme.stroke,
          type: scheme.type,
        });
      }
      return petals;
    };

    // ==========================================
    // 3. MID-AUTUMN (Đèn Lồng, Lá Thu & Sao - Thưa & Thơ Mộng)
    // ==========================================
    const createMidAutumnItems = () => {
      const lanternCount = isMobile ? 2 : Math.min(Math.floor(width / 250), 5);
      const leafCount = isMobile ? 4 : Math.min(Math.floor(width / 130), 10);
      const starCount = isMobile ? 6 : Math.min(Math.floor(width / 100), 15);

      const lanterns = [];
      for (let i = 0; i < lanternCount; i++) {
        lanterns.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 9 + 13,
          speedY: -(Math.random() * 0.5 + 0.3), // Float upwards
          speedX: Math.random() * 0.3 - 0.15,
          swayAngle: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.015 + 0.006,
          glowRadius: Math.random() * 14 + 18,
          opacity: Math.random() * 0.45 + 0.4,
        });
      }

      const leaves = [];
      const leafColors = ['#D35400', '#E67E22', '#F39C12', '#C0392B'];
      for (let i = 0; i < leafCount; i++) {
        leaves.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 6 + 7,
          speedY: Math.random() * 1.1 + 0.6,
          speedX: Math.random() * 0.7 - 0.2,
          angle: Math.random() * Math.PI * 2,
          rotateSpeed: Math.random() * 0.02 - 0.01,
          flipAngle: Math.random() * Math.PI * 2,
          flipSpeed: Math.random() * 0.02 + 0.008,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
          opacity: Math.random() * 0.45 + 0.3,
        });
      }

      const stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.2 + 0.5,
          alpha: Math.random(),
          speed: Math.random() * 0.015 + 0.005,
        });
      }

      return { lanterns, leaves, stars };
    };

    let snowFlakes = seasonalEffect === 'snow' ? createSnowFlakes() : [];
    let tetPetals = seasonalEffect === 'tet' ? createTetPetals() : [];
    let midAutumnData = seasonalEffect === 'mid_autumn' ? createMidAutumnItems() : null;

    // ==========================================
    // RENDER LOOP
    // ==========================================
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // --- 1. SNOW RENDER ---
      if (seasonalEffect === 'snow') {
        for (let i = 0; i < snowFlakes.length; i++) {
          const f = snowFlakes[i];
          f.swayAngle += f.swaySpeed;
          f.x += f.speedX + Math.sin(f.swayAngle) * 0.6;
          f.y += f.speedY;

          if (f.y > height + 10) {
            f.y = -10;
            f.x = Math.random() * width;
          }
          if (f.x > width + 10) f.x = -10;
          if (f.x < -10) f.x = width + 10;

          // Draw Snowflake with soft glow
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
          if (!isMobile) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = f.radius * 2;
          }
          ctx.fill();
          if (!isMobile) ctx.shadowBlur = 0;
        }
      }

      // --- 2. TET PETALS RENDER ---
      else if (seasonalEffect === 'tet') {
        for (let i = 0; i < tetPetals.length; i++) {
          const p = tetPetals[i];
          p.angle += p.rotateSpeed;
          p.flipAngle += p.flipSpeed;
          p.x += p.speedX + Math.sin(p.flipAngle) * 0.8;
          p.y += p.speedY;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
          if (p.x < -20) p.x = width + 20;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          const flipScale = Math.cos(p.flipAngle);
          ctx.scale(flipScale, 1);

          // Draw Petal Shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.5, p.size * 0.8, p.size * 0.5, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.7, -p.size * 0.5, 0, -p.size);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          if (!isMobile) {
            ctx.shadowColor = p.strokeColor;
            ctx.shadowBlur = 4;
          }
          ctx.fill();
          if (!isMobile) ctx.shadowBlur = 0;

          // Subtle center petal vein
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.7);
          ctx.lineTo(0, p.size * 0.6);
          ctx.strokeStyle = p.strokeColor;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.restore();
        }
      }

      // --- 3. MID-AUTUMN RENDER ---
      else if (seasonalEffect === 'mid_autumn' && midAutumnData) {
        const { lanterns, leaves, stars } = midAutumnData;

        // A. Background Twinkling Stars
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.alpha += s.speed;
          const currentAlpha = Math.abs(Math.sin(s.alpha)) * 0.65 + 0.15;

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 235, 170, ${currentAlpha})`;
          ctx.fill();
        }

        // B. Falling Autumn Leaves
        for (let i = 0; i < leaves.length; i++) {
          const l = leaves[i];
          l.angle += l.rotateSpeed;
          l.flipAngle += l.flipSpeed;
          l.x += l.speedX + Math.sin(l.flipAngle) * 0.7;
          l.y += l.speedY;

          if (l.y > height + 20) {
            l.y = -20;
            l.x = Math.random() * width;
          }
          if (l.x > width + 20) l.x = -20;
          if (l.x < -20) l.x = width + 20;

          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.angle);
          ctx.scale(Math.cos(l.flipAngle), 1);

          ctx.beginPath();
          ctx.moveTo(0, -l.size);
          ctx.quadraticCurveTo(l.size * 0.8, 0, 0, l.size);
          ctx.quadraticCurveTo(-l.size * 0.8, 0, 0, -l.size);
          ctx.fillStyle = l.color;
          ctx.globalAlpha = l.opacity;
          ctx.fill();
          ctx.restore();
        }

        // C. Glowing Floating Sky Lanterns (Đèn Lồng / Hoa Đăng)
        for (let i = 0; i < lanterns.length; i++) {
          const lan = lanterns[i];
          lan.swayAngle += lan.swaySpeed;
          lan.x += lan.speedX + Math.sin(lan.swayAngle) * 0.4;
          lan.y += lan.speedY;

          if (lan.y < -50) {
            lan.y = height + 30;
            lan.x = Math.random() * width;
          }
          if (lan.x > width + 30) lan.x = -30;
          if (lan.x < -30) lan.x = width + 30;

          ctx.save();
          ctx.translate(lan.x, lan.y);

          // Outer Glow Halo
          const gradient = ctx.createRadialGradient(0, 0, lan.size * 0.2, 0, 0, lan.glowRadius);
          gradient.addColorStop(0, `rgba(255, 170, 50, ${lan.opacity * 0.8})`);
          gradient.addColorStop(0.5, `rgba(255, 100, 20, ${lan.opacity * 0.3})`);
          gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');

          ctx.beginPath();
          ctx.arc(0, 0, lan.glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Lantern Body (Hexagonal / Pill shape)
          const w = lan.size * 0.7;
          const h = lan.size;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 4);
          ctx.fillStyle = `rgba(255, 200, 110, ${lan.opacity * 0.95})`;
          ctx.fill();

          // Inner Flame Core
          ctx.beginPath();
          ctx.arc(0, h * 0.1, lan.size * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          if (!isMobile) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          if (!isMobile) ctx.shadowBlur = 0;

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [seasonalEffect]);

  if (!seasonalEffect || seasonalEffect === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}
