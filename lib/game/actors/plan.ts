import { prngFromSeed } from '../scenario';
import type { RegimeConfig } from '../regime';
import type {
  MarketActorEvent,
  MarketActorId,
  MarketActorPlan,
  MarketActorVariant,
  PublicMarketActorSummary,
} from './types';

export const ALL_ACTOR_IDS: readonly MarketActorId[] = [
  'whale',
  'sniper',
  'jeets',
  'cabal',
  'paper_hands',
  'bot_flow',
];

export const ACTOR_DISPLAY_NAMES: Record<MarketActorId, string> = {
  jeets: 'JEETS',
  cabal: 'CABAL',
  whale: 'WHALE',
  sniper: 'SNIPER',
  paper_hands: 'PAPER HANDS',
  bot_flow: 'BOT FLOW',
};

export const ACTOR_ROLES: Record<MarketActorId, string> = {
  jeets: 'Violent cascade & panic exits',
  cabal: 'Coordinated pump & distribution traps',
  whale: 'High-conviction absorption & accumulation',
  sniper: 'Key liquidity sweeps & false breaks',
  paper_hands: 'Premature capitulation & relief runs',
  bot_flow: 'Algorithmic chop & momentum flips',
};

export const VARIANT_DISPLAY_NAMES: Record<MarketActorVariant, string> = {
  // jeets
  panic_sell: 'PANIC SELL',
  failed_bounce: 'FAILED BOUNCE',
  cascade: 'CASCADE',
  // cabal
  pump_and_dump: 'PUMP & DUMP',
  cabal_fake_breakout: 'FAKE BREAKOUT',
  accumulate_then_distribute: 'ACCUMULATE & DISTRIBUTE',
  // whale
  accumulation: 'ACCUMULATION',
  absorption: 'ABSORPTION',
  distribution: 'DISTRIBUTION',
  dump: 'DUMP',
  // sniper
  high_sweep: 'HIGH SWEEP',
  low_sweep: 'LOW SWEEP',
  sniper_fake_breakout: 'FALSE BREAKOUT',
  fake_breakdown: 'FALSE BREAKDOWN',
  // paper hands
  panic_dump: 'PANIC DUMP',
  panic_bounce: 'PANIC BOUNCE',
  capitulation: 'CAPITULATION',
  relief_rally: 'RELIEF RALLY',
  // bot flow
  chop: 'CHOP',
  momentum_flip: 'MOMENTUM FLIP',
  mean_reversion: 'MEAN REVERSION',
  whipsaw: 'WHIPSAW',
};

const ACTOR_VARIANTS: Record<MarketActorId, readonly MarketActorVariant[]> = {
  jeets: ['panic_sell', 'failed_bounce', 'cascade'],
  cabal: ['pump_and_dump', 'cabal_fake_breakout', 'accumulate_then_distribute'],
  whale: ['accumulation', 'absorption', 'distribution', 'dump'],
  sniper: ['high_sweep', 'low_sweep', 'sniper_fake_breakout', 'fake_breakdown'],
  paper_hands: ['panic_dump', 'panic_bounce', 'capitulation', 'relief_rally'],
  bot_flow: ['chop', 'momentum_flip', 'mean_reversion', 'whipsaw'],
};

/**
 * Weighted actor count:
 * 2 = 35%
 * 3 = 40%
 * 4 = 20%
 * 5 = 5%
 */
export function sampleActorCount(rand: () => number): number {
  const r = rand();
  if (r < 0.35) return 2;
  if (r < 0.75) return 3;
  if (r < 0.95) return 4;
  return 5;
}

/**
 * Deterministically generates a plan of market actors for a 45-second round.
 */
