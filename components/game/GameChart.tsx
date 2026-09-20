'use client';

import { useEffect, useRef } from 'react';
import type { TickSnapshot } from '@/lib/game/tick';

/**
 * Live game chart (Canvas). Renders at 60fps from a ref-held tick snapshot so
 * React never re-renders per frame; the price point interpolates between polls.
 */
interface Props {
  getTick: () => TickSnapshot | null;
  getNow: () => number; // game-time ms (t) as a smooth local estimate
  durationMs: number;
  frozen?: boolean;
}

const UP = '#35E58B';
const DOWN = '#FF4F5E';

export function GameChart({ getTick, getNow, durationMs, frozen }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ getTick, getNow, frozen });
  cbRef.current = { getTick, getNow, frozen };

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
    let loS = 99;
    let hiS = 101;
    let lastT = -1;

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

    const draw = () => {
      const { getTick: gt, getNow: gn, frozen: fz } = cbRef.current;
      const tick = gt();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!tick || tick.candles.length === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const padR = 64; // price axis
      const padB = 18;
      const plotW = w - padR;
      const plotH = h - padB;
      const N = 45;
      const slot = plotW / N;
      const candles = tick.candles;

      const nowT = gn();
      const t = fz ? tick.t : Math.min(durationMs, Math.max(tick.t, nowT));

      // Range from visible candles + entry + live price.
      let lo = Infinity;
      let hi = -Infinity;
      for (const c of candles) {
        lo = Math.min(lo, c.low);
        hi = Math.max(hi, c.high);
      }
      if (tick.entryPrice != null) {
        lo = Math.min(lo, tick.entryPrice);
        hi = Math.max(hi, tick.entryPrice);
      }
      lo = Math.min(lo, tick.price);
      hi = Math.max(hi, tick.price);
      const span = hi - lo || 1;
      lo -= span * 0.18;
      hi += span * 0.18;
      const k = reduced ? 1 : 0.12;
      loS += (lo - loS) * k;
      hiS += (hi - hiS) * k;
      const y = (v: number) => plotH - ((v - loS) / (hiS - loS)) * plotH;
      const xFor = (ts: number) => (ts / durationMs) * plotW;

      // Grid + y labels.
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) {
        const v = loS + ((hiS - loS) / 4) * i;
        const gy = y(v);
        ctx.strokeStyle = 'rgba(32,36,43,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(gy) + 0.5);
        ctx.lineTo(w, Math.round(gy) + 0.5);
        ctx.stroke();
        ctx.fillStyle = '#707783';
        ctx.fillText(v.toFixed(2), plotW + 8, gy);
      }

      // Time cursor (revealed region shade).
      const revealedX = xFor(t);
      if (!reduced) {
        const g = ctx.createLinearGradient(revealedX, 0, plotW, 0);
        g.addColorStop(0, 'rgba(8,9,12,0)');
        g.addColorStop(1, 'rgba(8,9,12,0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(revealedX, 0, plotW - revealedX, plotH);
      }

      // Candles.
      const bw = Math.max(3, Math.min(10, slot * 0.52));
      candles.forEach((c, i) => {
        const cx = slot * (i + 0.5);
        const up = c.close >= c.open;
        const col = up ? UP : DOWN;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, y(c.high));
        ctx.lineTo(cx, y(c.low));
        ctx.stroke();
        ctx.fillStyle = col;
        const yo = y(c.open);
        const yc = y(c.close);
        const top = Math.min(yo, yc);
        const hh = Math.max(2, Math.abs(yc - yo));
        const bx = cx - bw / 2;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(bx, top, bw, hh, 1.5);
          ctx.fill();
        } else {
          ctx.fillRect(bx, top, bw, hh);
        }
      });

      // Entry line.
      if (tick.side !== 'FLAT' && tick.entryPrice != null) {
        const ey = y(tick.entryPrice);
        const col = tick.side === 'LONG' ? UP : DOWN;
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.75;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, ey);
        ctx.lineTo(plotW, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.font = '700 10px "IBM Plex Mono", monospace';
        const tag = `${tick.side} ${tick.entryPrice.toFixed(2)}`;
        const tw = ctx.measureText(tag).width + 10;
        ctx.fillRect(plotW - tw, ey - 10, tw, 20);
        ctx.fillStyle = '#08090C';
        ctx.fillText(tag, plotW - tw + 5, ey + 0.5);
        ctx.font = '11px "IBM Plex Mono", monospace';
      }

      // Trade markers.
      for (const e of tick.events) {
        const ex = xFor(e.t);
        const eyy = y(e.price);
        if (e.action === 'LONG' || e.action === 'SHORT') {
          if (e.kind !== 'OPEN') continue;
          const isLong = e.action === 'LONG';
          const my = Math.min(plotH - 10, Math.max(10, eyy + (isLong ? 16 : -16)));
          ctx.beginPath();
          ctx.arc(ex, my, 7, 0, Math.PI * 2);
          ctx.fillStyle = isLong ? UP : DOWN;
          ctx.fill();
          ctx.strokeStyle = '#08090C';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ex - 3, my);
          ctx.lineTo(ex + 3, my);
          if (isLong) {
            ctx.moveTo(ex, my - 3);
            ctx.lineTo(ex, my + 3);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(ex, eyy, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#0D0F14';
          ctx.fill();
          ctx.strokeStyle = '#F5F7FA';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ex - 2.4, eyy - 2.4);
          ctx.lineTo(ex + 2.4, eyy + 2.4);
          ctx.moveTo(ex + 2.4, eyy - 2.4);
          ctx.lineTo(ex - 2.4, eyy + 2.4);
          ctx.stroke();
        }
      }

      // Live price line + tag.
      const py = y(tick.price);
      ctx.strokeStyle = '#F5F7FA';
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#F5F7FA';
      const pv = tick.price.toFixed(2);
      ctx.font = '700 11px "IBM Plex Mono", monospace';
      const pw = ctx.measureText(pv).width + 10;
      ctx.fillRect(plotW + 2, py - 10, pw, 20);
      ctx.fillStyle = '#08090C';
      ctx.fillText(pv, plotW + 7, py + 0.5);

      // Progress rail.
      ctx.fillStyle = '#20242B';
      ctx.fillRect(0, h - 5, plotW, 3);
      ctx.fillStyle = tick.side === 'SHORT' ? DOWN : UP;
      ctx.fillRect(0, h - 5, revealedX, 3);

      if (t !== lastT) lastT = t;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [durationMs]);

  return <canvas ref={ref} className="block h-full w-full" role="img" aria-label="Live price chart" />;
}
