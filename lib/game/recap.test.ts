import { describe, expect, it } from 'vitest';
import { buildDailyRecap } from './recap';
import type { Game, GameResult } from '@/lib/types';

function game(id: string, playerId: string, runType: Game['runType'] = 'ranked'): Game {
  return { id, playerId, challengeId: 'S01-2026-09-20', scenarioId: 'scn-S01-2026-09-20', seasonId: 'S01', runType, mode: 'DAILY WICK', pair: 'WICK/USD', startsAt: 0, endsAt: 45_000, startBalance: 10_000, status: 'FINISHED', trades: [{ id: `${id}_t`, gameId: id, t: 1000, action: 'LONG', price: 100, notional: 10_000, sideAfter: 'LONG', entryPriceAfter: 100, realizedPnl: 0, kind: 'OPEN' }], resultId: id, createdAt: 0 };
}
function result(id: string, playerId: string, score: number, pnl: number, runType: GameResult['runType'] = 'ranked'): GameResult {
  return { gameId: id, playerId, scenarioId: 'scn-S01-2026-09-20', challengeId: 'S01-2026-09-20', seasonId: 'S01', runType, mode: 'DAILY WICK', pair: 'WICK/USD', startBalance: 10_000, endBalance: 10_000 + pnl, pnl, roi: pnl / 100, trades: 1, tradeEvents: 1, wins: pnl > 0 ? 1 : 0, losses: pnl < 0 ? 1 : 0, winRate: pnl > 0 ? 100 : 0, holdTimeMs: 1000, maxDrawdownPct: 1, score, rank: 1, rankTotal: 1, percentile: 100, durationMs: 45_000, resultState: pnl > 0 ? 'PROFITABLE' : 'WICKED', liquidated: false, verified: true, createdAt: 1 };
}

describe('daily recap', () => {
  const closed = new Date('2026-09-21T00:00:00.000Z');

  it('does not expose a recap during an active day', () => {
    expect(buildDailyRecap('2026-09-22', [], [], new Date('2026-09-22T12:00:00.000Z'))).toBeNull();
  });

  it('uses best ranked result per player and excludes non-ranked runs', () => {
    const games = [game('g1', 'p1'), game('g2', 'p2'), game('g3', 'p3', 'practice')];
    const results = [result('g1', 'p1', 800, 100), result('g2', 'p2', 1200, -100), result('g3', 'p3', 9999, 500, 'practice')];
    const recap = buildDailyRecap('2026-09-20', games, results, closed)!;
    expect(recap.playerCount).toBe(2);
    expect(recap.highScore).toBe(1200);
    expect(recap.averageScore).toBe(1000);
    expect(recap.mostUsedDirection).toBe('LONG');
    expect(recap.profitablePlayerPercent).toBe(50);
  });

  it('is date-scoped and returns legacy recap metadata without a regime', () => {
    const recap = buildDailyRecap('2026-09-20', [game('g1', 'p1')], [result('g1', 'p1', 800, 100)], closed)!;
    expect(recap.dayKey).toBe('2026-09-20');
    expect(recap.scenarioId).toBe('scn-S01-2026-09-20');
    expect(recap.regime).toBeNull();
    expect(recap.biggestWickPercent).not.toBeNull();
  });
});
