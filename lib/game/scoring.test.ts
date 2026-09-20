import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';

const base = {
  startBalance: 10_000,
  pnl: 0,
  closedTrades: 3,
  wins: 2,
  maxDrawdownPct: 5,
  liquidated: false,
  streakBefore: 0,
  profitable: false,
};

describe('scoring', () => {
  it('is deterministic', () => {
    expect(calculateScore({ ...base, pnl: 1200, profitable: true })).toEqual(
      calculateScore({ ...base, pnl: 1200, profitable: true }),
    );
  });

  it('rewards higher ROI monotonically', () => {
    const a = calculateScore({ ...base, pnl: 500, profitable: true });
    const b = calculateScore({ ...base, pnl: 1500, profitable: true });
    expect(b.total).toBeGreaterThan(a.total);
  });

  it('never goes negative and never exceeds the cap', () => {
    const worst = calculateScore({ ...base, pnl: -9900, wins: 0, maxDrawdownPct: 99, liquidated: true, closedTrades: 40 });
    expect(worst.total).toBe(0);
    const best = calculateScore({ ...base, pnl: 50000, wins: 10, closedTrades: 10, maxDrawdownPct: 0, streakBefore: 9, profitable: true });
    expect(best.total).toBeLessThanOrEqual(9999);
  });

  it('penalizes doing nothing less than blowing up, but more than playing well', () => {
    const idle = calculateScore({ ...base, closedTrades: 0, wins: 0, profitable: false });
    const good = calculateScore({ ...base, pnl: 800, profitable: true });
    const rekt = calculateScore({ ...base, pnl: -9000, wins: 0, maxDrawdownPct: 90, liquidated: true });
    expect(good.total).toBeGreaterThan(idle.total);
    expect(idle.total).toBeGreaterThan(rekt.total);
  });
});
