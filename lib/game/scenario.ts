import { createHash } from 'crypto';
import type { Candle, MarketScenario } from '@/lib/types';
import { GAME_DURATION_MS, TICK_MS } from './constants';
import type { RegimeConfig } from './regime';

export { TICK_MS, GAME_DURATION_MS, START_BALANCE, LEVERAGE } from './constants';

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
}

export function buildScenario(spec: ScenarioSpec): MarketScenario {
  const durationMs = spec.durationMs ?? GAME_DURATION_MS;
  const difficulty = Math.min(5, Math.max(1, spec.difficulty ?? 3));
  const rand = prngFromSeed(`wickwars:v1:${spec.seed}`);
  const tickCount = Math.floor(durationMs / TICK_MS);
  const startingPrice = 100;

  // Regime model: 3-5 trend phases across the round + volatility bursts + one wick event.
  const regime = spec.regime;
  const volBase = (0.0011 + difficulty * 0.00045) * (regime?.volatilityScale ?? 1); // per-tick sigma
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

  // The signature wick: a violent spike + snap-back somewhere mid/late round.
  const wickAt = Math.floor(tickCount * (0.45 + rand() * 0.4));
  const wickDir = rand() < 0.5 ? 1 : -1;
  const wickMag = (0.02 + rand() * 0.028) * (0.7 + difficulty * 0.15) * (regime?.reversalScale ?? 1); // 2-5% move

  const prices: number[] = new Array(tickCount + 1);
  let p = startingPrice;
  prices[0] = p;
  let phaseIdx = 0;
  for (let i = 1; i <= tickCount; i++) {
    while (phaseIdx < phases.length - 1 && i > phases[phaseIdx].to) phaseIdx++;
    const ph = phases[phaseIdx];
    const shock = gaussian(rand) * ph.vol;
    let ret = ph.drift + shock;
    // wick shape: fast spike over ~25 ticks, mean-revert over ~60 ticks
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
