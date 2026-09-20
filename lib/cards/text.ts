/** XML escaping + bounded-text fitting for card tokens. */

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Conservative average advance-width ratios per family (fraction of font-size). */
const RATIOS: Record<string, number> = {
  'space grotesk': 0.62,
  inter: 0.56,
  'ibm plex mono': 0.6,
};

function ratioFor(fontFamilyAttr: string): number {
  const f = fontFamilyAttr.toLowerCase();
  for (const [k, v] of Object.entries(RATIOS)) if (f.includes(k)) return v;
  return 0.6;
}

export interface FitOpts {
  maxWidth: number;
  minSize: number;
  step?: number;
  truncateAt?: number; // max chars before ellipsis
}

/**
 * Replace a token that occupies the FULL content of a <text> element, shrinking
 * font-size in steps until the estimate fits, then truncating as a last resort.
 * Returns svg unchanged if the token isn't a full-content match (caller falls
 * back to plain replacement for inline tokens like `START {X}`).
 */
export function replaceFullTextToken(svg: string, token: string, rawValue: string, opts: FitOpts): string {
  const step = opts.step ?? 2;
  const pat = new RegExp(
    `<text([^>]*?)font-size="([\\d.]+)"([^>]*?)>\\s*(\\{\\{\\s*${token}\\s*\\}\\}|\\{\\s*${token}\\s*\\})\\s*</text>`,
  );
  const m = svg.match(pat);
  if (!m) return svg;
  const baseSize = parseFloat(m[2]);
  const ratio = ratioFor(m[1] + m[3]);

  let value = rawValue;
  let size = baseSize;
  const est = (v: string, s: number) => v.length * s * ratio;
  while (size - step >= opts.minSize && est(value, size) > opts.maxWidth) size -= step;
  if (est(value, size) > opts.maxWidth && opts.truncateAt) {
    const keep = Math.max(4, opts.truncateAt);
    value = value.length > keep ? `${value.slice(0, keep - 1)}…` : value;
    while (size - step >= opts.minSize && est(value, size) > opts.maxWidth) size -= step;
  }
  if (est(value, size) > opts.maxWidth) {
    // Final guard: hard fit (should be unreachable for realistic values).
    size = Math.max(opts.minSize, (opts.maxWidth / (value.length * ratio)) | 0);
  }
  const replacement = `<text${m[1]}font-size="${round2(size)}"${m[3]}>${escapeXml(value)}</text>`;
  // Function replacer: values contain `$` (money) which would otherwise act as $-patterns.
  return svg.replace(pat, () => replacement);
}

/** Plain replacement supporting BOTH {{TOKEN}} and {TOKEN} spellings in templates. */
export function replaceToken(svg: string, token: string, rawValue: string): string {
  const v = escapeXml(rawValue);
  return svg
    .split(`{{${token}}}`)
    .join(v)
    .split(`{${token}}`)
    .join(v);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
