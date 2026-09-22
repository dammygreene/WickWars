import { describe, expect, it } from 'vitest';
import { buildScenario } from './scenario';
import { buildKillCamReplay } from './replay';
import type { Game, GameResult } from '@/lib/types';

function makeGame(runType: Game['runType'] = 'ranked'): Game {
  return {
    id: 'g_replay',
    playerId: 'p_test',
    challengeId: 'S01-2026-09-21',
    scenarioId: 'scn-replay',
    seasonId: 'S01',
    runType,
    mode: runType === 'practice' ? 'PRACTICE' : 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: 0,
    endsAt: 45_000,
    startBalance: 10_000,
    status: 'LIQUIDATED',
    trades: [],
    createdAt: 0,
  };
}

function makeResult(game: Game, liquidated: boolean): GameResult {
  return {
    gameId: game.id,
    playerId: game.playerId,
    scenarioId: game.scenarioId,
    challengeId: game.challengeId,
    seasonId: game.seasonId,
    runType: game.runType,
    mode: game.mode,
    pair: game.pair,
    startBalance: game.startBalance,
    endBalance: liquidated ? 0 : 10_100,
    pnl: liquidated ? -10_000 : 100,
    roi: liquidated ? -100 : 1,
    trades: 0,
    tradeEvents: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    holdTimeMs: 0,
    maxDrawdownPct: 100,
    score: 0,
    rank: liquidated && game.runType === 'practice' ? 0 : 1,
    rankTotal: liquidated && game.runType === 'practice' ? 0 : 1,
    percentile: 0,
    durationMs: 42_000,
    resultState: 'WICKED',
    liquidated,
    verified: true,
    createdAt: 42_000,
  };
}

describe('kill-cam replay data', () => {
  it('returns only the verified liquidation window in chronological order', () => {
    const game = makeGame();
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });
    const replay = buildKillCamReplay(game, makeResult(game, true), scenario);

    expect(replay).not.toBeNull();
    expect(replay!.durationMs).toBe(5_000);
    expect(replay!.frames[0].t).toBe(0);
    expect(replay!.frames.at(-1)?.t).toBe(5_000);
    expect(replay!.frames.every((frame, index, frames) => index === 0 || frame.t >= frames[index - 1].t)).toBe(true);
    expect(replay!.frames.every((frame) => frame.t <= replay!.durationMs)).toBe(true);
  });

  it('does not enable replay for timeout results', () => {
    const game = makeGame();
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });
    expect(buildKillCamReplay(game, makeResult(game, false), scenario)).toBeNull();
  });

  it('supports early liquidation and keeps practice non-ranked', () => {
    const game = makeGame('practice');
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });
    const result = makeResult(game, true);
    result.durationMs = 900;
    result.rank = 0;
    result.rankTotal = 0;

    const replay = buildKillCamReplay(game, result, scenario);

    expect(replay!.durationMs).toBe(900);
    expect(result.runType).toBe('practice');
    expect(result.rank).toBe(0);
  });
});
