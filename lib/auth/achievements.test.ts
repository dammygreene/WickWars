import { describe, expect, it } from 'vitest';
import { deriveAchievements } from './achievements';
import { emptyStats } from '@/lib/store/db';
import type { Game, GameResult } from '@/lib/types';

function fixture(runType: Game['runType'] = 'ranked', liquidated = false, pnl = 100, closeT = 1500): { game: Game; result: GameResult } {
  const gameId = `${runType}-${liquidated}-${pnl}`;
  const game: Game = { id: gameId, playerId: 'p', challengeId: 'S01-2026-09-22', scenarioId: 's', seasonId: 'S01', runType, mode: 'DAILY WICK', pair: 'WICK/USD', startsAt: 0, endsAt: 45_000, startBalance: 10_000, status: 'FINISHED', trades: [{ id: `${gameId}-open`, gameId, t: 0, action: 'LONG', price: 100, notional: 10_000, sideAfter: 'LONG', entryPriceAfter: 100, realizedPnl: 0, kind: 'OPEN' }, { id: `${gameId}-close`, gameId, t: closeT, action: 'CLOSE', price: 101, notional: 10_000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: pnl, kind: 'CLOSE' }], resultId: gameId, createdAt: Date.now() };
  const result: GameResult = { gameId, playerId: 'p', scenarioId: 's', challengeId: game.challengeId, seasonId: 'S01', runType, mode: game.mode, pair: game.pair, startBalance: 10_000, endBalance: 10_000 + pnl, pnl, roi: pnl / 100, trades: 1, tradeEvents: 2, wins: pnl > 0 ? 1 : 0, losses: pnl < 0 ? 1 : 0, winRate: pnl > 0 ? 100 : 0, holdTimeMs: 1500, maxDrawdownPct: liquidated ? 95 : 0, score: pnl, rank: runType === 'ranked' ? 1 : 0, rankTotal: runType === 'ranked' ? 1 : 0, percentile: 0, durationMs: 45_000, resultState: 'PROFITABLE', liquidated, verified: true, createdAt: Date.now() };
  return { game, result };
}

describe('derived achievements', () => {
  it('awards ranked one-shot and paper-hands, but excludes non-ranked equivalents', () => {
    const ranked = fixture();
    const practice = fixture('practice');
    const stats = emptyStats();
    const earned = deriveAchievements([ranked.game], [ranked.result], stats).badges;
    const excluded = deriveAchievements([practice.game], [practice.result], stats).badges;
    expect(earned.find((badge) => badge.id === 'one-shot')?.earned).toBe(true);
    expect(earned.find((badge) => badge.id === 'paper-hands')?.earned).toBe(true);
    expect(excluded.some((badge) => badge.earned)).toBe(false);
  });

  it('requires a profitable ranked flip for reversal and rejects liquidation for survivor', () => {
    const run = fixture();
    run.game.trades.splice(1, 0, { ...run.game.trades[0], id: 'flip', action: 'CLOSE', kind: 'FLIP_CLOSE', t: 3000 });
    run.game.trades.splice(2, 0, { ...run.game.trades[0], id: 'flip-open', action: 'SHORT', kind: 'OPEN', sideAfter: 'SHORT', entryPriceAfter: 101, t: 3000 });
    const liquidated = fixture('ranked', true, -100);
    const stats = emptyStats();
    const earned = deriveAchievements([run.game], [run.result], stats).badges;
    const dead = deriveAchievements([liquidated.game], [liquidated.result], stats).badges;
    expect(earned.find((badge) => badge.id === 'reversal')?.earned).toBe(true);
    expect(dead.find((badge) => badge.id === 'survivor')?.earned).toBe(false);
  });

  it('uses exact paper-hands boundary and does not infer reversal from a plain close', () => {
    const atBoundary = deriveAchievements([fixture().game], [fixture().result], emptyStats()).badges;
    const afterBoundary = deriveAchievements([fixture('ranked', false, 100, 2001).game], [fixture('ranked', false, 100, 2001).result], emptyStats()).badges;
    expect(atBoundary.find((badge) => badge.id === 'paper-hands')?.earned).toBe(true);
    expect(afterBoundary.find((badge) => badge.id === 'paper-hands')?.earned).toBe(false);
    const plain = fixture();
    plain.game.trades[1].kind = 'CLOSE';
    expect(deriveAchievements([plain.game], [plain.result], emptyStats()).badges.find((badge) => badge.id === 'reversal')?.earned).toBe(false);
  });

  it('recomputes identically and tracks five surviving ranked runs', () => {
    const runs = Array.from({ length: 5 }, () => fixture());
    const stats = emptyStats();
    const first = deriveAchievements(runs.map((run) => run.game), runs.map((run) => run.result), stats);
    const second = deriveAchievements(runs.map((run) => run.game), runs.map((run) => run.result), stats);
    expect(first).toEqual(second);
    expect(first.badges.find((badge) => badge.id === 'wick-whisperer')?.earned).toBe(true);
  });
});
