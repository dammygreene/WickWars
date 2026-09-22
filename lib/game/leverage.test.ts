import { describe, expect, it } from 'vitest';
import { parseLeverage, getGameLeverage } from './leverage';
import { unrealizedPnl } from './engine';

describe('leverage', () => {
  it('accepts only the supported allowlist and falls back legacy games to 10x', () => {
    expect([1, 2, 5, 10, 20].map(parseLeverage)).toEqual([1, 2, 5, 10, 20]);
    for (const invalid of [0, 0.5, 1.5, 3, 7, 10.5, 100, -1, Infinity, NaN, '5.0', '10x', null, undefined, {}, []]) {
      expect(parseLeverage(invalid)).toBeNull();
    }
    expect(getGameLeverage({})).toBe(10);
  });

  it('scales practice exposure while preserving the existing 10x equation', () => {
    expect(unrealizedPnl('LONG', 100, 10_000, 101, 10)).toBe(1000);
    expect(unrealizedPnl('LONG', 100, 10_000, 101, 5)).toBe(500);
    expect(unrealizedPnl('SHORT', 100, 10_000, 99, 20)).toBe(2000);
  });
});