import { describe, it, expect } from 'vitest';
import { buildScenario, priceAt, candlesUpTo, GAME_DURATION_MS } from './scenario';

describe('scenario', () => {
  it('is deterministic for the same seed', () => {
    const a = buildScenario({ scenarioId: 'scn-S01-2026-09-20', seed: 'scn-S01-2026-09-20' });
    const b = buildScenario({ scenarioId: 'scn-S01-2026-09-20', seed: 'scn-S01-2026-09-20' });
    expect(a.prices).toEqual(b.prices);
  });

  it('differs across days', () => {
    const a = buildScenario({ scenarioId: 'scn-S01-2026-09-20', seed: 'scn-S01-2026-09-20' });
    const b = buildScenario({ scenarioId: 'scn-S01-2026-09-21', seed: 'scn-S01-2026-09-21' });
    expect(a.prices).not.toEqual(b.prices);
  });

  it('covers the full duration with sane prices', () => {
    const s = buildScenario({ scenarioId: 'x', seed: 'x' });
    expect(s.prices.length).toBe(Math.floor(GAME_DURATION_MS / 100) + 1);
    for (const p of s.prices) expect(p).toBeGreaterThan(0);
    // must actually move (a flat line is a broken game)
    const lo = Math.min(...s.prices);
    const hi = Math.max(...s.prices);
    expect((hi - lo) / s.startingPrice).toBeGreaterThan(0.01);
  });

  it('priceAt clamps outside the window', () => {
    const s = buildScenario({ scenarioId: 'x', seed: 'x' });
    expect(priceAt(s, -5000)).toBe(priceAt(s, 0));
    expect(priceAt(s, 10 * GAME_DURATION_MS)).toBe(priceAt(s, GAME_DURATION_MS));
  });

  it('aggregates candles over revealed history only', () => {
    const s = buildScenario({ scenarioId: 'x', seed: 'x' });
    expect(candlesUpTo(s, 0, 45)).toEqual([]);
    const half = candlesUpTo(s, GAME_DURATION_MS / 2, 45);
    expect(half).toHaveLength(45);
    expect(half[44].timestamp).toBeLessThan(GAME_DURATION_MS / 2);
    for (const c of half) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });
});
