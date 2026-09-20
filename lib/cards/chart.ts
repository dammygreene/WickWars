import type { Candle, MarketScenario, TradeEvent } from '@/lib/types';
import { candlesUpTo } from '@/lib/game/scenario';
import { escapeXml } from './text';

/**
 * Procedural replacement for the `<g id="chart-region">` placeholder.
 * Geometry mirrors the art-directed template exactly:
 *   outer rect (96,192,1008x400), inner plot translate(130,222) 918x300,
 *   dashed divider at y=554, START/END captions at y=576.
 */

const UP = '#35E58B';
const DOWN = '#FF4F5E';
const FLAT = '#3a3f4a';
const PLOT_W = 918;
const PLOT_H = 300;
const CANDLE_N = 30;

export interface ChartInput {
  scenario: MarketScenario;
  trades: TradeEvent[];
  mode: string;
  pair: string;
  durationLabel: string;
  startLabel: string;
  endLabel: string;
}

export function buildChartRegion(input: ChartInput): string {
  const { scenario, trades } = input;
  const candles: Candle[] = candlesUpTo(scenario, scenario.durationMs, CANDLE_N);

  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    lo = Math.min(lo, c.low);
    hi = Math.max(hi, c.high);
  }
  for (const t of trades) {
    lo = Math.min(lo, t.price);
    hi = Math.max(hi, t.price);
  }
  if (!isFinite(lo) || !isFinite(hi) || hi - lo <= 0) {
    lo = scenario.startingPrice * 0.99;
    hi = scenario.startingPrice * 1.01;
  }
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad;
  hi += pad;

  const xFor = (t: number) => (t / scenario.durationMs) * PLOT_W;
  const yFor = (p: number) => PLOT_H - ((p - hi) / (lo - hi)) * PLOT_H;

  const step = PLOT_W / CANDLE_N;
  let body = '';
  const closes: string[] = [];
  candles.forEach((c, i) => {
    const cx = step * (i + 0.5);
    const yO = yFor(c.open);
    const yC = yFor(c.close);
    const yH = yFor(c.high);
    const yL = yFor(c.low);
    const color = c.close > c.open ? UP : c.close < c.open ? DOWN : FLAT;
    const top = Math.min(yO, yC);
    const h = Math.max(2, Math.abs(yC - yO));
    body += `<line x1="${r2(cx)}" y1="${r2(yH)}" x2="${r2(cx)}" y2="${r2(yL)}" stroke="${color}" stroke-width="2"/>`;
    body += `<rect x="${r2(cx - 5)}" y="${r2(top)}" width="10" height="${r2(h)}" rx="2" fill="${color}"/>`;
    closes.push(`${i === 0 ? 'M' : 'L'} ${r2(cx)} ${r2(yC)}`);
  });
  const baseline = `<path d="${closes.join(' ')}" fill="none" stroke="#F5F7FA" stroke-width="1.2" opacity="0.12"/>`;

  // Trade markers (paired open->close connectors drawn underneath).
  const markers: string[] = [];
  const links: string[] = [];
  const openStack: Array<{ x: number; y: number }> = [];
  const placed: Array<{ x: number; y: number }> = [];
  const r = trades.length > 12 ? 10 : 13;
  // De-collide markers so rapid-fire trades (flips) don't stack on one pixel.
  const place = (x: number, y: number): { x: number; y: number } => {
    let px = x;
    let py = y;
    for (let n = 0; n < 8; n++) {
      const hit = placed.some((p) => Math.abs(p.x - px) < r * 1.9 && Math.abs(p.y - py) < r * 1.9);
      if (!hit) break;
      px = clamp(px + (n % 2 === 0 ? 1 : -1) * (r + 5) * Math.ceil((n + 1) / 2) * 0.8, 14, PLOT_W - 14);
      if (n >= 5) py = clamp(py + (n % 2 === 0 ? -1 : 1) * (r + 4), 16, PLOT_H - 16);
    }
    placed.push({ x: px, y: py });
    return { x: px, y: py };
  };
  for (const t of trades) {
    const x = clamp(xFor(t.t), 14, PLOT_W - 14);
    if (t.action === 'LONG' || t.action === 'SHORT') {
      if (t.kind !== 'OPEN') continue;
      const isLong = t.action === 'LONG';
      const y = clamp(yFor(t.price) + (isLong ? 26 : -26), 16, PLOT_H - 16);
      const pt = place(x, y);
      openStack.push({ x: pt.x, y: yFor(t.price) });
      markers.push(isLong ? plusMarker(pt.x, pt.y, r, UP) : minusMarker(pt.x, pt.y, r, DOWN));
    } else {
      const y = clamp(yFor(t.price), 16, PLOT_H - 16);
      const pt = place(x, y);
      const o = openStack.shift();
      if (o) links.push(`<line x1="${r2(o.x)}" y1="${r2(o.y)}" x2="${r2(pt.x)}" y2="${r2(yFor(t.price))}" stroke="#F5F7FA" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/>`);
      markers.push(closeMarker(pt.x, pt.y, Math.max(8, r - 4)));
    }
  }

  return (
    `<g id="chart-region">` +
    `<rect x="96" y="192" width="1008" height="400" rx="18" fill="#0D0F14" stroke="#171A20" stroke-width="1"/>` +
    `<text x="116" y="220" font-family="Inter, sans-serif" font-weight="600" font-size="13" fill="#F5F7FA">${escapeXml(input.mode)}</text>` +
    `<text x="116" y="238" font-family="IBM Plex Mono, monospace" font-size="12" fill="#8B929D">${escapeXml(input.pair)}</text>` +
    `<text x="1084" y="220" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="13" fill="#8B929D">${escapeXml(input.durationLabel)}</text>` +
    `<g transform="translate(130,222)">` +
    baseline +
    body +
    links.join('') +
    markers.join('') +
    `</g>` +
    `<line x1="116" y1="554" x2="1084" y2="554" stroke="#20242B" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>` +
    `<text x="116" y="576" font-family="IBM Plex Mono, monospace" font-size="12.5" fill="#8B929D">START ${escapeXml(input.startLabel)}</text>` +
    `<text x="1084" y="576" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="12.5" fill="#8B929D">END ${escapeXml(input.endLabel)}</text>` +
    `</g>`
  );
}

