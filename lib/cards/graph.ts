import { escapeXml } from './text';

/**
 * Procedural replacement for the all-time `<g id="graph-region">` placeholder.
 * Plots REAL history: per-season average score when several seasons exist,
 * otherwise the player's chronological per-game scores.
 * Geometry mirrors the template: rect(96,302,1008x340), inner translate(126,326)
 * with gridlines y=70/150/230 across 948px, labels at translate(126,626).
 */

const GRID = [70, 150, 230];
const W = 948;
const Y_MIN = 36;
const Y_MAX = 284;

export interface GraphPoint {
  label: string;
  value: number;
}

export function buildGraphRegion(points: GraphPoint[], accent: string): string {
  const grid = GRID.map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#171A20" stroke-width="1"/>`).join('');

  let data = '';
  let labels = '';
  if (points.length === 0) {
    data = `<line x1="0" y1="150" x2="${W}" y2="150" stroke="#2A3038" stroke-width="1.5" stroke-dasharray="6 6"/>`;
    labels = `<text x="${W / 2}" y="0" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#5B616C">NO RUNS YET</text>`;
  } else {
    const vals = points.map((p) => p.value);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 1) {
      hi += 5;
      lo -= 5;
    }
    const pad = (hi - lo) * 0.15;
    lo -= pad;
    hi += pad;
    const yFor = (v: number) => Y_MAX - ((v - lo) / (hi - lo)) * (Y_MAX - Y_MIN);
    const xFor = (i: number) => (points.length === 1 ? W / 2 : 20 + (i / (points.length - 1)) * (W - 40));
    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${r2(c.x)} ${r2(c.y)}`).join(' ');
    const area = `${line} L ${r2(coords[coords.length - 1].x)} 330 L ${r2(coords[0].x)} 330 Z`;
    const last = coords[coords.length - 1];
    data =
      `<defs><linearGradient id="atFill" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>` +
      `<stop offset="100%" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>` +
      `<path d="${area}" fill="url(#atFill)"/>` +
      `<path d="${line}" fill="none" stroke="${accent}" stroke-width="2.5"/>` +
      (points.length === 1
        ? `<circle cx="${r2(last.x)}" cy="${r2(last.y)}" r="6" fill="${accent}"/>`
        : `<circle cx="${r2(last.x)}" cy="${r2(last.y)}" r="5" fill="${accent}"/>`);
    const idx = labelIndices(points.length);
    labels = idx
      .map((i) => `<text x="${r2(xFor(i))}" y="0" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12" fill="#8B929D">${escapeXml(points[i].label)}</text>`)
      .join('');
  }

  return (
    `<g id="graph-region">` +
    `<rect x="96" y="302" width="1008" height="340" rx="18" fill="#0D0F14" stroke="#171A20" stroke-width="1"/>` +
    `<g transform="translate(126,326)">` +
    grid +
    data +
    `</g>` +
    `<g transform="translate(126,626)">` +
    labels +
    `</g>` +
    `</g>`
  );
}

/** Pick up to 4 spread label indices. */
function labelIndices(n: number): number[] {
  if (n <= 4) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1];
}

export function swapGraphRegion(svg: string, replacement: string): string {
  const start = svg.indexOf('<g id="graph-region">');
  if (start === -1) return svg;
  // Placeholder ends right before the stats grid (translate(96,706)).
  const anchor = svg.indexOf('<g transform="translate(96,706)">');
  if (anchor === -1) return svg;
  return svg.slice(0, start) + replacement + svg.slice(anchor);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
