'use client';

import { useEffect, useRef } from 'react';

/**
 * Ambient hero chart — pure decoration (local random walk, NOT game data).
 * Subtle, dark, restrained. Static frame when reduced-motion is preferred.
 */
export function HeroChart({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Seeded walk so first paint is stable.
    let seed = 20260920;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const N = 90;
    const closes: number[] = [];
    let p = 100;
    for (let i = 0; i < N; i++) {
      p *= 1 + (rand() - 0.485) * 0.012;
      closes.push(p);
    }
    const vols = closes.map(() => 0.2 + rand() * 0.8);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let tick = 0;
    const draw = () => {
      tick++;
      if (!reduced && tick % 6 === 0) {
        const last = closes[closes.length - 1];
        closes.push(last * (1 + (Math.random() - 0.485) * 0.012));
        closes.shift();
        vols.push(0.2 + Math.random() * 0.8);
        vols.shift();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const lo = Math.min(...closes);
      const hi = Math.max(...closes);
      const pad = (hi - lo) * 0.25 || 1;
      const y = (v: number) => h - 14 - ((v - (lo - pad)) / (hi - lo + pad * 2)) * (h - 28);
      const step = w / (N - 1);

      // grid
      ctx.strokeStyle = 'rgba(32,36,43,0.9)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const gy = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // area + line
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(53,229,139,0.14)');
      grad.addColorStop(1, 'rgba(53,229,139,0)');
      ctx.beginPath();
      closes.forEach((v, i) => {
        const x = i * step;
        if (i === 0) ctx.moveTo(x, y(v));
        else ctx.lineTo(x, y(v));
      });
      ctx.strokeStyle = 'rgba(53,229,139,0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // last price tag
      const lastV = closes[closes.length - 1];
      const ly = y(lastV);
      ctx.fillStyle = '#35E58B';
      const label = lastV.toFixed(2);
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillRect(w - tw - 8, ly - 11, tw, 22);
      ctx.fillStyle = '#06130c';
      ctx.fillText(label, w - tw - 2, ly + 4);

      // pulse dot
      ctx.beginPath();
      ctx.arc(w - 10, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#35E58B';
      ctx.fill();

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden
    />
  );
}