export function generateMarketActorPlan(options: {
  seed: string;
  durationMs?: number;
  regime?: RegimeConfig;
}): MarketActorPlan {
  const durationMs = options.durationMs ?? 45_000;
  const rand = prngFromSeed(`wickwars:actors:v1:${options.seed}`);

  const actorCount = sampleActorCount(rand);

  // Fisher-Yates shuffle to pick unique actors
  const pool = [...ALL_ACTOR_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const selectedActors = pool.slice(0, actorCount);

  // We assign non-uniform, staggered start times across the 45s round.
  // First actor starts between 1.2s and 3.5s (never exactly 0ms).
  // Final actor must finish before durationMs, with enough time to matter (lasts at least 4s).
  // Controlled overlap is allowed and encouraged.
  const timeWindows: Array<{ startMin: number; startMax: number; durMin: number; durMax: number }> = [];

  // Duration budget tailored to actor count
  // E.g., for 3 actors across 45s:
  // slot 0: start ~1.5 - 3.5s, dur 10 - 16s
  // slot 1: start ~13 - 18s, dur 10 - 15s (overlaps with slot 0)
  // slot 2: start ~26 - 32s, dur 9 - 13s
  const availableSpan = durationMs - 5_000; // leaves 5s margin
  const segment = availableSpan / actorCount;

  for (let i = 0; i < actorCount; i++) {
    const baseStart = 1_500 + i * segment;
    // Window allows controlled overlap: start can be slightly before previous ends
    const durMin = 6_000;
    const durMax = 14_000;
    timeWindows.push({
      startMin: baseStart,
      startMax: baseStart + segment * 0.45,
      durMin,
      durMax,
    });
  }

  const events: MarketActorEvent[] = [];

  for (let i = 0; i < actorCount; i++) {
    const actorId = selectedActors[i];
    const variants = ACTOR_VARIANTS[actorId];
    const variant = variants[Math.floor(rand() * variants.length)];

    // Timing with jitter
    const win = timeWindows[i];
    const jitter = rand();
    const rawStart = win.startMin + jitter * (win.startMax - win.startMin);
    // Round to one decimal place in seconds (e.g. 1.8s => 1800ms) with non-round offsets
    const startMs = Math.round(rawStart / 100) * 100 + (Math.floor(rand() * 8) * 10);

    // Actor-specific duration bounds
    let baseDurMin = win.durMin;
    let baseDurMax = win.durMax;
    if (actorId === 'sniper' || actorId === 'bot_flow') {
      baseDurMin = Math.max(4_000, baseDurMin - 2_000);
      baseDurMax = Math.max(6_000, baseDurMax - 3_000);
    } else if (actorId === 'whale' || actorId === 'cabal') {
      baseDurMin = baseDurMin + 2_000;
      baseDurMax = baseDurMax + 3_000;
    }

    const durationRaw = baseDurMin + rand() * (baseDurMax - baseDurMin);
    let durationMsActor = Math.round(durationRaw / 100) * 100;
    if (startMs + durationMsActor > durationMs - 500) {
      durationMsActor = Math.max(3_500, durationMs - 500 - startMs);
    }
    const endMs = startMs + durationMsActor;

    // Intensity: 0.7 .. 1.35
    const intensity = 0.7 + rand() * 0.65;

    // Direction: actors have tendencies, NOT hardcoded outcomes!
    // JEETS: usually bearish (75%), but can have failed bounce / trap (25% bullish)
    // CABAL: starts bullish pump (70%), or inverse dump cabal (30%)
    // WHALE: 50% accumulation (bullish) vs 50% distribution (bearish)
    // SNIPER: 50% high sweep (bearish reversal) vs 50% low sweep (bullish reversal)
    // PAPER HANDS: 60% panic dump vs 40% panic bounce
    // BOT FLOW: 50% / 50%
    let direction: 1 | -1 = 1;
    const dirRoll = rand();
    switch (actorId) {
      case 'jeets':
        direction = dirRoll < 0.75 ? -1 : 1;
        break;
      case 'cabal':
        direction = dirRoll < 0.7 ? 1 : -1;
        break;
      case 'whale':
        direction = dirRoll < 0.5 ? 1 : -1;
        break;
      case 'sniper':
        direction = dirRoll < 0.5 ? 1 : -1;
        break;
      case 'paper_hands':
        direction = dirRoll < 0.6 ? -1 : 1;
        break;
      case 'bot_flow':
        direction = dirRoll < 0.5 ? 1 : -1;
        break;
    }

    // Additional sub-parameters
    const params: Record<string, number> = {
      reversalSpeed: 0.8 + rand() * 0.5,
      secondaryShock: rand() < 0.4 ? 1 : 0,
      decayRate: 0.7 + rand() * 0.6,
    };

    events.push({
      actorId,
      variant,
      startMs,
      endMs,
      durationMs: durationMsActor,
      intensity,
      direction,
      params,
    });
  }

  // Sort events by start time
  events.sort((a, b) => a.startMs - b.startMs);

  return {
    version: 'v1',
    seed: options.seed,
    actorCount,
    events,
  };
}

export function summarizeMarketActors(plan: MarketActorPlan): PublicMarketActorSummary {
  return {
    actorCount: plan.actorCount,
    actors: plan.events.map((e) => ({
      id: e.actorId,
      name: ACTOR_DISPLAY_NAMES[e.actorId],
      variant: e.variant,
      variantName: VARIANT_DISPLAY_NAMES[e.variant],
      role: ACTOR_ROLES[e.actorId],
    })),
  };
}
