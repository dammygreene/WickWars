import type { MarketScenario } from '@/lib/types';

export const ONBOARDING_SCENARIO_ID = 'scn-onboarding-v1';
export const ONBOARDING_CHALLENGE_ID = 'onboarding-v1';
export const ONBOARDING_DURATION_MS = 20_000;

/** Fixed teaching path: gentle lift, reversal, then a sharp danger leg. */
export function buildOnboardingScenario(): MarketScenario {
  const prices: number[] = [];
  const ticks = ONBOARDING_DURATION_MS / 100;
  for (let i = 0; i <= ticks; i++) {
    const t = i * 100;
    let price: number;
    if (t <= 4_000) price = 100 + (t / 4_000) * 2;
    else if (t <= 8_000) price = 102 - ((t - 4_000) / 4_000) * 1;
    else if (t <= 17_000) price = 101 - ((t - 8_000) / 9_000) * 14;
    else price = 87 + ((t - 17_000) / 3_000) * 2;
    prices.push(Number(price.toFixed(4)));
  }
  return {
    id: ONBOARDING_SCENARIO_ID,
    symbol: 'WICK',
    pair: 'WICK/USD',
    durationMs: ONBOARDING_DURATION_MS,
    startingPrice: 100,
    tickMs: 100,
    prices,
    seed: ONBOARDING_SCENARIO_ID,
    difficulty: 3,
    seasonId: 'ONBOARDING',
  };
}