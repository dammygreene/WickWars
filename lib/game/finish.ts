import type { DbShape } from '@/lib/store/db';
import { emptyStats, isRankedRun } from '@/lib/store/db';
import type { Game, GameResult, MarketScenario, ResultState } from '@/lib/types';
import { calculateScore } from './scoring';
import { closingEvent, computeFinalStats } from './engine';
import { levelForGames, titleForGames, archetypeForStats } from '@/lib/auth/identity';
import { logEvent } from '@/lib/server/log';
import { dailyStreakBefore, dailyStreakFromResults, longestDailyStreak } from './streak';

/**
 * Authoritative finalization. Runs INSIDE the store write-lock with direct db
 * access (never call save* helpers from here — they would deadlock).
 */
export function finalizeLocked(
  db: DbShape,
  game: Game,
  scenario: MarketScenario,
  endT: number,
  liquidated: boolean,
): GameResult {
  if (game.resultId && db.results[game.resultId]) return db.results[game.resultId];

  const endCapped = Math.min(Math.max(0, endT), scenario.durationMs);
  const closeEv = closingEvent(game, scenario, endCapped, liquidated ? 'LIQUIDATION_CLOSE' : 'TIMEOUT_CLOSE');
  if (closeEv) game.trades.push(closeEv);

  const stats = computeFinalStats(
    { ...game, trades: closeEv ? game.trades.slice(0, -1) : game.trades },
    scenario,
    { liquidated, endT: endCapped },
  );

  const ps = db.stats[game.playerId] ?? emptyStats(game.createdAt);
  const ranked = isRankedRun(game);
  const profitable = stats.pnl > 0;
  const prevBest = ps.bestScore;
  const resultCreatedAt = Date.now();
  const streakBefore = ranked ? dailyStreakBefore(Object.values(db.results), new Date(resultCreatedAt)) : 0;
  const { total: score } = calculateScore({
    startBalance: game.startBalance,
    pnl: stats.pnl,
    closedTrades: stats.closedTrades,
    wins: stats.wins,
    maxDrawdownPct: stats.maxDrawdownPct,
    liquidated,
    streakBefore,
    profitable,
  });

  // Rank among verified challenge results (this run included).
  const board = ranked
    ? Object.values(db.results).filter((r) => r.challengeId === game.challengeId && r.verified && isRankedRun(r))
    : [];
  const rank = ranked ? 1 + board.filter((r) => r.score > score).length : 0;
  const rankTotal = ranked ? board.length + 1 : 0;

  let resultState: ResultState = profitable ? 'PROFITABLE' : 'WICKED';
  const isPersonalBest = ranked && ps.games > 0 && score > prevBest;
  if (ranked && rank === 1 && rankTotal >= 3 && score >= 1500) resultState = 'LEGENDARY';
  else if (ranked && rank <= 10 && rankTotal >= 10) resultState = 'TOP_10';
  else if (isPersonalBest) resultState = 'PERSONAL_BEST';

  const result: GameResult = {
    gameId: game.id,
    playerId: game.playerId,
    scenarioId: game.scenarioId,
    challengeId: game.challengeId,
    seasonId: game.seasonId,
    runType: game.runType ?? 'ranked',
    challengeCode: game.challengeCode,
    ghostSourceGameId: game.ghostSourceGameId,
    regimeId: game.regimeId,
    regimeVersion: game.regimeVersion,
    leverage: game.leverage ?? 10,
    rulesVersion: game.rulesVersion ?? 'v1',
    mode: game.mode,
    pair: game.pair,
    startBalance: game.startBalance,
    endBalance: stats.endBalance,
    pnl: stats.pnl,
    roi: stats.roi,
    trades: stats.closedTrades,
    tradeEvents: game.trades.length,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.winRate,
    holdTimeMs: stats.holdTimeMs,
    maxDrawdownPct: stats.maxDrawdownPct,
    score,
    rank,
    rankTotal,
    percentile: rankTotal ? (rank / rankTotal) * 100 : 0,
    durationMs: endCapped,
    resultState,
    liquidated,
    verified: true,
    createdAt: resultCreatedAt,
  };

  // Persist result + game
  db.results[result.gameId] = result;
  game.status = liquidated ? 'LIQUIDATED' : 'FINISHED';
  game.resultId = result.gameId;
  db.games[game.id] = game;

  // Player stats + identity progression only apply to ranked runs.
  if (ranked) {
    ps.games += 1;
    if (profitable) ps.wins += 1;
    ps.currentStreak = dailyStreakFromResults(Object.values(db.results));
    ps.longestStreak = Math.max(ps.longestStreak, longestDailyStreak(Object.values(db.results)));
    ps.totalPnl += stats.pnl;
    ps.bestScore = Math.max(ps.bestScore, score);
    if (stats.roi > ps.bestWinPct) {
      ps.bestWinPct = stats.roi;
      ps.bestGameId = game.id;
    }
    ps.peakRank = ps.peakRank == null ? rank : Math.min(ps.peakRank, rank);
    if (!ps.seasonsPlayed.includes(game.seasonId)) ps.seasonsPlayed.push(game.seasonId);
    ps.lastPlayedAt = result.createdAt;
    ps.totalHoldMs += stats.holdTimeMs;
    ps.totalTrades += stats.closedTrades;
    for (const t of game.trades) {
      if (t.kind === 'OPEN') {
        if (t.action === 'LONG') ps.longCount++;
        if (t.action === 'SHORT') ps.shortCount++;
      }
    }
    ps.history.push({ gameId: game.id, score, roi: stats.roi, at: result.createdAt, seasonId: game.seasonId });
    if (ps.history.length > 200) ps.history = ps.history.slice(-200);
    db.stats[game.playerId] = ps;

    const p = db.players[game.playerId];
    if (p) {
      p.title = titleForGames(ps.games);
      p.archetype = archetypeForStats(ps);
      p.level = levelForGames(ps.games);
      db.players[game.playerId] = p;
    }
  }

  logEvent('game_completed', {
    gameId: game.id,
    playerId: game.playerId,
    score,
    pnl: stats.pnl,
    liquidated,
  });

  return result;
}
