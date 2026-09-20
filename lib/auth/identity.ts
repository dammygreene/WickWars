import { z } from 'zod';
import type { PlayerIdentity, PlayerStats } from '@/lib/types';
import { emptyStats, getStats, newId, savePlayer, usernameTaken } from '@/lib/store/db';

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,18}$/;
export const usernameSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, ''))
  .refine((s) => USERNAME_RE.test(s), 'Use 3–18 letters, numbers or underscores.');

const TITLES: Array<{ min: number; title: string }> = [
  { min: 0, title: 'WICK NOVICE' },
  { min: 5, title: 'WICK TRADER' },
  { min: 15, title: 'WICK HUNTER' },
  { min: 40, title: 'WICK LORD' },
  { min: 100, title: 'WICK GOD' },
];

export function titleForGames(games: number): string {
  let t = TITLES[0].title;
  for (const row of TITLES) if (games >= row.min) t = row.title;
  return t;
}

/** Archetype is computed from real behavior, never self-selected. */
export function archetypeForStats(s: PlayerStats): string {
  if (s.games < 3) return 'UNRANKED';
  const avgHold = s.totalHoldMs / Math.max(1, s.totalTrades);
  const longRatio = s.longCount / Math.max(1, s.longCount + s.shortCount);
  const winRate = s.wins / Math.max(1, s.games);
  if (avgHold < 6000 && s.totalTrades / Math.max(1, s.games) > 6) return 'THE APE';
  if (avgHold > 25000 && winRate >= 0.5) return 'THE SNIPER';
  if (longRatio > 0.8) return 'THE DEGEN';
  if (longRatio < 0.25) return 'THE CONTRARIAN';
  if (winRate < 0.35 && s.games >= 8) return 'THE JEET';
  if (s.longestStreak >= 4) return 'THE SURVIVOR';
  return 'THE GRINDER';
}

export function levelForGames(games: number): number {
  return 1 + Math.floor(games / 5);
}

export async function refreshIdentity(p: PlayerIdentity): Promise<PlayerIdentity> {
  const s = await getStats(p.playerId);
  const next: PlayerIdentity = {
    ...p,
    title: titleForGames(s.games),
    archetype: archetypeForStats(s),
    level: levelForGames(s.games),
  };
  if (next.title !== p.title || next.archetype !== p.archetype || next.level !== p.level) {
    await savePlayer(next);
  }
  return next;
}

export async function createGuest(username?: string): Promise<PlayerIdentity> {
  let handle = username?.trim().replace(/^@/, '') ?? '';
  if (handle) {
    usernameSchema.parse(handle);
    if (await usernameTaken(handle)) throw new Error('USERNAME_TAKEN');
  } else {
    handle = `wick_${Math.random().toString(36).slice(2, 8)}`;
    while (await usernameTaken(handle)) handle = `wick_${Math.random().toString(36).slice(2, 8)}`;
  }
  const p: PlayerIdentity = {
    playerId: newId('p'),
    username: handle,
    displayName: handle,
    title: 'WICK NOVICE',
    archetype: 'UNRANKED',
    level: 1,
    guest: true,
    createdAt: Date.now(),
  };
  await savePlayer(p, emptyStats());
  return p;
}
