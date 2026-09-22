import { readFileSync } from 'fs';
import { mintSession } from '@/lib/auth/session';
import { challengeForDay, dayKey } from '@/lib/game/challenge';
import { regimeForDay } from '@/lib/game/regime';
import { newId, saveGame, savePlayer, saveResult } from '@/lib/store/db';
import type { Game, GameResult, PlayerIdentity, TradeEvent } from '@/lib/types';
if (!process.env.WW_SESSION_SECRET) process.env.WW_SESSION_SECRET = readFileSync('.env.local', 'utf8').match(/^WW_SESSION_SECRET=(.*)$/m)?.[1]?.trim() ?? '';
async function main() {
  const challenge = challengeForDay(dayKey()); const regime = regimeForDay(dayKey()); const playerId = newId('p_achievement_fixture'); const gameId = newId('g_achievement_fixture');
  const player: PlayerIdentity = { playerId, username: `ach_fixture_${Date.now().toString(36).slice(-6)}`, displayName: 'Achievement Fixture', title: 'WICK NOVICE', archetype: 'UNRANKED', level: 1, guest: true, createdAt: Date.now() };
  const trades: TradeEvent[] = [
    { id: newId('tr'), gameId, t: 0, action: 'LONG', price: 100, notional: 10_000, sideAfter: 'LONG', entryPriceAfter: 100, realizedPnl: 0, kind: 'OPEN' },
    { id: newId('tr'), gameId, t: 3000, action: 'CLOSE', price: 101, notional: 10_000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 100, kind: 'CLOSE' },
  ];
  const game: Game = { id: gameId, playerId, challengeId: challenge.id, scenarioId: challenge.scenarioId, seasonId: challenge.seasonId, runType: 'ranked', regimeId: regime.id, regimeVersion: regime.version, mode: challenge.mode, pair: challenge.pair, startsAt: 0, endsAt: challenge.durationMs, startBalance: 10_000, status: 'FINISHED', trades, resultId: gameId, createdAt: Date.now() };
  const result: GameResult = { gameId, playerId, scenarioId: game.scenarioId, challengeId: game.challengeId, seasonId: game.seasonId, runType: 'ranked', regimeId: regime.id, regimeVersion: regime.version, mode: game.mode, pair: game.pair, startBalance: 10_000, endBalance: 10_100, pnl: 100, roi: 1, trades: 1, tradeEvents: 2, wins: 1, losses: 0, winRate: 100, holdTimeMs: 3000, maxDrawdownPct: 0, score: 1200, rank: 1, rankTotal: 1, percentile: 100, durationMs: 45_000, resultState: 'PROFITABLE', liquidated: false, verified: true, createdAt: Date.now() };
  await savePlayer(player); await saveGame(game); await saveResult(result);
  console.log(JSON.stringify({ playerId, gameId, username: player.username, token: mintSession(playerId) }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
