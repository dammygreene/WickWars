import { challengeForDay, dayKey } from '@/lib/game/challenge';
import { buildScenario, priceAt } from '@/lib/game/scenario';
import { newId, saveGame, savePlayer, saveResult, withDb } from '@/lib/store/db';
import type { Game, GameResult, PlayerIdentity, TradeEvent } from '@/lib/types';

async function main() {
const challenge = challengeForDay(dayKey());
const playerId = newId('p_fixture');
const gameId = newId('g_fixture');
const scenario = buildScenario({ scenarioId: challenge.scenarioId, seed: challenge.scenarioId, seasonId: challenge.seasonId, difficulty: challenge.difficulty });
const price = (t: number) => priceAt(scenario, t);
const sourcePlayer: PlayerIdentity = {
  playerId,
  username: `ghost_fixture_${Date.now().toString(36).slice(-6)}`,
  displayName: 'Ghost Fixture',
  title: 'WICK TRADER',
  archetype: 'THE GRINDER',
  level: 2,
  guest: true,
  createdAt: Date.now(),
};
const trades: TradeEvent[] = [
  { id: newId('tr'), gameId, t: 5_000, action: 'LONG', price: price(5_000), notional: 10_000, sideAfter: 'LONG', entryPriceAfter: price(5_000), realizedPnl: 0, kind: 'OPEN' },
  { id: newId('tr'), gameId, t: 12_000, action: 'CLOSE', price: price(12_000), notional: 10_000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 0, kind: 'FLIP_CLOSE' },
  { id: newId('tr'), gameId, t: 12_000, action: 'SHORT', price: price(12_000), notional: 10_000, sideAfter: 'SHORT', entryPriceAfter: price(12_000), realizedPnl: 0, kind: 'OPEN' },
  { id: newId('tr'), gameId, t: 22_000, action: 'CLOSE', price: price(22_000), notional: 10_000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 100, kind: 'CLOSE' },
];
const game: Game = {
  id: gameId, playerId, challengeId: challenge.id, scenarioId: challenge.scenarioId, seasonId: challenge.seasonId,
  runType: 'ranked', mode: challenge.mode, pair: challenge.pair, startsAt: 0, endsAt: challenge.durationMs,
  startBalance: challenge.startingBalance, status: 'FINISHED', trades, resultId: gameId, createdAt: Date.now(),
};
const result: GameResult = {
  gameId, playerId, scenarioId: challenge.scenarioId, challengeId: challenge.id, seasonId: challenge.seasonId,
  runType: 'ranked', mode: challenge.mode, pair: challenge.pair, startBalance: challenge.startingBalance,
  endBalance: 10_100, pnl: 100, roi: 1, trades: 2, tradeEvents: trades.length, wins: 1, losses: 0, winRate: 50,
  holdTimeMs: 17_000, maxDrawdownPct: 2, score: 8_420, rank: 1, rankTotal: 1, percentile: 100,
  durationMs: challenge.durationMs, resultState: 'PROFITABLE', liquidated: false, verified: true, createdAt: Date.now(),
};
await savePlayer(sourcePlayer);
await saveGame(game);
await saveResult(result);
console.log(JSON.stringify({ fixturePlayerId: playerId, fixtureUsername: sourcePlayer.username, fixtureGameId: gameId, scenarioId: challenge.scenarioId }));

if (process.env.GHOST_FIXTURE_CHECK === '1') {
  await withDb((db) => {
    if (!db.games[gameId] || !db.results[gameId]) throw new Error('fixture_not_persisted');
  });
}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
