import { SCORING } from '@/lib/game/scoring';

const balance = 10_000;
const leverages = [1, 2, 5, 10, 20];
const moves = [-0.2, -0.1, -0.05, -0.02, -0.01, 0, 0.01, 0.02, 0.05, 0.1, 0.2];

function scoreFor(pnl: number, leverage: number, liquidated: boolean): number {
  const roi = (pnl / balance) * 100;
  const performance = Math.max(SCORING.perfFloor, Math.min(SCORING.perfCap, Math.round(roi * SCORING.roiPerPct)));
  const risk = -Math.min(SCORING.drawdownCap, Math.round(Math.max(0, -roi) * SCORING.drawdownPerPct));
  const survival = liquidated ? -SCORING.liquidationPenalty : SCORING.survivalBonus;
  const streak = roi > 0 ? SCORING.streakPerDay : 0;
  void leverage;
  const winRate = pnl > 0 ? SCORING.winRateWeight : 0;
  return Math.max(0, Math.min(SCORING.scoreMax, SCORING.baseFinish + performance + winRate + SCORING.disciplineBonus + risk + survival + streak));
}

for (const leverage of leverages) {
  for (const move of moves) {
    const pnl = balance * leverage * move;
    const equity = Math.max(0, balance + pnl);
    const roi = (pnl / balance) * 100;
    const liquidated = equity <= balance * 0.05;
    const drawdown = Math.max(0, -roi);
    console.log(JSON.stringify({ leverage, movePct: move * 100, pnl, equity, roiPct: roi, drawdownPct: drawdown, liquidated, score: scoreFor(pnl, leverage, liquidated) }));
  }
}
