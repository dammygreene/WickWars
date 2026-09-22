import type { Game, MarketScenario, PositionSide, TradeAction, TradeEvent } from '@/lib/types';
import { priceAt } from './scenario';
import { getGameLeverage } from './leverage';
import { newId } from '@/lib/store/db';

export const LIQUIDATION_EQUITY_RATIO = 0.05; // equity <= 5% of start => rekt
export const COUNTDOWN_MS = 3500;

export interface PositionSnapshot {
  side: PositionSide;
  entryPrice: number | null;
  notional: number;
  entryT: number | null;
  realized: number;
}

export function positionFromTrades(trades: TradeEvent[]): PositionSnapshot {
  let realized = 0;
  let side: PositionSide = 'FLAT';
  let entryPrice: number | null = null;
  let notional = 0;
  let entryT: number | null = null;
  for (const t of trades) {
    realized += t.realizedPnl;
    side = t.sideAfter;
    if (t.action === 'CLOSE') {
      entryPrice = t.entryPriceAfter;
      if (side === 'FLAT') {
        notional = 0;
        entryT = null;
      }
    } else {
      entryPrice = t.price;
      notional = t.notional;
      entryT = t.t;
    }
    if (side === 'FLAT') {
      entryPrice = null;
      notional = 0;
      entryT = null;
    } else if (t.kind === 'FLIP_CLOSE') {
      // flip-close is immediately followed by its open event; transient only
    }
  }
  return { side, entryPrice, notional, entryT, realized };
}

export function unrealizedPnl(side: PositionSide, entry: number | null, notional: number, price: number, leverage = 10): number {
  if (side === 'FLAT' || entry == null || entry <= 0) return 0;
  const dir = side === 'LONG' ? 1 : -1;
  return notional * leverage * dir * ((price - entry) / entry);
}

export interface EquitySnapshot {
  equity: number;
  pnl: number;
  unrealized: number;
  realized: number;
  side: PositionSide;
  entryPrice: number | null;
  notional: number;
}

export function equityAt(game: Game, scenario: MarketScenario, elapsedMs: number): EquitySnapshot {
  const pos = positionFromTrades(game.trades);
  const price = priceAt(scenario, elapsedMs);
  const unrealized = unrealizedPnl(pos.side, pos.entryPrice, pos.notional, price, getGameLeverage(game));
  const equity = Math.max(0, game.startBalance + pos.realized + unrealized);
  return {
    equity,
    pnl: equity - game.startBalance,
    unrealized,
    realized: pos.realized,
    side: pos.side,
    entryPrice: pos.entryPrice,
    notional: pos.notional,
  };
}

export class TradeRejected extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Validate + apply a trade at server time `t` (ms offset). Returns new events.
 * Pure w.r.t. game+scenario; caller persists.
 */
export function applyTrade(game: Game, scenario: MarketScenario, action: TradeAction, t: number): TradeEvent[] {
  if (game.status !== 'LIVE' && game.status !== 'COUNTDOWN') {
    throw new TradeRejected('GAME_NOT_LIVE', 'This game is no longer live.');
  }
  if (t < 0 || t > scenario.durationMs) {
    throw new TradeRejected('OUTSIDE_WINDOW', 'Trade is outside the game window.');
  }
  const lastT = game.trades.length ? game.trades[game.trades.length - 1].t : -1;
  const tc = Math.max(t, lastT); // enforce monotonic event time
  const price = priceAt(scenario, tc);
  const pos = positionFromTrades(game.trades);
  const snap = equityAt(game, scenario, tc);
  if (snap.equity <= game.startBalance * LIQUIDATION_EQUITY_RATIO) {
    throw new TradeRejected('LIQUIDATED', 'Position was liquidated.');
  }

  const events: TradeEvent[] = [];
  const mk = (partial: Partial<TradeEvent> & { action: TradeAction }): TradeEvent => ({
    id: newId('tr'),
    gameId: game.id,
    t: tc,
    price,
    notional: 0,
    sideAfter: 'FLAT',
    entryPriceAfter: null,
    realizedPnl: 0,
    kind: 'OPEN',
    ...partial,
  });

  if (action === 'CLOSE') {
    if (pos.side === 'FLAT') throw new TradeRejected('NO_POSITION', 'No open position to close.');
    const rpnl = unrealizedPnl(pos.side, pos.entryPrice, pos.notional, price, getGameLeverage(game));
    events.push(
      mk({ action: 'CLOSE', kind: 'CLOSE', notional: pos.notional, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: rpnl }),
    );
    return events;
  }

  const want: PositionSide = action === 'LONG' ? 'LONG' : 'SHORT';
  if (pos.side === want) throw new TradeRejected('SAME_SIDE', `Already ${want.toLowerCase()}.`);
  if (pos.side !== 'FLAT') {
    // Flip: close current, open opposite at same price.
    const rpnl = unrealizedPnl(pos.side, pos.entryPrice, pos.notional, price, getGameLeverage(game));
    events.push(
      mk({ action: 'CLOSE', kind: 'FLIP_CLOSE', notional: pos.notional, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: rpnl }),
    );
  }
  const equityNow = Math.max(0, game.startBalance + pos.realized + (events[0]?.realizedPnl ?? 0));
  events.push(
    mk({ action, kind: 'OPEN', notional: equityNow, sideAfter: want, entryPriceAfter: price, realizedPnl: 0 }),
  );
  return events;
}

