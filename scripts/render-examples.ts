/** Dev-only: render static EXAMPLE cards for the landing page into public/examples/. */
import { promises as fs } from 'fs';
import path from 'path';
import { saveGame, savePlayer, emptyStats } from '@/lib/store/db';
import { gameResultCard } from '@/lib/cards/generate';
import { readCardAsset } from '@/lib/cards/render';
import { buildScenario, priceAt } from '@/lib/game/scenario';
import type { Game } from '@/lib/types';

const now = Date.now();
const SCN = 'scn-S01-2026-09-20';

async function seed(kind: 'win' | 'loss') {
  const isWin = kind === 'win';
  const pid = `p_ex_${kind}`;
  const gid = `g_ex_${kind}`;
  const username = isWin ? 'sniperwick' : 'jeetmachine';
  await savePlayer(
    {
      playerId: pid,
      username,
      displayName: username,
      title: isWin ? 'WICK HUNTER' : 'WICK TRADER',
      archetype: isWin ? 'THE SNIPER' : 'THE JEET',
      level: 3,
      guest: true,
      createdAt: now - 86400_000,
    },
    emptyStats(now - 86400_000),
  );
  const s = buildScenario({ scenarioId: SCN, seed: SCN });
  const px = (t: number) => Math.round(priceAt(s, t) * 10000) / 10000;
  const game: Game = {
    id: gid,
    playerId: pid,
    challengeId: 'S01-2026-09-20',
    scenarioId: SCN,
    seasonId: 'S01',
    mode: 'DAILY WICK',
    pair: 'WICK/USD',
    startsAt: now - 60_000,
    endsAt: now - 15_000,
    startBalance: 10_000,
    status: 'FINISHED',
    resultId: gid,
    createdAt: now - 60_000,
    trades: isWin
      ? [
          { id: 'a', gameId: gid, t: 3000, action: 'LONG', price: px(3000), notional: 10000, sideAfter: 'LONG', entryPriceAfter: px(3000), realizedPnl: 0, kind: 'OPEN' },
          { id: 'b', gameId: gid, t: 21000, action: 'CLOSE', price: px(21000), notional: 10000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 1820.4, kind: 'CLOSE' },
          { id: 'c', gameId: gid, t: 26000, action: 'SHORT', price: px(26000), notional: 11820.4, sideAfter: 'SHORT', entryPriceAfter: px(26000), realizedPnl: 0, kind: 'OPEN' },
          { id: 'd', gameId: gid, t: 44000, action: 'CLOSE', price: px(44000), notional: 11820.4, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 660.7, kind: 'TIMEOUT_CLOSE' },
        ]
      : [
          { id: 'a', gameId: gid, t: 2000, action: 'LONG', price: px(2000), notional: 10000, sideAfter: 'LONG', entryPriceAfter: px(2000), realizedPnl: 0, kind: 'OPEN' },
          { id: 'b', gameId: gid, t: 9000, action: 'CLOSE', price: px(9000), notional: 10000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: -2120.1, kind: 'CLOSE' },
          { id: 'c', gameId: gid, t: 12000, action: 'LONG', price: px(12000), notional: 7879.9, sideAfter: 'LONG', entryPriceAfter: px(12000), realizedPnl: 0, kind: 'OPEN' },
          { id: 'd', gameId: gid, t: 44000, action: 'CLOSE', price: px(44000), notional: 7879.9, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: -1000.45, kind: 'TIMEOUT_CLOSE' },
        ],
  };
  await saveGame(game);
  const dbFile = path.join(process.cwd(), '.data', 'db.json');
  const db = JSON.parse(await fs.readFile(dbFile, 'utf8'));
  db.results[gid] = isWin
    ? {
        gameId: gid, playerId: pid, scenarioId: SCN, challengeId: 'S01-2026-09-20', seasonId: 'S01',
        mode: 'DAILY WICK', pair: 'WICK/USD', startBalance: 10_000, endBalance: 12481.1, pnl: 2481.1,
        roi: 24.811, trades: 2, tradeEvents: 4, wins: 2, losses: 0, winRate: 100, holdTimeMs: 32000,
        maxDrawdownPct: 3.2, score: 1890, rank: 4, rankTotal: 128, percentile: 3.1, durationMs: 45_000,
        resultState: 'PERSONAL_BEST', liquidated: false, verified: true, createdAt: now - 15_000,
      }
    : {
        gameId: gid, playerId: pid, scenarioId: SCN, challengeId: 'S01-2026-09-20', seasonId: 'S01',
        mode: 'DAILY WICK', pair: 'WICK/USD', startBalance: 10_000, endBalance: 6879.45, pnl: -3120.55,
        roi: -31.2055, trades: 2, tradeEvents: 4, wins: 0, losses: 2, winRate: 0, holdTimeMs: 39000,
        maxDrawdownPct: 31.2, score: 96, rank: 96, rankTotal: 128, percentile: 75, durationMs: 45_000,
        resultState: 'WICKED', liquidated: false, verified: true, createdAt: now - 15_000,
      };
  await fs.writeFile(dbFile, JSON.stringify(db));
  return { pid, gid };
}

async function main() {
  await fs.mkdir(path.join(process.cwd(), 'public', 'examples'), { recursive: true });
  for (const kind of ['win', 'loss'] as const) {
    const { pid, gid } = await seed(kind);
    const { cardId } = await gameResultCard(gid);
    const png = await readCardAsset(cardId, 'png');
    await fs.writeFile(path.join(process.cwd(), 'public', 'examples', `card-${kind}.png`), png!);
    console.log(kind, '->', `public/examples/card-${kind}.png`);
    const dbFile = path.join(process.cwd(), '.data', 'db.json');
    const db = JSON.parse(await fs.readFile(dbFile, 'utf8'));
    delete db.players[pid];
    delete db.stats[pid];
    delete db.games[gid];
    delete db.results[gid];
    for (const [id, c] of Object.entries(db.cards as Record<string, { playerId: string }>)) {
      if (c.playerId === pid) delete db.cards[id];
    }
    for (const [u, id] of Object.entries(db.usernames as Record<string, string>)) {
      if (id === pid) delete db.usernames[u];
    }
    await fs.writeFile(dbFile, JSON.stringify(db));
  }
  console.log('done — examples rendered, test records cleaned');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
