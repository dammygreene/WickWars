import type { GameResult, RankedDay, RankedDayState, StreakCalendar } from '@/lib/types';
import { dayKey } from './challenge';

export const STREAK_CALENDAR_DAYS = 84;

export function rankedDayState(result: Pick<GameResult, 'pnl'> | null): RankedDayState {
  if (!result) return 'NOT_PLAYED';
  if (result.pnl > 0) return 'PROFITABLE';
  if (result.pnl < 0) return 'WICKED';
  return 'FLAT';
}

/** Latest verified ranked result is authoritative when a day has multiple runs. */
export function latestRankedResultByDay(results: GameResult[]): Map<string, GameResult> {
  const latest = new Map<string, GameResult>();
  for (const result of results
    .filter((item) => item.verified && (item.runType ?? 'ranked') === 'ranked')
    .sort((a, b) => a.createdAt - b.createdAt || a.gameId.localeCompare(b.gameId))) {
    latest.set(dayKey(new Date(result.createdAt)), result);
  }
  return latest;
}

/** Number of consecutive profitable UTC days immediately before `date`. */
export function dailyStreakBefore(results: GameResult[], date: Date): number {
  const daily = latestRankedResultByDay(results);
  let cursor = new Date(`${dayKey(date)}T00:00:00.000Z`).getTime() - 86_400_000;
  let streak = 0;
  while (true) {
    const result = daily.get(new Date(cursor).toISOString().slice(0, 10));
    if (!result || result.pnl <= 0) return streak;
    streak++;
    cursor -= 86_400_000;
  }
}

/** Current streak from the latest completed ranked day in verified history. */
export function dailyStreakFromResults(results: GameResult[], now = new Date()): number {
  const daily = latestRankedResultByDay(results);
  const today = dayKey(now);
  const yesterday = new Date(new Date(`${today}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const endDate = daily.has(today) ? today : daily.has(yesterday) ? yesterday : null;
  if (!endDate) return 0;
  let cursor = new Date(`${endDate}T00:00:00.000Z`).getTime();
  let streak = 0;
  while (true) {
    const result = daily.get(new Date(cursor).toISOString().slice(0, 10));
    if (!result || result.pnl <= 0) return streak;
    streak++;
    cursor -= 86_400_000;
  }
}

export function buildStreakCalendar(
  results: GameResult[],
  now = new Date(),
  days = STREAK_CALENDAR_DAYS,
  currentStreak = dailyStreakFromResults(results, now),
): StreakCalendar {
  const today = dayKey(now);
  const start = new Date(`${today}T00:00:00.000Z`).getTime() - (days - 1) * 86_400_000;
  const latestByDay = latestRankedResultByDay(results);
  const activeDates = new Set<string>();
  const yesterday = new Date(new Date(`${today}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  let cursor = latestByDay.has(today) ? today : latestByDay.has(yesterday) ? yesterday : undefined;
  while (cursor) {
    const result = latestByDay.get(cursor);
    if (!result || result.pnl <= 0) break;
    activeDates.add(cursor);
    cursor = new Date(new Date(`${cursor}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  }

  const output: RankedDay[] = [];
  for (let i = 0; i < days; i++) {
    const timestamp = start + i * 86_400_000;
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const result = latestByDay.get(date) ?? null;
    output.push({
      date,
      state: rankedDayState(result),
      score: result?.score ?? null,
      pnl: result?.pnl ?? null,
      activeStreak: activeDates.has(date) && result?.pnl != null && result.pnl > 0,
      today: date === today,
    });
  }

  const todayResult = latestByDay.get(today) ?? null;
  const resetAt = new Date(`${today}T00:00:00.000Z`).getTime() + 86_400_000;
  return {
    days: output,
    currentStreak,
    todayState: rankedDayState(todayResult),
    streakAtRisk: currentStreak > 0 && !todayResult,
    resetAt: new Date(resetAt).toISOString(),
  };
}

export function longestDailyStreak(results: GameResult[]): number {
  const dates = [...latestRankedResultByDay(results).entries()].sort(([a], [b]) => a.localeCompare(b));
  let longest = 0;
  let running = 0;
  let previous: number | null = null;
  for (const [date, result] of dates) {
    const timestamp = new Date(`${date}T00:00:00.000Z`).getTime();
    if (result.pnl > 0 && previous != null && timestamp - previous === 86_400_000) running++;
    else if (result.pnl > 0) running = 1;
    else running = 0;
    longest = Math.max(longest, running);
    previous = timestamp;
  }
  return longest;
}