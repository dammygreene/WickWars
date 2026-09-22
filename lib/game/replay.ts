import type { Candle, Game, GameResult, KillCamFrame, KillCamReplay, MarketScenario } from '@/lib/types';
import { equityAt, positionFromTrades } from './engine';
import { priceAt } from './scenario';

const REPLAY_WINDOW_MS = 5_000;

/** Build only the verified liquidation window, never an unfinished-game payload. */
export function buildKillCamReplay(game: Game, result: GameResult, scenario: MarketScenario): KillCamReplay | null {
  if (!result.verified || !result.liquidated) return null;

  const end = Math.min(result.durationMs, scenario.durationMs);
  const start = Math.max(0, end - REPLAY_WINDOW_MS);
  const sourceTrades = game.trades.filter((event) => event.kind !== 'LIQUIDATION_CLOSE');
  const frameTimes = new Set<number>();
  for (let t = Math.ceil(start / scenario.tickMs) * scenario.tickMs; t <= end; t += scenario.tickMs) {
    frameTimes.add(Math.round(t));
  }
  frameTimes.add(Math.round(end));

  const events = game.trades.filter((event) => event.t >= start && event.t <= end);
  const frames = [...frameTimes]
    .sort((a, b) => a - b)
    .map((absoluteT) => {
      const visibleTrades = sourceTrades.filter((event) => event.t <= absoluteT);
      const position = positionFromTrades(visibleTrades);
      const snap = equityAt({ ...game, trades: visibleTrades }, scenario, absoluteT);
      const isLiquidation = absoluteT === Math.round(end);
      const equity = isLiquidation ? result.endBalance : snap.equity;
      const frameEvents = events
        .filter((event) => event.t <= absoluteT)
        .map((event) => ({ ...event, t: Math.max(0, event.t - start) }));
      return {
        t: Math.max(0, absoluteT - start),
        price: priceAt(scenario, absoluteT),
        candles: candlesInWindow(scenario, start, absoluteT, 45),
        equity,
        pnl: equity - game.startBalance,
        unrealized: isLiquidation ? 0 : snap.unrealized,
        side: isLiquidation ? 'FLAT' : position.side,
        entryPrice: isLiquidation ? null : position.entryPrice,
        events: frameEvents,
      } satisfies KillCamFrame;
    });

  return { durationMs: Math.max(0, end - start), frames };
}

function candlesInWindow(scenario: MarketScenario, start: number, end: number, count: number): Candle[] {
  const duration = Math.max(scenario.tickMs, end - start);
  const span = duration / count;
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const from = start + span * i;
    const to = Math.min(end, start + span * (i + 1));
    const values = [priceAt(scenario, from), priceAt(scenario, to)];
    for (let t = Math.ceil(from / scenario.tickMs) * scenario.tickMs; t <= to; t += scenario.tickMs) {
      values.push(priceAt(scenario, t));
    }
    candles.push({
      timestamp: Math.round(from - start),
      open: values[0],
      high: Math.max(...values),
      low: Math.min(...values),
      close: values[values.length - 1],
    });
  }
  return candles;
}

export { REPLAY_WINDOW_MS };
