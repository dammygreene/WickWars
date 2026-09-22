import { describe, expect, it } from 'vitest';
import { computeTick, scenarioForGame } from './tick';
import { buildScenario } from './scenario';
import { isRankedRun } from '@/lib/store/db';
import type { DbShape, } from '@/lib/store/db';
import type { Game, GameResult } from '@/lib/types';

function db(): DbShape {
  return { version: 1, players: {}, usernames: {}, stats: {}, games: {}, results: {}, cards: {}, challenges: {}, nonces: {}, analytics: [] };
}
function source(): Game {
  return { id: 'g_source', playerId: 'p_source', challengeId: 'S01-2026-09-22', scenarioId: 'scn-S01-2026-09-22', seasonId: 'S01', runType: 'ranked', mode: 'DAILY WICK', pair: 'WICK/USD', startsAt: 0, endsAt: 45_000, startBalance: 10_000, status: 'FINISHED', trades: [{ id: 't1', gameId: 'g_source', t: 10_000, action: 'LONG', price: 100, notional: 10_000, sideAfter: 'LONG', entryPriceAfter: 100, realizedPnl: 0, kind: 'OPEN' }], resultId: 'g_source', createdAt: 0 };
}
function ghost(): Game {
  return { ...source(), id: 'g_ghost', playerId: 'p_ghost', runType: 'ghost', mode: 'GHOST DUEL', ghostSourceGameId: 'g_source', status: 'LIVE', resultId: undefined, trades: [] };
}

describe('ghost duel security', () => {
  it('does not expose future source actions before their timestamp', () => {
    const state = db();
    const sourceGame = source();
    const ghostGame = ghost();
    state.games[sourceGame.id] = sourceGame;
    state.games[ghostGame.id] = ghostGame;
    const scenario = scenarioForGame(ghostGame);
    const before = computeTick(state, ghostGame, 5_000, false);
    const after = computeTick(state, ghostGame, 10_000, false);
    expect(before.ghostEvents).toHaveLength(0);
    expect(after.ghostEvents).toHaveLength(1);
    expect(after.ghostEvents[0].t).toBe(10_000);
  });

  it('keeps ghost runs non-ranked', () => {
    expect(isRankedRun(ghost())).toBe(false);
  });

  it('requires exact scenario identity for a source', () => {
    const sourceScenario = scenarioForGame(source());
    const ghostScenario = scenarioForGame(ghost());
    expect(ghostScenario.id).toBe(sourceScenario.id);
    expect(ghostScenario.prices).toEqual(sourceScenario.prices);
    expect(buildScenario({ scenarioId: 'different', seed: 'different' }).prices).not.toEqual(sourceScenario.prices);
  });
});
