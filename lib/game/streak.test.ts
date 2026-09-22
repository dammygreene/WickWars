import { describe, expect, it } from 'vitest';
import { buildStreakCalendar, dailyStreakBefore, dailyStreakFromResults, rankedDayState } from './streak';
import type { GameResult } from '@/lib/types';

function result(date: string, pnl: number, runType: GameResult['runType'] = 'ranked'): GameResult {
  return {
    gameId: `${date}-${runType}-${pnl}`,
    playerId: 'p_test',
    scenarioId: 'scn-test',
    challengeId: 'S01-2026-09-22',
    seasonId: 'S01',
    runType,
    mode: runType === 'ranked' ? 'DAILY WICK' : runType?.toUpperCase() ?? 'PRACTICE',
    pair: 'WICK/USD',
    startBalance: 10_000,
    endBalance: 10_000 + pnl,
    pnl,
    roi: pnl / 100,
    trades: 0,
    tradeEvents: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    holdTimeMs: 0,
    maxDrawdownPct: 0,
    score: pnl,
    rank: runType === 'ranked' ? 1 : 0,
    rankTotal: runType === 'ranked' ? 1 : 0,
    percentile: 0,
    durationMs: 45_000,
    resultState: pnl > 0 ? 'PROFITABLE' : 'WICKED',
    liquidated: false,
    verified: true,
    createdAt: new Date(`${date}T12:00:00.000Z`).getTime(),
  };
}

describe('streak calendar', () => {
  it('classifies verified ranked outcomes by server P&L semantics', () => {
    expect(rankedDayState(result('2026-09-20', 1))).toBe('PROFITABLE');
    expect(rankedDayState(result('2026-09-20', -1))).toBe('WICKED');
    expect(rankedDayState(result('2026-09-20', 0))).toBe('FLAT');
    expect(rankedDayState(null)).toBe('NOT_PLAYED');
  });

  it('excludes practice and challenge outcomes from daily cells and risk state', () => {
    const calendar = buildStreakCalendar(
      [result('2026-09-21', 100, 'practice'), result('2026-09-22', 100, 'challenge')],
      new Date('2026-09-22T23:59:00.000Z'),
      3,
      0,
    );
    expect(calendar.days.every((day) => day.state === 'NOT_PLAYED')).toBe(true);
    expect(calendar.todayState).toBe('NOT_PLAYED');
    expect(calendar.streakAtRisk).toBe(false);
  });

  it('uses UTC dates and selects the latest ranked result for a day', () => {
    const calendar = buildStreakCalendar(
      [result('2026-09-21', 100), result('2026-09-22', -50), result('2026-09-22', 250)],
      new Date('2026-09-22T23:59:00.000Z'),
      3,
      1,
    );
    expect(calendar.days.map((day) => day.date)).toEqual(['2026-09-20', '2026-09-21', '2026-09-22']);
    expect(calendar.days[1].state).toBe('PROFITABLE');
    expect(calendar.todayState).toBe('PROFITABLE');
    expect(calendar.days[2].today).toBe(true);
    expect(calendar.streakAtRisk).toBe(false);
  });

  it('counts one profitable day once even when multiple profitable results exist', () => {
    const results = [result('2026-09-21', 100), result('2026-09-21', 200)];
    expect(dailyStreakFromResults(results)).toBe(1);
    expect(dailyStreakBefore(results, new Date('2026-09-22T12:00:00.000Z'))).toBe(1);
  });

  it('resets on a losing authoritative day and resumes on consecutive profitable days', () => {
    const results = [result('2026-09-20', 100), result('2026-09-21', -50), result('2026-09-22', 250)];
    expect(dailyStreakFromResults(results)).toBe(1);
    expect(dailyStreakBefore(results, new Date('2026-09-22T23:00:00.000Z'))).toBe(0);
  });

  it('marks an active ranked streak at risk only when today is unplayed', () => {
    const calendar = buildStreakCalendar([result('2026-09-21', 100)], new Date('2026-09-22T12:00:00.000Z'), 2, 1);
    expect(calendar.streakAtRisk).toBe(true);
    expect(calendar.resetAt).toBe('2026-09-23T00:00:00.000Z');
  });

  it('breaks the current streak after a missed UTC day', () => {
    const results = [result('2026-09-20', 100)];
    expect(dailyStreakFromResults(results, new Date('2026-09-22T12:00:00.000Z'))).toBe(0);
    expect(buildStreakCalendar(results, new Date('2026-09-22T12:00:00.000Z'), 3).streakAtRisk).toBe(false);
  });
});