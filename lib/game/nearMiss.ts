import type { DbShape } from '@/lib/store/db';
import type { Game, GameResult, MarketScenario, NearMiss } from '@/lib/types';
import { equityAt, LIQUIDATION_EQUITY_RATIO } from './engine';

export const NEAR_LIQUIDATION_MAX_EQUITY_PERCENT = 10;
export const LEADERBOARD_NEAR_MISS_MAX_POINTS = 100;

interface RankedRow {
  playerId: string;
  score: number;
  gameId: string;
  createdAt: number;
}

function rankedRows(results: GameResult[], challengeId: string): RankedRow[] {
  const best = new Map<string, RankedRow>();
  for (const result of results) {
    if (!result.verified || (result.runType ?? 'ranked') !== 'ranked' || result.challengeId !== challengeId) continue;
    const row = { playerId: result.playerId, score: result.score, gameId: result.gameId, createdAt: result.createdAt };
    const previous = best.get(result.playerId);
    if (!previous || row.score > previous.score || (row.score === previous.score && row.createdAt < previous.createdAt)) best.set(result.playerId, row);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

function cutoffNearMiss(result: GameResult, results: GameResult[]): NearMiss {
  if ((result.runType ?? 'ranked') !== 'ranked') return null;
  const rows = rankedRows(results, result.challengeId);
  const mine = rows.find((row) => row.playerId === result.playerId);
  if (!mine || mine.gameId !== result.gameId) return null;
  const candidates = [10, 100]
    .filter((target) => target <= rows.length && mine.score < rows[target - 1].score)
    .map((target) => ({ target, points: rows[target - 1].score - mine.score }))
    .filter((candidate) => candidate.points <= LEADERBOARD_NEAR_MISS_MAX_POINTS)
    .sort((a, b) => a.points - b.points || a.target - b.target);
  const best = candidates[0];
  if (best) return { type: 'leaderboard_cutoff', targetRank: best.target, pointsAway: best.points };

  for (const target of [10, 100]) {
    if (target <= rows.length && mine.score === rows[target - 1].score && rows[target - 1].playerId !== mine.playerId) {
      return { type: 'leaderboard_tie', targetRank: target };
    }
  }
  return null;
}

export function minimumEquityPercent(game: Game, result: GameResult, scenario: MarketScenario): number {
  const terminal = game.trades.filter((event) => event.kind !== 'LIQUIDATION_CLOSE' && event.kind !== 'TIMEOUT_CLOSE');
  const times = new Set<number>([0, Math.min(result.durationMs, scenario.durationMs)]);
  for (let t = 0; t <= Math.min(result.durationMs, scenario.durationMs); t += scenario.tickMs) times.add(t);
  for (const event of terminal) if (event.t <= result.durationMs) times.add(event.t);
  let minimum = game.startBalance;
  for (const t of times) {
    const visible = terminal.filter((event) => event.t <= t);
    const snapshot = equityAt({ ...game, trades: visible }, scenario, t);
    minimum = Math.min(minimum, snapshot.equity);
  }
  return (minimum / game.startBalance) * 100;
}

export function nearMissForResult(db: DbShape, game: Game, result: GameResult, scenario: MarketScenario): NearMiss {
  const results = Object.values(db.results);
  const cutoff = cutoffNearMiss(result, results);
  if (cutoff) return cutoff;

  if (result.liquidated) {
    return { type: 'liquidation_survival', liquidationEquityPercent: roundPercent((result.endBalance / result.startBalance) * 100) };
  }

  const minimum = minimumEquityPercent(game, result, scenario);
  const liquidationPercent = LIQUIDATION_EQUITY_RATIO * 100;
  return minimum > liquidationPercent && minimum <= NEAR_LIQUIDATION_MAX_EQUITY_PERCENT
    ? { type: 'near_liquidation', minimumEquityPercent: roundPercent(minimum) }
    : null;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}