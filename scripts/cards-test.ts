/** Dev-only: render sample cards to /tmp for visual QA. Cleans up its test records. */
import { promises as fs } from 'fs';
import path from 'path';
import { saveGame, savePlayer, emptyStats } from '@/lib/store/db';
import { gameResultCard, allTimeCard } from '@/lib/cards/generate';
import { readCardAsset } from '@/lib/cards/render';
import { buildScenario, priceAt } from '@/lib/game/scenario';
import type { Game, PlayerIdentity } from '@/lib/types';

async function main() {
  const which = process.argv[2] ?? 'all';
  const now = Date.now();

  const player: PlayerIdentity = {
    playerId: 'p_cardtest',
    username: process.argv[3] ?? 'oreoluwa',
    displayName: 'Oreoluwa',
    title: 'WICK HUNTER',
    archetype: 'THE SNIPER',
    level: 4,
    guest: true,
    createdAt: now - 30 * 86400_000,
  };
  await savePlayer(player, {
    ...emptyStats(now - 30 * 86400_000),
    games: 12,
    wins: 8,
    totalPnl: 4200,
    bestScore: 1890,
    bestWinPct: 24.81,
    bestGameId: 'g_cardtest',
    currentStreak: 3,
    longestStreak: 5,
    peakRank: 4,
    seasonsPlayed: ['S01'],
    lastPlayedAt: now,
    totalHoldMs: 180_000,
    totalTrades: 34,
    longCount: 20,
    shortCount: 14,
    history: Array.from({ length: 12 }, (_, i) => ({
      gameId: `g_hist${i}`,
      score: 700 + i * 95 + (i % 3) * 40,
      roi: -5 + i * 2.4,
      at: now - (12 - i) * 86400_000,
      seasonId: 'S01',
    })),
  });

  const scenario = buildScenario({ scenarioId: 'scn-S01-2026-09-20', seed: 'scn-S01-2026-09-20' });
  const px = (t: number) => Math.round(priceAt(scenario, t) * 10000) / 10000;
  const game: Game = {
    id: 'g_cardtest',
    playerId: player.playerId,
    challengeId: 'S01-2026-09-20',
    scenarioId: 'scn-S01-2026-09-20',
    seasonId: 'S01',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: now - 60_000,
    endsAt: now - 15_000,
    startBalance: 10_000,
    status: 'FINISHED',
    resultId: 'g_cardtest',
    createdAt: now - 60_000,
    trades: [
      { id: 't1', gameId: 'g_cardtest', t: 4000, action: 'LONG', price: px(4000), notional: 10000, sideAfter: 'LONG', entryPriceAfter: px(4000), realizedPnl: 0, kind: 'OPEN' },
      { id: 't2', gameId: 'g_cardtest', t: 18000, action: 'CLOSE', price: px(18000), notional: 10000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 1480.5, kind: 'CLOSE' },
      { id: 't3', gameId: 'g_cardtest', t: 22000, action: 'SHORT', price: px(22000), notional: 11480.5, sideAfter: 'SHORT', entryPriceAfter: px(22000), realizedPnl: 0, kind: 'OPEN' },
      { id: 't4', gameId: 'g_cardtest', t: 44000, action: 'CLOSE', price: px(44000), notional: 11480.5, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 1000.6, kind: 'TIMEOUT_CLOSE' },
    ],
  };
  await saveGame(game);

  // Write a verified result directly (bypasses gameplay — visual QA only).
  const dbFile = path.join(process.cwd(), '.data', 'db.json');
  const db = JSON.parse(await fs.readFile(dbFile, 'utf8'));
  db.results['g_cardtest'] = {
    gameId: 'g_cardtest',
    playerId: player.playerId,
    scenarioId: game.scenarioId,
    challengeId: game.challengeId,
    seasonId: 'S01',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startBalance: 10_000,
    endBalance: 12481.1,
    pnl: 2481.1,
    roi: 24.811,
    trades: 2,
    tradeEvents: 4,
    wins: 2,
    losses: 0,
    winRate: 100,
    holdTimeMs: 36000,
    maxDrawdownPct: 3.2,
    score: 1890,
    rank: 4,
    rankTotal: 128,
    percentile: 3.125,
    durationMs: 45_000,
    resultState: 'PERSONAL_BEST',
    liquidated: false,
    verified: true,
    createdAt: now - 15_000,
  };
  await fs.writeFile(dbFile, JSON.stringify(db));

  if (which === 'all' || which === 'game') {
    const { cardId } = await gameResultCard('g_cardtest');
    const png = await readCardAsset(cardId, 'png');
    await fs.writeFile('/tmp/ww-game-card.png', png!);
    console.log('game card ->', cardId, `${(png!.length / 1024).toFixed(0)}kb`, '/tmp/ww-game-card.png');
  }
  if (which === 'all' || which === 'alltime') {
    const { cardId } = await allTimeCard(player.playerId);
    const png = await readCardAsset(cardId, 'png');
    await fs.writeFile('/tmp/ww-alltime-card.png', png!);
    console.log('all-time card ->', cardId, `${(png!.length / 1024).toFixed(0)}kb`, '/tmp/ww-alltime-card.png');
  }

  // Cleanup test records (keep card files out of the way too — they live in .data, gitignored).
  const db2 = JSON.parse(await fs.readFile(dbFile, 'utf8'));
  delete db2.players['p_cardtest'];
  delete db2.usernames['oreoluwa'];
  delete db2.usernames[player.username.toLowerCase()];
  delete db2.stats['p_cardtest'];
  delete db2.games['g_cardtest'];
  delete db2.results['g_cardtest'];
  for (const [id, c] of Object.entries(db2.cards as Record<string, { playerId: string }>)) {
    if (c.playerId === 'p_cardtest') delete db2.cards[id];
  }
  await fs.writeFile(dbFile, JSON.stringify(db2));
  console.log('cleaned up test records');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
