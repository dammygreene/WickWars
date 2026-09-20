import type { DailyChallenge } from '@/lib/types';
import { GAME_DURATION_MS, START_BALANCE, LEVERAGE } from './constants';

export function seasonConfig() {
  return {
    id: process.env.WW_SEASON_ID || 'S01',
    name: process.env.WW_SEASON_NAME || 'Season 01 — Genesis Wick',
    start: process.env.WW_SEASON_START || '2026-09-01T00:00:00Z',
    end: process.env.WW_SEASON_END || '2026-10-01T00:00:00Z',
  };
}

/** UTC day key: 2026-09-20 */
export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayBounds(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

/** Deterministic difficulty 2..4 rotating by day (keeps seasons varied but fair). */
export function difficultyForDay(key: string): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 2 + (h % 3);
}

export function challengeForDay(key: string): DailyChallenge {
  const season = seasonConfig();
  const { start, end } = dayBounds(key);
  const now = Date.now();
  const status = now < start.getTime() ? 'UPCOMING' : now >= end.getTime() ? 'ENDED' : 'LIVE';
  return {
    id: `${season.id}-${key}`,
    seasonId: season.id,
    name: `Daily Wick — ${key}`,
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    scenarioId: `scn-${season.id}-${key}`,
    startingBalance: START_BALANCE,
    durationMs: GAME_DURATION_MS,
    leverage: LEVERAGE,
    difficulty: difficultyForDay(key),
    status,
  };
}

export function todayChallenge(): DailyChallenge {
  return challengeForDay(dayKey());
}
