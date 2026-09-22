import { describe, expect, it } from 'vitest';
import { buildOnboardingScenario, ONBOARDING_DURATION_MS, ONBOARDING_SCENARIO_ID } from './onboarding';
import { scenarioForGame } from './tick';
import type { Game } from '@/lib/types';

function onboardingGame(): Game {
  return {
    id: 'g_onboarding', playerId: 'p_new', challengeId: 'onboarding-v1', scenarioId: ONBOARDING_SCENARIO_ID,
    seasonId: 'ONBOARDING', runType: 'onboarding', mode: 'ONBOARDING', pair: 'WICK/USD', startsAt: 0,
    endsAt: ONBOARDING_DURATION_MS, startBalance: 10_000, status: 'LIVE', trades: [], createdAt: 0,
  };
}

describe('scripted onboarding scenario', () => {
  it('is deterministic, short, and distinct from the daily scenario pathway', () => {
    const first = buildOnboardingScenario();
    const second = buildOnboardingScenario();
    expect(first.id).toBe(ONBOARDING_SCENARIO_ID);
    expect(first.durationMs).toBe(20_000);
    expect(first.prices).toEqual(second.prices);
    expect(scenarioForGame(onboardingGame()).id).toBe(ONBOARDING_SCENARIO_ID);
    expect(scenarioForGame(onboardingGame()).durationMs).toBe(ONBOARDING_DURATION_MS);
  });

  it('reveals a favorable opening and a later reversal', () => {
    const scenario = buildOnboardingScenario();
    expect(scenario.prices[40]).toBeGreaterThan(scenario.prices[0]);
    expect(scenario.prices[170]).toBeLessThan(scenario.prices[40]);
  });
});
