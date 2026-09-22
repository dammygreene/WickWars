import { describe, expect, it } from 'vitest';
import { challengeForDay } from './challenge';
import { buildScenario } from './scenario';
import { publicRegime, regimeForDay, REGIMES } from './regime';
import { scenarioForGame } from './tick';
import type { Game } from '@/lib/types';

function dailyGame(playerId: string): Game {
  const regime = regimeForDay('2026-09-22');
  return { id: `g_${playerId}`, playerId, challengeId: 'S01-2026-09-22', scenarioId: 'scn-S01-2026-09-22', seasonId: 'S01', runType: 'ranked', regimeId: regime.id, regimeVersion: regime.version, mode: 'DAILY WICK', pair: 'WICK/USD', startsAt: 0, endsAt: 45_000, startBalance: 10_000, status: 'COUNTDOWN', trades: [], createdAt: 0 };
}

describe('market regimes', () => {
  it('resolves the same UTC date deterministically', () => {
    expect(regimeForDay('2026-09-22')).toEqual(regimeForDay('2026-09-22'));
    expect(challengeForDay('2026-09-22').regime).toEqual(publicRegime(regimeForDay('2026-09-22')));
  });

  it('keeps the curated rotation versioned and bounded', () => {
    expect(REGIMES.length).toBe(4);
    for (const regime of REGIMES) {
      expect(regime.version).toBe(1);
      expect(regime.volatilityScale).toBeGreaterThan(0.7);
      expect(regime.volatilityScale).toBeLessThan(1.4);
      expect(regime.reversalScale).toBeGreaterThan(0.7);
      expect(regime.reversalScale).toBeLessThan(1.5);
    }
  });

  it('gives same-day players identical regime and scenario identity', () => {
    const playerA = dailyGame('a');
    const playerB = dailyGame('b');
    const scenarioA = scenarioForGame(playerA);
    const scenarioB = scenarioForGame(playerB);
    expect(playerA.regimeId).toBe(playerB.regimeId);
    expect(playerA.regimeVersion).toBe(playerB.regimeVersion);
    expect(playerA.scenarioId).toBe(playerB.scenarioId);
    expect(scenarioA.prices.slice(0, 2)).toEqual(scenarioB.prices.slice(0, 2));
  });

  it('keeps legacy games on the pre-regime generator path', () => {
    const legacy = dailyGame('legacy');
    delete legacy.regimeId;
    delete legacy.regimeVersion;
    const scenario = scenarioForGame(legacy);
    expect(scenario.regimeId).toBeUndefined();
    expect(scenario.regimeVersion).toBeUndefined();
  });

  it('publishes only safe presentation metadata', () => {
    const publicValue = publicRegime(regimeForDay('2026-09-22'));
    expect(publicValue).toEqual({ id: expect.any(String), version: 1, name: expect.any(String), description: expect.any(String) });
    expect(Object.keys(publicValue)).not.toContain('volatilityScale');
    expect(Object.keys(publicValue)).not.toContain('reversalScale');
  });

  it('preserves deterministic scenario validity for every regime', () => {
    for (const regime of REGIMES) {
      const scenario = buildScenario({ scenarioId: `scn-${regime.id}`, seed: `seed-${regime.id}`, regime });
      expect(scenario.prices).toHaveLength(451);
      expect(scenario.prices.every(Number.isFinite)).toBe(true);
      expect(scenario.prices.every((price) => price > 0)).toBe(true);
      expect(scenario.regimeId).toBe(regime.id);
      expect(scenario.regimeVersion).toBe(1);
    }
  });

  it('keeps representative excursions within broad product safety bounds', () => {
    for (const regime of REGIMES) {
      const scenario = buildScenario({ scenarioId: `balance-${regime.id}`, seed: `balance-${regime.id}`, regime });
      const excursion = Math.max(...scenario.prices) / Math.min(...scenario.prices);
      const maxTickMove = Math.max(...scenario.prices.slice(1).map((price, index) => Math.abs(price / scenario.prices[index] - 1)));
      expect(excursion).toBeLessThan(2.5);
      expect(maxTickMove).toBeLessThan(0.08);
    }
  });
});
