import { describe, expect, it } from 'vitest';
import { emptyStats, type DbShape } from '@/lib/store/db';
import { buildScenario } from './scenario';
import { finalizeLocked } from './finish';
import type { Game } from '@/lib/types';

function emptyDb(): DbShape {
  return {
    version: 1,
    players: {},
    usernames: {},
    stats: {},
    games: {},
    results: {},
    cards: {},
    challenges: {},
    nonces: {},
    analytics: [],
  };
}

function makeGame(runType: Game['runType']): Game {
  const now = Date.now();
  return {
    id: `g_${runType}`,
    playerId: 'p_test',
    challengeId: 'S01-2026-09-21',
    scenarioId: 'scn-test',
    seasonId: 'S01',
    runType,
    mode: runType === 'practice' ? 'PRACTICE' : 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: now,
    endsAt: now + 45_000,
    startBalance: 10_000,
    status: 'LIVE',
    trades: [],
    createdAt: now,
  };
}

describe('finalizeLocked run eligibility', () => {
  it('keeps practice results out of ranked stats and placement', () => {
    const db = emptyDb();
    db.stats.p_test = emptyStats();
    const game = makeGame('practice');
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });

    const result = finalizeLocked(db, game, scenario, scenario.durationMs, false);

    expect(result.runType).toBe('practice');
    expect(result.rank).toBe(0);
    expect(result.rankTotal).toBe(0);
    expect(result.percentile).toBe(0);
    expect(db.stats.p_test.games).toBe(0);
    expect(db.stats.p_test.currentStreak).toBe(0);
    expect(db.stats.p_test.history).toHaveLength(0);
  });

  it('keeps challenge finalization out of ranked stats and placement', () => {
    const db = emptyDb();
    db.stats.p_test = emptyStats();
    const game = makeGame('challenge');
    game.challengeCode = 'ch_test';
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });

    const result = finalizeLocked(db, game, scenario, scenario.durationMs, true);

    expect(result.runType).toBe('challenge');
    expect(result.rank).toBe(0);
    expect(result.rankTotal).toBe(0);
    expect(db.stats.p_test.games).toBe(0);
    expect(db.stats.p_test.currentStreak).toBe(0);
    expect(db.stats.p_test.bestScore).toBe(0);
  });

  it('keeps onboarding finalization out of competitive progression', () => {
    const db = emptyDb();
    db.stats.p_test = emptyStats();
    const game = makeGame('onboarding');
    game.challengeId = 'onboarding-v1';
    game.scenarioId = 'scn-onboarding-v1';
    game.mode = 'ONBOARDING';
    const scenario = buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId });

    const result = finalizeLocked(db, game, scenario, scenario.durationMs, false);

    expect(result.runType).toBe('onboarding');
    expect(result.rank).toBe(0);
    expect(result.rankTotal).toBe(0);
    expect(db.stats.p_test.games).toBe(0);
    expect(db.stats.p_test.history).toHaveLength(0);
  });
});
