import { describe, it, expect } from 'vitest';
import { buildScenario, priceAt } from './scenario';
import { applyTrade, equityAt, positionFromTrades, TradeRejected } from './engine';
import type { Game } from '@/lib/types';

function mkGame(): Game {
  const now = Date.now();
  return {
    id: 'g_test',
    playerId: 'p_test',
    challengeId: 'S01-2026-09-20',
    scenarioId: 'scn-test',
    seasonId: 'S01',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: now,
    endsAt: now + 45_000,
    startBalance: 10_000,
    status: 'LIVE',
    trades: [],
    createdAt: now,
  };
}

describe('engine', () => {
  it('opens, tracks, and closes a long with correct pnl', () => {
    const s = buildScenario({ scenarioId: 'scn-test', seed: 'scn-test' });
    const g = mkGame();
    const entry = priceAt(s, 1000);
    g.trades.push(...applyTrade(g, s, 'LONG', 1000));
    expect(positionFromTrades(g.trades).side).toBe('LONG');
    const exit = priceAt(s, 5000);
    g.trades.push(...applyTrade(g, s, 'CLOSE', 5000));
    const expected = 10_000 * 10 * ((exit - entry) / entry);
    const snap = equityAt(g, s, 5000);
    expect(snap.realized).toBeCloseTo(expected, 6);
    expect(snap.side).toBe('FLAT');
  });

  it('rejects invalid sequences', () => {
    const s = buildScenario({ scenarioId: 'scn-test', seed: 'scn-test' });
    const g = mkGame();
    expect(() => applyTrade(g, s, 'CLOSE', 1000)).toThrowError(TradeRejected);
    g.trades.push(...applyTrade(g, s, 'SHORT', 1000));
    expect(() => applyTrade(g, s, 'SHORT', 2000)).toThrowError(TradeRejected);
    expect(() => applyTrade(g, s, 'LONG', 99_999)).toThrowError(TradeRejected);
  });

  it('supports flips as close+open at one price', () => {
    const s = buildScenario({ scenarioId: 'scn-test', seed: 'scn-test' });
    const g = mkGame();
    g.trades.push(...applyTrade(g, s, 'LONG', 1000));
    const evs = applyTrade(g, s, 'SHORT', 3000);
    expect(evs).toHaveLength(2);
    expect(evs[0].kind).toBe('FLIP_CLOSE');
    g.trades.push(...evs);
    expect(positionFromTrades(g.trades).side).toBe('SHORT');
  });
});
