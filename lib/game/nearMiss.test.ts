import { describe, expect, it } from 'vitest';
import { nearMissForResult } from './nearMiss';
import type { DbShape } from '@/lib/store/db';
import type { Game, GameResult, MarketScenario } from '@/lib/types';

const scenario: MarketScenario = {
  id: 'scn-test',
  symbol: 'WICK',
  pair: 'WICK/USD',
  durationMs: 100,
  startingPrice: 100,
  tickMs: 100,
  prices: [100, 90.6],
  seed: 'test',
  difficulty: 3,
  seasonId: 'S01',
};

function game(playerId = 'p_current'): Game {
  return {
    id: 'g_current',
    playerId,
    challengeId: 'S01-2026-09-22',
    scenarioId: 'scn-test',
    seasonId: 'S01',
    runType: 'ranked',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: 0,
    endsAt: 100,
    startBalance: 10_000,
    status: 'FINISHED',
    trades: [],
    createdAt: 100,
  };
}

function result(overrides: Partial<GameResult> = {}): GameResult {
  return {
    gameId: 'g_current',
    playerId: 'p_current',
    scenarioId: 'scn-test',
    challengeId: 'S01-2026-09-22',
    seasonId: 'S01',
    runType: 'ranked',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startBalance: 10_000,
    endBalance: 10_000,
    pnl: 0,
    roi: 0,
    trades: 0,
    tradeEvents: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    holdTimeMs: 0,
    maxDrawdownPct: 0,
    score: 982,
    rank: 11,
    rankTotal: 11,
    percentile: 100,
    durationMs: 100,
    resultState: 'PROFITABLE',
    liquidated: false,
    verified: true,
    createdAt: 100,
    ...overrides,
  };
}

function db(results: GameResult[]): DbShape {
  return { version: 1, players: {}, usernames: {}, stats: {}, games: {}, results: Object.fromEntries(results.map((item) => [item.gameId, item])), cards: {}, challenges: {}, nonces: {}, analytics: [] };
}

function leaderboardResults(): GameResult[] {
  return Array.from({ length: 9 }, (_, index) => result({
    gameId: `g_${index}`,
    playerId: `p_${index}`,
    score: 1900 - index * 100,
    createdAt: index,
  }));
}

describe('near-miss result feedback', () => {
  it('reports a meaningful top-10 cutoff', () => {
    const current = result();
    const target = result({ gameId: 'g_target', playerId: 'p_target', score: 1000, createdAt: 20 });
    const miss = nearMissForResult(db([...leaderboardResults(), target, current]), game(), current, scenario);
    expect(miss).toEqual({ type: 'leaderboard_cutoff', targetRank: 10, pointsAway: 18 });
  });

  it('does not invent a cutoff for a small population or rank one', () => {
    const current = result({ score: 2000 });
    expect(nearMissForResult(db([current, result({ gameId: 'g_2', playerId: 'p_2', score: 100 })]), game(), current, scenario)).toBeNull();
    const first = result({ score: 2000, rank: 1 });
    expect(nearMissForResult(db([first, result({ gameId: 'g_2', playerId: 'p_2', score: 100 })]), game(), first, scenario)).toBeNull();
  });

  it('reports a truthful cutoff tie', () => {
    const current = result({ score: 1000, createdAt: 30 });
    const target = result({ gameId: 'g_target', playerId: 'p_target', score: 1000, createdAt: 20 });
    const miss = nearMissForResult(db([...leaderboardResults(), target, current]), game(), current, scenario);
    expect(miss).toEqual({ type: 'leaderboard_tie', targetRank: 10 });
  });

  it('prioritizes cutoff over liquidation and reports exact liquidation equity otherwise', () => {
    const current = result({ liquidated: true, endBalance: 490 });
    expect(nearMissForResult(db([...leaderboardResults(), result({ gameId: 'g_target', playerId: 'p_target', score: 1000, createdAt: 20 }), current]), game(), current, scenario)).toEqual({ type: 'leaderboard_cutoff', targetRank: 10, pointsAway: 18 });
    expect(nearMissForResult(db([current]), game(), current, scenario)).toEqual({ type: 'liquidation_survival', liquidationEquityPercent: 4.9 });
  });

  it('reports survived near-liquidation from the verified trade path', () => {
    const current = result({ endBalance: 100, pnl: 100 });
    const run = game();
    run.trades = [{ id: 't1', gameId: run.id, t: 0, action: 'LONG', price: 100, notional: 10_000, sideAfter: 'LONG', entryPriceAfter: 100, realizedPnl: 0, kind: 'OPEN' }];
    expect(nearMissForResult(db([current]), run, current, scenario)).toEqual({ type: 'near_liquidation', minimumEquityPercent: 6 });
  });

  it('does not produce ranked cutoff data for practice or challenge results', () => {
    const current = result({ runType: 'practice', score: 982 });
    const miss = nearMissForResult(db([...leaderboardResults(), current]), game(), current, scenario);
    expect(miss).toBeNull();
  });
});