export interface PositionSegment {
  from: number;
  to: number;
  side: PositionSide;
  entry: number;
  notional: number;
}

/** Reconstruct position-over-time for drawdown / hold-time analysis. */
export function segmentsFromTrades(trades: TradeEvent[], endT: number): PositionSegment[] {
  const segs: PositionSegment[] = [];
  let open: { t: number; side: PositionSide; entry: number; notional: number } | null = null;
  for (const t of trades) {
    if (t.action === 'CLOSE' || t.kind === 'FLIP_CLOSE') {
      if (open) {
        segs.push({ from: open.t, to: t.t, side: open.side, entry: open.entry, notional: open.notional });
        open = null;
      }
    }
    if (t.action === 'LONG' || t.action === 'SHORT') {
      open = { t: t.t, side: t.action === 'LONG' ? 'LONG' : 'SHORT', entry: t.price, notional: t.notional };
    }
  }
  if (open) segs.push({ from: open.t, to: endT, side: open.side, entry: open.entry, notional: open.notional });
  return segs;
}

export interface FinalStats {
  endBalance: number;
  pnl: number;
  roi: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  holdTimeMs: number;
  maxDrawdownPct: number;
  liquidated: boolean;
}

export function computeFinalStats(
  game: Game,
  scenario: MarketScenario,
  opts: { liquidated: boolean; endT: number },
): FinalStats {
  const endPrice = priceAt(scenario, opts.endT);
  const pos = positionFromTrades(game.trades);
  let realized = pos.realized;
  if (pos.side !== 'FLAT') {
    // Timeout close at final price (callers append the event; stats include it).
    realized += unrealizedPnl(pos.side, pos.entryPrice, pos.notional, endPrice, getGameLeverage(game));
  }
  const endBalance = Math.max(0, game.startBalance + realized);
  const pnl = endBalance - game.startBalance;

  let closed = 0;
  let wins = 0;
  let losses = 0;
  for (const t of game.trades) {
    if (t.action === 'CLOSE') {
      closed++;
      if (t.realizedPnl > 0) wins++;
      else if (t.realizedPnl < 0) losses++;
    }
  }
  const timeoutClose = pos.side !== 'FLAT';
  if (timeoutClose) {
    closed++;
    const rp = unrealizedPnl(pos.side, pos.entryPrice, pos.notional, endPrice, getGameLeverage(game));
    if (rp > 0) wins++;
    else if (rp < 0) losses++;
  }

  const segs = segmentsFromTrades(game.trades, opts.endT);
  const holdTimeMs = segs.reduce((a, s) => a + Math.max(0, s.to - s.from), 0);

  // Max drawdown: sample equity every 250ms through the round.
  let peak = game.startBalance;
  let maxDd = 0;
  let realizedSoFar = 0;
  const closes = game.trades.filter((t) => t.action === 'CLOSE').sort((a, b) => a.t - b.t);
  for (let t = 0; t <= opts.endT; t += 250) {
    while (closes.length && closes[0].t <= t) {
      const c = closes.shift()!;
      realizedSoFar += c.realizedPnl;
    }
    const seg = segs.find((s) => t >= s.from && t <= s.to);
    const price = priceAt(scenario, t);
    const u = seg ? unrealizedPnl(seg.side, seg.entry, seg.notional, price, getGameLeverage(game)) : 0;
    const eq = Math.max(0, game.startBalance + realizedSoFar + u);
    if (eq > peak) peak = eq;
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - eq) / peak) * 100);
  }

  return {
    endBalance,
    pnl,
    roi: (pnl / game.startBalance) * 100,
    closedTrades: closed,
    wins,
    losses,
    winRate: closed ? (wins / closed) * 100 : 0,
    holdTimeMs,
    maxDrawdownPct: maxDd,
    liquidated: opts.liquidated,
  };
}

/** Append a timeout/liquidation close event (pure helper for finish flow). */
export function closingEvent(
  game: Game,
  scenario: MarketScenario,
  endT: number,
  kind: 'TIMEOUT_CLOSE' | 'LIQUIDATION_CLOSE',
): TradeEvent | null {
  const pos = positionFromTrades(game.trades);
  if (pos.side === 'FLAT') return null;
  const price = priceAt(scenario, endT);
  return {
    id: newId('tr'),
    gameId: game.id,
    t: Math.min(endT, scenario.durationMs),
    action: 'CLOSE',
    price,
    notional: pos.notional,
    sideAfter: 'FLAT',
    entryPriceAfter: null,
    realizedPnl: unrealizedPnl(pos.side, pos.entryPrice, pos.notional, price, getGameLeverage(game)),
    kind,
  };
}
