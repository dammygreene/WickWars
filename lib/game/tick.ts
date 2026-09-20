import type { DbShape } from '@/lib/store/db';
import type { Game, GameResult, MarketScenario, TradeEvent } from '@/lib/types';
import { buildScenario, candlesUpTo, priceAt } from './scenario';
import { challengeForDay } from './challenge';
import { equityAt, LIQUIDATION_EQUITY_RATIO } from './engine';
import { calculateScore } from './scoring';
import { finalizeLocked } from './finish';

export interface TickSnapshot {
  status: 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'LIQUIDATED';
  serverNow: number;
  countdownMs: number;
  t: number;
  price: number;
  candles: ReturnType<typeof candlesUpTo>;
  equity: number;
  pnl: number;
  unrealized: number;
  side: 'FLAT' | 'LONG' | 'SHORT';
  entryPrice: number | null;
  trades: number;
  provisionalScore: number;
  provisionalRank: number | null;
  rankTotal: number;
  events: TradeEvent[];
  result: GameResult | null;
}

export function scenarioForGame(game: Game): MarketScenario {
  const day = game.challengeId.slice(game.seasonId.length + 1);
  const ch = challengeForDay(day);
  return buildScenario({ scenarioId: game.scenarioId, seed: game.scenarioId, seasonId: game.seasonId, difficulty: ch.difficulty });
}

/**
 * Authoritative per-tick computation. When called inside the write lock with
 * `commit=true`, timeout/liquidation finalization is persisted; otherwise the
 * game object is treated as read-only and finalization is reported but the
 * caller must persist via finalize route. To keep one code path, this function
 * MUTATES the passed db only when commit=true.
 */
export function computeTick(db: DbShape, game: Game, now: number, commit: boolean): TickSnapshot {
  const scenario = scenarioForGame(game);
  const countdownMs = Math.max(0, game.startsAt - now);
  const t = now - game.startsAt;

  if (game.resultId && db.results[game.resultId]) {
    const r = db.results[game.resultId];
    return finishedSnapshot(game, scenario, r, now);
  }

  if (t < 0) {
    return {
      status: 'COUNTDOWN',
      serverNow: now,
      countdownMs,
      t: 0,
      price: scenario.startingPrice,
      candles: [],
      equity: game.startBalance,
      pnl: 0,
      unrealized: 0,
      side: 'FLAT',
      entryPrice: null,
      trades: 0,
      provisionalScore: 0,
      provisionalRank: null,
      rankTotal: 0,
      events: [],
      result: null,
    };
  }

  if (t >= scenario.durationMs) {
    if (commit) {
      const r = finalizeLocked(db, game, scenario, scenario.durationMs, false);
      return finishedSnapshot(game, scenario, r, now);
    }
    return { ...liveSnapshot(db, game, scenario, scenario.durationMs, now), status: 'LIVE' };
  }

  const snap = equityAt(game, scenario, t);
  if (snap.side !== 'FLAT' && snap.equity <= game.startBalance * LIQUIDATION_EQUITY_RATIO) {
    if (commit) {
      const r = finalizeLocked(db, game, scenario, t, true);
      return finishedSnapshot(game, scenario, r, now);
    }
    return { ...liveSnapshot(db, game, scenario, t, now), status: 'LIVE' };
  }

  if (game.status === 'COUNTDOWN' && commit) {
    game.status = 'LIVE';
    db.games[game.id] = game;
  }
  return liveSnapshot(db, game, scenario, t, now);
}

function liveSnapshot(db: DbShape, game: Game, scenario: MarketScenario, t: number, now: number): TickSnapshot {
  const snap = equityAt(game, scenario, t);
  const closed = game.trades.filter((x) => x.action === 'CLOSE');
  const wins = closed.filter((x) => x.realizedPnl > 0).length;
  const { total } = calculateScore({
    startBalance: game.startBalance,
    pnl: snap.pnl,
    closedTrades: closed.length,
    wins,
    maxDrawdownPct: 0,
    liquidated: false,
    streakBefore: 0,
    profitable: snap.pnl > 0,
  });
  const board = Object.values(db.results).filter((r) => r.challengeId === game.challengeId && r.verified);
  return {
    status: 'LIVE',
    serverNow: now,
    countdownMs: 0,
    t: Math.round(t),
    price: priceAt(scenario, t),
    candles: candlesUpTo(scenario, t, 45),
    equity: round2(snap.equity),
    pnl: round2(snap.pnl),
    unrealized: round2(snap.unrealized),
    side: snap.side,
    entryPrice: snap.entryPrice,
    trades: closed.length,
    provisionalScore: total,
    provisionalRank: board.length ? 1 + board.filter((r) => r.score > total).length : 1,
    rankTotal: board.length + 1,
    events: game.trades,
    result: null,
  };
}

function finishedSnapshot(game: Game, scenario: MarketScenario, r: GameResult, now: number): TickSnapshot {
  void game;
  return {
    status: r.liquidated ? 'LIQUIDATED' : 'FINISHED',
    serverNow: now,
    countdownMs: 0,
    t: scenario.durationMs,
    price: priceAt(scenario, scenario.durationMs),
    candles: candlesUpTo(scenario, scenario.durationMs, 45),
    equity: round2(r.endBalance),
    pnl: round2(r.pnl),
    unrealized: 0,
    side: 'FLAT',
    entryPrice: null,
    trades: r.trades,
    provisionalScore: r.score,
    provisionalRank: r.rank,
    rankTotal: r.rankTotal,
    events: game.trades,
    result: r,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
