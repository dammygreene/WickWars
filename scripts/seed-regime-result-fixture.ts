import { mintSession } from '@/lib/auth/session';
import { challengeForDay, dayKey } from '@/lib/game/challenge';
import { regimeForDay } from '@/lib/game/regime';
import { newId, saveGame, savePlayer, saveResult } from '@/lib/store/db';
import type { Game, GameResult, PlayerIdentity } from '@/lib/types';
import { readFileSync } from 'fs';

if (!process.env.WW_SESSION_SECRET) {
  const match = readFileSync('.env.local', 'utf8').match(/^WW_SESSION_SECRET=(.*)$/m);
  if (match) process.env.WW_SESSION_SECRET = match[1].trim();
}

async function main() {
  const challenge = challengeForDay(dayKey());
  const regime = regimeForDay(dayKey());
  const playerId = newId('p_regime_fixture');
  const gameId = newId('g_regime_fixture');
  const player: PlayerIdentity = {
    playerId,
    username: `regime_fixture_${Date.now().toString(36).slice(-6)}`,
    displayName: 'Regime Fixture',
    title: 'WICK TRADER',
    archetype: 'THE GRINDER',
    level: 2,
    guest: true,
    createdAt: Date.now(),
  };
  const game: Game = {
    id: gameId,
    playerId,
    challengeId: challenge.id,
    scenarioId: challenge.scenarioId,
    seasonId: challenge.seasonId,
    runType: 'ranked',
    regimeId: regime.id,
    regimeVersion: regime.version,
    mode: challenge.mode,
    pair: challenge.pair,
    startsAt: 0,
    endsAt: challenge.durationMs,
    startBalance: challenge.startingBalance,
    status: 'FINISHED',
    trades: [],
    resultId: gameId,
    createdAt: Date.now(),
  };
  const result: GameResult = {
    gameId,
    playerId,
    scenarioId: game.scenarioId,
    challengeId: game.challengeId,
    seasonId: game.seasonId,
    runType: 'ranked',
    regimeId: regime.id,
    regimeVersion: regime.version,
    mode: game.mode,
    pair: game.pair,
    startBalance: game.startBalance,
    endBalance: 10_250,
    pnl: 250,
    roi: 2.5,
    trades: 0,
    tradeEvents: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    holdTimeMs: 0,
    maxDrawdownPct: 1.2,
    score: 8420,
    rank: 1,
    rankTotal: 1,
    percentile: 100,
    durationMs: challenge.durationMs,
    resultState: 'PROFITABLE',
    liquidated: false,
    verified: true,
    createdAt: Date.now(),
  };
  await savePlayer(player);
  await saveGame(game);
  await saveResult(result);
  console.log(JSON.stringify({ playerId, username: player.username, gameId, regimeId: regime.id, regimeVersion: regime.version, token: mintSession(playerId) }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
