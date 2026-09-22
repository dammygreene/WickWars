/**
 * WICK WARS scoring engine v1 (server-side, deterministic).
 * Rewards outcome + execution quality + risk discipline + survival.
 * Coefficients live here (server) so balancing never needs a client rebuild.
 * Rules are published on /how-to-play — no hidden scoring.
 */

export const SCORING = {
  baseFinish: 400,
  baseNoTrade: 150,
  roiPerPct: 45,
  perfCap: 1200,
  perfFloor: -400,
  winRateWeight: 200,
  disciplineSweetMin: 1,
  disciplineSweetMax: 10,
  disciplineBonus: 100,
  overtradePenaltyPer: 12,
  overtradeThreshold: 15,
  drawdownPerPct: 12,
  drawdownCap: 300,
  survivalBonus: 100,
  liquidationPenalty: 250,
  streakPerDay: 25,
  streakCap: 125,
  scoreMax: 9999,
} as const;

export interface ScoreInput {
  startBalance: number;
  pnl: number;
  closedTrades: number;
  wins: number;
  maxDrawdownPct: number;
  liquidated: boolean;
  streakBefore: number; // consecutive profitable UTC days before this result
  profitable: boolean;
}

export interface ScoreBreakdown {
  base: number;
  performance: number;
  winRate: number;
  discipline: number;
  risk: number;
  survival: number;
  streak: number;
  total: number;
}

export function calculateScore(i: ScoreInput): ScoreBreakdown {
  const c = SCORING;
  const roiPct = (i.pnl / i.startBalance) * 100;

  const base = i.closedTrades === 0 ? c.baseNoTrade : c.baseFinish;
  const performance = Math.max(c.perfFloor, Math.min(c.perfCap, Math.round(roiPct * c.roiPerPct)));

  const winRate = i.closedTrades > 0 ? i.wins / i.closedTrades : 0;
  const winRatePts = Math.round(winRate * c.winRateWeight);

  let discipline = 0;
  if (i.closedTrades >= c.disciplineSweetMin && i.closedTrades <= c.disciplineSweetMax) {
    discipline = c.disciplineBonus;
  } else if (i.closedTrades > c.overtradeThreshold) {
    discipline = -(i.closedTrades - c.overtradeThreshold) * c.overtradePenaltyPer;
  }

  const risk = -Math.min(c.drawdownCap, Math.round(i.maxDrawdownPct * c.drawdownPerPct));
  const survival = i.liquidated ? -c.liquidationPenalty : c.survivalBonus;

  const streakDays = i.profitable ? Math.min(5, i.streakBefore + 1) : 0;
  const streak = streakDays * c.streakPerDay;

  const total = Math.max(0, Math.min(c.scoreMax, base + performance + winRatePts + discipline + risk + survival + streak));
  return { base, performance, winRate: winRatePts, discipline, risk, survival, streak, total };
}