function plusMarker(x: number, y: number, r: number, fill: string): string {
  return (
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="${fill}" stroke="#08090C" stroke-width="2.5"/>` +
    `<line x1="${r2(x - r * 0.32)}" y1="${r2(y)}" x2="${r2(x + r * 0.32)}" y2="${r2(y)}" stroke="#08090C" stroke-width="2.4" stroke-linecap="round"/>` +
    `<line x1="${r2(x)}" y1="${r2(y - r * 0.32)}" x2="${r2(x)}" y2="${r2(y + r * 0.32)}" stroke="#08090C" stroke-width="2.4" stroke-linecap="round"/>`
  );
}

function minusMarker(x: number, y: number, r: number, fill: string): string {
  return (
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="${fill}" stroke="#08090C" stroke-width="2.5"/>` +
    `<line x1="${r2(x - r * 0.32)}" y1="${r2(y)}" x2="${r2(x + r * 0.32)}" y2="${r2(y)}" stroke="#08090C" stroke-width="2.4" stroke-linecap="round"/>`
  );
}

function closeMarker(x: number, y: number, r: number): string {
  const o = r * 0.38;
  return (
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="#0D0F14" stroke="#F5F7FA" stroke-width="2" opacity="0.95"/>` +
    `<line x1="${r2(x - o)}" y1="${r2(y - o)}" x2="${r2(x + o)}" y2="${r2(y + o)}" stroke="#F5F7FA" stroke-width="1.8" stroke-linecap="round"/>` +
    `<line x1="${r2(x + o)}" y1="${r2(y - o)}" x2="${r2(x - o)}" y2="${r2(y + o)}" stroke="#F5F7FA" stroke-width="1.8" stroke-linecap="round"/>`
  );
}

/** Swap the placeholder group (non-greedy up to the matching close of chart-region). */
export function swapChartRegion(svg: string, replacement: string): string {
  const out = svg.replace(/<g id="chart-region">[\s\S]*?<\/g>\s*(?=<rect x="96" y="616"|<g transform="translate\(96,706\)|$)/, replacement);
  if (out === svg) {
    // Fallback: balanced-ish replace of the whole known placeholder block.
    const start = svg.indexOf('<g id="chart-region">');
    if (start === -1) return svg;
    // The placeholder ends right before the PNL panel rect (game template).
    const anchor = svg.indexOf('<rect x="96" y="616"');
    if (anchor === -1) return svg;
    return svg.slice(0, start) + replacement + svg.slice(anchor);
  }
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
