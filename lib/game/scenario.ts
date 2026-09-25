import { createHash } from 'crypto';
import type { Candle, MarketScenario } from '@/lib/types';
import { GAME_DURATION_MS, TICK_MS } from './constants';
import type { RegimeConfig } from './regime';
import {
  generateMarketActorPlan,
  combinedActorInfluence,
  analyzeMarketDiagnostics,
  type MarketActorPlan,
} from './actors';

export { TICK_MS, GAME_DURATION_MS, START_BALANCE, LEVERAGE } from './constants';
export const DEFAULT_MARKET_ACTORS_VERSION = 'v1';

/**
 * Deterministic market scenarios.
 * Same seed => identical price path for every player in the challenge window.
 * The full path is NEVER sent to the client up-front; the server reveals prices
 * progressively via the tick endpoint so future prices can't be inspected.
 */

/** mulberry32 — small deterministic PRNG */
export function prngFromSeed(seed: string): () => number {
  const h = createHash('sha256').update(seed).digest();
  let a = h.readUInt32LE(0) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface ScenarioSpec {
  scenarioId: string;
  seed: string;
  durationMs?: number;
  difficulty?: number; // 1..5
  seasonId?: string;
  pair?: string;
  regime?: RegimeConfig;
  marketActorsVersion?: string;
}

/** Legacy scenario builder without market actors (preserves historical games and pre-actor records). */
export function buildLegacyScenario(spec: ScenarioSpec): MarketScenario {
  const durationMs = spec.durationMs ?? GAME_DURATION_MS;
  const difficulty = Math.min(5, Math.max(1, spec.difficulty ?? 3));
  const rand = prngFromSeed(`wickwars:v1:${spec.seed}`);
  const tickCount = Math.floor(durationMs / TICK_MS);
  const startingPrice = 100;

  const regime = spec.regime;
  const volBase = (0.0011 + difficulty * 0.00045) * (regime?.volatilityScale ?? 1);
  const phases: Array<{ from: number; to: number; drift: number; vol: number }> = [];
  const phaseCount = 3 + Math.floor(rand() * 3);
  let cursor = 0;
  for (let i = 0; i < phaseCount; i++) {
    const end = i === phaseCount - 1 ? tickCount : cursor + Math.floor((tickCount / phaseCount) * (0.6 + rand() * 0.8));
    const drift = (rand() - 0.5) * 2 * (0.0004 + difficulty * 0.00022) * (regime?.trendScale ?? 1);
    const burst = rand() < 0.45;
    phases.push({ from: cursor, to: Math.min(end, tickCount), drift, vol: volBase * (burst ? 1.9 : 1) * (regime?.chopScale ?? 1) });
    cursor = end;
  }

  const wickAt = Math.floor(tickCount * (0.45 + rand() * 0.4));
  const wickDir = rand() < 0.5 ? 1 : -1;
  const wickMag = (0.02 + rand() * 0.028) * (0.7 + difficulty * 0.15) * (regime?.reversalScale ?? 1);

  const prices: number[] = new Array(tickCount + 1);
  let p = startingPrice;
  prices[0] = p;
  let phaseIdx = 0;
  for (let i = 1; i <= tickCount; i++) {
    while (phaseIdx < phases.length - 1 && i > phases[phaseIdx].to) phaseIdx++;
    const ph = phases[phaseIdx];
    const shock = gaussian(rand) * ph.vol;
    let ret = ph.drift + shock;
    const d = i - wickAt;
    if (d >= 0 && d < 25) ret += (wickDir * wickMag) / 25;
    else if (d >= 25 && d < 85) ret += (-wickDir * wickMag * 0.85) / 60;
    p = Math.max(1, p * (1 + ret));
    prices[i] = p;
  }

  return {
    id: spec.scenarioId,
    symbol: 'WICK',
    pair: spec.pair ?? 'WICK/USD',
    durationMs,
    startingPrice,
    tickMs: TICK_MS,
    prices,
    seed: spec.seed,
    difficulty,
    seasonId: spec.seasonId ?? 'S01',
    regimeId: regime?.id,
    regimeVersion: regime?.version,
    marketActorsVersion: undefined,
  };
}

/**
 * Builds a deterministic price path by applying an actor plan to the base regime simulation.
 */
function generateCandidatePrices(
  spec: ScenarioSpec,
  derivedSeed: string,
  plan: MarketActorPlan,
  durationMs: number,
  tickCount: number,
  difficulty: number,
): number[] {
  const rand = prngFromSeed(`wickwars:base:${derivedSeed}`);
  const startingPrice = 100;
  const regime = spec.regime;
  const volBase = (0.0011 + difficulty * 0.00045) * (regime?.volatilityScale ?? 1);

  const phases: Array<{ from: number; to: number; drift: number; vol: number }> = [];
  const phaseCount = 3 + Math.floor(rand() * 3);
  let cursor = 0;
  for (let i = 0; i < phaseCount; i++) {
    const end = i === phaseCount - 1 ? tickCount : cursor + Math.floor((tickCount / phaseCount) * (0.6 + rand() * 0.8));
    const drift = (rand() - 0.5) * 2 * (0.0004 + difficulty * 0.00022) * (regime?.trendScale ?? 1);
    const burst = rand() < 0.45;
    phases.push({ from: cursor, to: Math.min(end, tickCount), drift, vol: volBase * (burst ? 1.9 : 1) * (regime?.chopScale ?? 1) });
    cursor = end;
  }

  const wickAt = Math.floor(tickCount * (0.45 + rand() * 0.4));
  const wickDir = rand() < 0.5 ? 1 : -1;
  const wickMag = (0.02 + rand() * 0.028) * (0.7 + difficulty * 0.15) * (regime?.reversalScale ?? 1);

  const prices: number[] = new Array(tickCount + 1);
  let p = startingPrice;
  prices[0] = p;
  let phaseIdx = 0;

  for (let i = 1; i <= tickCount; i++) {
    const tMs = i * TICK_MS;
    while (phaseIdx < phases.length - 1 && i > phases[phaseIdx].to) phaseIdx++;
    const ph = phases[phaseIdx];

    // Actor layer: directional return pressure and volatility scaling
    const actorInfluence = combinedActorInfluence(plan, tMs, regime);

    const effectiveVol = ph.vol * actorInfluence.volMultiplier;
    const shock = gaussian(rand) * effectiveVol;
    let ret = ph.drift + shock + actorInfluence.returnDelta;

    const d = i - wickAt;
    if (d >= 0 && d < 25) ret += (wickDir * wickMag) / 25;
    else if (d >= 25 && d < 85) ret += (-wickDir * wickMag * 0.85) / 60;

    p = Math.max(1, p * (1 + ret));
    prices[i] = p;
  }

  return prices;
}

export function buildScenario(spec: ScenarioSpec): MarketScenario {
  // If explicitly requested without actors (legacy), or legacy caller without regime/actorVersion:
  // Note: if marketActorsVersion is explicitly undefined and not requested, check legacy fallback
  if (spec.marketActorsVersion === 'legacy' || (spec.marketActorsVersion === undefined && spec.regime === undefined)) {
    return buildLegacyScenario(spec);
  }

  const durationMs = spec.durationMs ?? GAME_DURATION_MS;
  const difficulty = Math.min(5, Math.max(1, spec.difficulty ?? 3));
  const tickCount = Math.floor(durationMs / TICK_MS);
  const startingPrice = 100;
  const version = spec.marketActorsVersion ?? 'v1';

  // Seed-derived retry loop with deterministic fallback
  let attempt = 0;
  let chosenPrices: number[] | null = null;

  while (attempt < 10) {
    const subSeed = attempt === 0 ? spec.seed : `${spec.seed}:reroll:${attempt}`;
    const plan = generateMarketActorPlan({
      seed: subSeed,
      durationMs,
      regime: spec.regime,
    });

    const prices = generateCandidatePrices(
      spec,
      subSeed,
      plan,
      durationMs,
      tickCount,
      difficulty,
    );

    const diagnostics = analyzeMarketDiagnostics(prices, startingPrice, plan);
    if (diagnostics.isValid) {
      chosenPrices = prices;
      break;
    }
    attempt++;
  }

  // If after 10 attempts no candidate passed strict diagnostics, fallback to attempt 0 with safe clamped prices
  if (!chosenPrices) {
    const fallbackPlan = generateMarketActorPlan({
      seed: spec.seed,
      durationMs,
      regime: spec.regime,
    });
    chosenPrices = generateCandidatePrices(
      spec,
      spec.seed,
      fallbackPlan,
      durationMs,
      tickCount,
      difficulty,
    );
  }

  return {
    id: spec.scenarioId,
    symbol: 'WICK',
    pair: spec.pair ?? 'WICK/USD',
    durationMs,
    startingPrice,
    tickMs: TICK_MS,
    prices: chosenPrices,
    seed: spec.seed,
    difficulty,
    seasonId: spec.seasonId ?? 'S01',
    regimeId: spec.regime?.id,
    regimeVersion: spec.regime?.version,
    marketActorsVersion: version,
  };
}

/** Price at elapsed ms (clamped). Linear interpolation between ticks. */
export function priceAt(s: MarketScenario, elapsedMs: number): number {
  const t = Math.max(0, Math.min(s.durationMs, elapsedMs));
  const fi = t / s.tickMs;
  const i = Math.floor(fi);
  const frac = fi - i;
  const a = s.prices[Math.min(i, s.prices.length - 1)];
  const b = s.prices[Math.min(i + 1, s.prices.length - 1)];
  return a + (b - a) * frac;
}

/** Aggregate the revealed portion of the path into n candles. */
export function candlesUpTo(s: MarketScenario, elapsedMs: number, n: number): Candle[] {
  const t = Math.max(0, Math.min(s.durationMs, elapsedMs));
  const out: Candle[] = [];
  if (t <= 0) return out;
  const span = t / n;
  for (let i = 0; i < n; i++) {
    const t0 = span * i;
    const t1 = Math.min(span * (i + 1), t);
    const i0 = Math.max(0, Math.floor(t0 / s.tickMs));
    const i1 = Math.max(i0, Math.min(s.prices.length - 1, Math.ceil(t1 / s.tickMs)));
    let hi = -Infinity;
    let lo = Infinity;
    for (let k = i0; k <= i1; k++) {
      const v = s.prices[k];
      if (v > hi) hi = v;
      if (v < lo) lo = v;
    }
    out.push({
      timestamp: Math.round(t0),
      open: s.prices[i0],
      high: hi,
      low: lo,
      close: s.prices[i1],
    });
  }
  return out;
}

export function scenarioFingerprint(s: MarketScenario): string {
  return createHash('sha256').update(`wickwars:v1:${s.seed}:${s.durationMs}`).digest('hex').slice(0, 16);
}
