/** Avatar embedding for cards: remote image -> data URI <image> with the template clip-path. */

const MAX_BYTES = 2_000_000;

export async function fetchAvatarDataUri(url: string | undefined): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    return `data:${ct.split(';')[0]};base64,${buf.toString('base64')}`;
  } catch {
    return null; // never break card rendering on avatar failure
  }
}

export interface AvatarSlot {
  clipId: 'avatarClip' | 'avatarClip2';
  x: number;
  y: number;
  size: number;
}

export const GAME_AVATAR: AvatarSlot = { clipId: 'avatarClip', x: 96, y: 96, size: 64 };
export const ALLTIME_AVATAR: AvatarSlot = { clipId: 'avatarClip2', x: 96, y: 96, size: 88 };

/**
 * Replace the placeholder rect+initial with the real avatar image.
 * Call BEFORE token replacement; if dataUri is null the fallback initial stays.
 */
export function embedAvatar(svg: string, slot: AvatarSlot, dataUri: string | null): string {
  if (!dataUri) return svg;
  const pat = new RegExp(
    `<rect x="${slot.x}" y="${slot.y}" width="${slot.size}" height="${slot.size}" clip-path="url\\(#${slot.clipId}\\)"[^/]*/>\\s*<text[^>]*>\\s*(\\{\\{\\s*AVATAR_INITIAL\\s*\\}\\}|\\{\\s*AVATAR_INITIAL\\s*\\})\\s*</text>`,
  );
  const img =
    `<image href="${dataUri}" x="${slot.x}" y="${slot.y}" width="${slot.size}" height="${slot.size}" ` +
    `clip-path="url(#${slot.clipId})" preserveAspectRatio="xMidYMid slice"/>`;
  return svg.replace(pat, img);
}
