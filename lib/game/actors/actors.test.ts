import { describe, it, expect } from 'vitest';
import {
  generateMarketActorPlan,
  sampleActorCount,
  summarizeMarketActors,
  ALL_ACTOR_IDS,
} from './plan';
import { buildScenario, buildLegacyScenario } from '../scenario';
import { regimeForDay, REGIMES } from '../regime';
import { scenarioForGame, computeTick } from '../tick';
import { analyzeMarketDiagnostics } from './diagnostics';
import { withDb } from '@/lib/store/db';
import type { Game } from '@/lib/types';

describe('Market Actors System v1', () => {
  it('Determinism: same seed produces identical actor plan', () => {
    const planA = generateMarketActorPlan({ seed: 'test-seed-2026-09-25' });
    const planB = generateMarketActorPlan({ seed: 'test-seed-2026-09-25' });

    expect(planA.actorCount).toBe(planB.actorCount);
    expect(planA.events.length).toBe(planB.events.length);
    expect(planA.events).toEqual(planB.events);
  });

  it('Cross-player fairness: same UTC day produces identical plan and identical price path', () => {
    const gamePlayerA: Game = {
      id: 'g_p1',
      playerId: 'p1',
      challengeId: 'S01-2026-09-25',
      scenarioId: 'scn-S01-2026-09-25',
      seasonId: 'S01',
      runType: 'ranked',
      regimeId: 'trending-tape',
      regimeVersion: 1,
      marketActorsVersion: 'v1',
      leverage: 10,
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: 0,
    };

    const gamePlayerB: Game = {
      ...gamePlayerA,
      id: 'g_p2',
      playerId: 'p2',
    };

    const scenarioA = scenarioForGame(gamePlayerA);
    const scenarioB = scenarioForGame(gamePlayerB);

    expect(scenarioA.prices).toEqual(scenarioB.prices);
    expect(scenarioA.marketActorsVersion).toBe('v1');
    expect(scenarioB.marketActorsVersion).toBe('v1');
  });

  it('Actor count: only valid counts (2, 3, 4, 5) are generated', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const plan = generateMarketActorPlan({ seed: `count-seed-${i}` });
      expect([2, 3, 4, 5]).toContain(plan.actorCount);
      expect(plan.events.length).toBe(plan.actorCount);
      counts.add(plan.actorCount);
    }
    // Across 200 samples, all 4 counts (2, 3, 4, 5) should appear
    expect(counts.has(2)).toBe(true);
    expect(counts.has(3)).toBe(true);
    expect(counts.has(4)).toBe(true);
    expect(counts.has(5)).toBe(true);
  });

  it('Actor uniqueness: no duplicate actor type in any plan', () => {
    for (let i = 0; i < 100; i++) {
      const plan = generateMarketActorPlan({ seed: `unique-seed-${i}` });
      const ids = plan.events.map((e) => e.actorId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it('Actor variant determinism: same seed produces identical variants', () => {
    const planA = generateMarketActorPlan({ seed: 'variant-test' });
    const planB = generateMarketActorPlan({ seed: 'variant-test' });
    expect(planA.events.map((e) => e.variant)).toEqual(planB.events.map((e) => e.variant));
  });

  it('Timing determinism: same seed produces identical start and end times', () => {
    const planA = generateMarketActorPlan({ seed: 'timing-test' });
    const planB = generateMarketActorPlan({ seed: 'timing-test' });
    for (let i = 0; i < planA.events.length; i++) {
      expect(planA.events[i].startMs).toBe(planB.events[i].startMs);
      expect(planA.events[i].endMs).toBe(planB.events[i].endMs);
      expect(planA.events[i].durationMs).toBe(planB.events[i].durationMs);
    }
  });

  it('Timing constraints: first actor never starts at exactly 0ms and round has controlled overlap', () => {
    for (let i = 0; i < 50; i++) {
      const plan = generateMarketActorPlan({ seed: `timing-constraints-${i}` });
      expect(plan.events[0].startMs).toBeGreaterThan(0);
      expect(plan.events[plan.events.length - 1].endMs).toBeLessThanOrEqual(45_000);
      for (const e of plan.events) {
        expect(e.durationMs).toBeGreaterThanOrEqual(3_000);
      }
    }
  });

  it('Reproducibility: scenario reconstruction produces exactly the original price path', () => {
    const spec = {
      scenarioId: 'repro-test',
      seed: 'repro-test',
      regime: regimeForDay('2026-09-25'),
      marketActorsVersion: 'v1',
    };
    const s1 = buildScenario(spec);
    const s2 = buildScenario(spec);
    expect(s1.prices).toEqual(s2.prices);
  });

  it('Leverage invariance: leverage does not change market path', () => {
    const regime = regimeForDay('2026-09-25');
    const baseGame: Omit<Game, 'id' | 'playerId' | 'leverage' | 'runType'> = {
      challengeId: 'S01-2026-09-25',
      scenarioId: 'scn-S01-2026-09-25',
      seasonId: 'S01',
      regimeId: regime.id,
      regimeVersion: regime.version,
      marketActorsVersion: 'v1',
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: 0,
    };

    const g1x = { ...baseGame, id: 'g1', playerId: 'p1', leverage: 1 as const, runType: 'practice' as const };
    const g5x = { ...baseGame, id: 'g2', playerId: 'p2', leverage: 5 as const, runType: 'practice' as const };
    const g10x = { ...baseGame, id: 'g3', playerId: 'p3', leverage: 10 as const, runType: 'ranked' as const };
    const g20x = { ...baseGame, id: 'g4', playerId: 'p4', leverage: 20 as const, runType: 'practice' as const };

    const p1x = scenarioForGame(g1x).prices;
    const p5x = scenarioForGame(g5x).prices;
    const p10x = scenarioForGame(g10x).prices;
    const p20x = scenarioForGame(g20x).prices;

    expect(p1x).toEqual(p5x);
    expect(p5x).toEqual(p10x);
    expect(p10x).toEqual(p20x);
  });

  it('Regime compatibility: actor generation works with all existing regimes', () => {
    for (const regime of REGIMES) {
      const scenario = buildScenario({
        scenarioId: `scn-${regime.id}`,
        seed: `seed-${regime.id}`,
        regime,
        marketActorsVersion: 'v1',
      });

      expect(scenario.prices).toHaveLength(451);
      expect(scenario.prices.every(Number.isFinite)).toBe(true);
      expect(scenario.prices.every((p) => p > 0)).toBe(true);
      expect(scenario.regimeId).toBe(regime.id);
      expect(scenario.regimeVersion).toBe(regime.version);
      expect(scenario.marketActorsVersion).toBe('v1');
    }
  });

  it('Legacy compatibility: legacy scenario records without actors continue using the legacy generator', () => {
    const legacy = buildLegacyScenario({
      scenarioId: 'legacy-test',
      seed: 'legacy-test',
    });
    expect(legacy.marketActorsVersion).toBeUndefined();

    // Calling buildScenario with 'legacy' or with undefined regime+marketActorsVersion triggers legacy path
    const buildLegacyViaParam = buildScenario({
      scenarioId: 'legacy-test',
      seed: 'legacy-test',
      marketActorsVersion: 'legacy',
    });
    expect(buildLegacyViaParam.prices).toEqual(legacy.prices);
  });

  it('Sanity guards: invalid or extreme scenarios are rejected or rerolled', () => {
    for (let i = 0; i < 20; i++) {
      const scenario = buildScenario({
        scenarioId: `safety-check-${i}`,
        seed: `safety-check-${i}`,
        regime: regimeForDay(`2026-09-${String(10 + (i % 20)).padStart(2, '0')}`),
        marketActorsVersion: 'v1',
      });
      const diag = analyzeMarketDiagnostics(scenario.prices, scenario.startingPrice);
      expect(scenario.prices.every(Number.isFinite)).toBe(true);
      expect(scenario.prices.every((p) => p > 0)).toBe(true);
      expect(diag.maxExcursion).toBeLessThan(2.5);
      expect(diag.perTickMovementMax).toBeLessThan(0.08);
    }
  });

  it('Security: active game tick snapshots NEVER leak actor plan metadata', async () => {
    const game: Game = {
      id: 'g_active_leak_test',
      playerId: 'p_sec_test',
      challengeId: 'S01-2026-09-25',
      scenarioId: 'scn-S01-2026-09-25',
      seasonId: 'S01',
      runType: 'ranked',
      regimeId: 'flash-crash',
      regimeVersion: 1,
      marketActorsVersion: 'v1',
      leverage: 10,
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      startsAt: Date.now() - 10_000, // 10s into game
      endsAt: Date.now() + 35_000,
      startBalance: 10_000,
      status: 'LIVE',
      trades: [],
      createdAt: Date.now() - 10_000,
    };

    const snap = await withDb((db) => {
      db.games[game.id] = game;
      return computeTick(db, game, Date.now(), false);
    });

    const snapKeys = Object.keys(snap);
    expect(snapKeys).not.toContain('actors');
    expect(snapKeys).not.toContain('marketActors');
    expect(snapKeys).not.toContain('actorPlan');
    expect(snapKeys).not.toContain('marketActivity');
    expect(JSON.stringify(snap)).not.toMatch(/jeets|cabal|whale|sniper|paper_hands|bot_flow/);
  });

  it('Completed reveal: public summary contains actors with display names and roles', () => {
    const plan = generateMarketActorPlan({ seed: 'reveal-test-seed' });
    const summary = summarizeMarketActors(plan);

    expect(summary.actorCount).toBe(plan.actorCount);
    expect(summary.actors.length).toBe(plan.actorCount);
    for (const actor of summary.actors) {
      expect(ALL_ACTOR_IDS).toContain(actor.id);
      expect(actor.name).toBeTruthy();
      expect(actor.variantName).toBeTruthy();
      expect(actor.role).toBeTruthy();
    }
  });

  it('Challenge reconstruction: challenge inherits source actor context', () => {
    const sourceGame: Game = {
      id: 'g_challenger',
      playerId: 'p_src',
      challengeId: 'S01-2026-09-25',
      scenarioId: 'scn-S01-2026-09-25',
      seasonId: 'S01',
      runType: 'ranked',
      regimeId: 'chop-city',
      regimeVersion: 1,
      marketActorsVersion: 'v1',
      leverage: 10,
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'FINISHED',
      trades: [],
      createdAt: 0,
    };

    const challengeOpponentGame: Game = {
      id: 'g_opponent',
      playerId: 'p_opp',
      challengeId: sourceGame.challengeId,
      scenarioId: sourceGame.scenarioId,
      seasonId: sourceGame.seasonId,
      runType: 'challenge',
      challengeCode: 'ch_test_123',
      regimeId: sourceGame.regimeId,
      regimeVersion: sourceGame.regimeVersion,
      marketActorsVersion: sourceGame.marketActorsVersion,
      leverage: sourceGame.leverage,
      mode: 'CHALLENGE',
      pair: sourceGame.pair,
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: 0,
    };

    const sourceScenario = scenarioForGame(sourceGame);
    const opponentScenario = scenarioForGame(challengeOpponentGame);

    expect(opponentScenario.prices).toEqual(sourceScenario.prices);
    expect(opponentScenario.marketActorsVersion).toBe(sourceScenario.marketActorsVersion);
  });

  it('Ghost reconstruction: ghost run inherits source actor context', () => {
    const sourceRankedGame: Game = {
      id: 'g_ghost_source',
      playerId: 'p_ghost_src',
      challengeId: 'S01-2026-09-25',
      scenarioId: 'scn-S01-2026-09-25',
      seasonId: 'S01',
      runType: 'ranked',
      regimeId: 'dead-cat-bounce',
      regimeVersion: 1,
      marketActorsVersion: 'v1',
      leverage: 10,
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'FINISHED',
      trades: [],
      createdAt: 0,
    };

    const ghostDuelGame: Game = {
      id: 'g_ghost_duel',
      playerId: 'p_player',
      challengeId: sourceRankedGame.challengeId,
      scenarioId: sourceRankedGame.scenarioId,
      seasonId: sourceRankedGame.seasonId,
      runType: 'ghost',
      ghostSourceGameId: sourceRankedGame.id,
      regimeId: sourceRankedGame.regimeId,
      regimeVersion: sourceRankedGame.regimeVersion,
      marketActorsVersion: sourceRankedGame.marketActorsVersion,
      leverage: sourceRankedGame.leverage,
      mode: 'GHOST DUEL',
      pair: sourceRankedGame.pair,
      startsAt: 0,
      endsAt: 45_000,
      startBalance: 10_000,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: 0,
    };

    const sourceScenario = scenarioForGame(sourceRankedGame);
    const ghostScenario = scenarioForGame(ghostDuelGame);

    expect(ghostScenario.prices).toEqual(sourceScenario.prices);
    expect(ghostScenario.marketActorsVersion).toBe(sourceScenario.marketActorsVersion);
  });

  it('Narrative metrics: differentiates major decision points from minor tactical swings', () => {
    const scenario = buildScenario({
      scenarioId: 'narrative-test-1',
      seed: 'narrative-test-1',
      regime: regimeForDay('2026-09-22'),
      marketActorsVersion: 'v1',
    });
    const plan = generateMarketActorPlan({ seed: 'narrative-test-1' });
    const diag = analyzeMarketDiagnostics(scenario.prices, scenario.startingPrice, plan);

    expect(diag.majorReversalCount).toBeGreaterThanOrEqual(1);
    expect(diag.minorReversalCount).toBeGreaterThanOrEqual(diag.majorReversalCount);
    expect(diag.directionalSegments).toBe(diag.minorReversalCount + 1);
    expect(diag.actorOverlapDurationMs).toBeGreaterThanOrEqual(0);
    expect(diag.dominantDirectionDurationMs).toBeGreaterThan(0);
  });
});
