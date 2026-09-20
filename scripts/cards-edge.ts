/** Dev-only: render card edge cases to /tmp for visual QA. */
import { promises as fs } from 'fs';
import path from 'path';
import http from 'http';
import { saveGame, savePlayer, emptyStats } from '@/lib/store/db';
import { gameResultCard } from '@/lib/cards/generate';
import { readCardAsset } from '@/lib/cards/render';
import { buildScenario, priceAt } from '@/lib/game/scenario';
import type { Game, TradeEvent } from '@/lib/types';

const now = Date.now();
const SCN = 'scn-S01-2026-09-20';

interface Case {
  name: string;
  username: string;
  pnl: number;
  roi: number;
  score: number;
  rank: number;
  rankTotal: number;
  winRate: number;
  trades: TradeEvent[];
  avatarUrl?: string;
}

function ev(i: number, gid: string, t: number, action: TradeEvent['action'], price: number, kind: TradeEvent['kind'], rpnl = 0): TradeEvent {
  return { id: `e${i}`, gameId: gid, t, action, price, notional: 10000, sideAfter: action === 'CLOSE' ? 'FLAT' : action, entryPriceAfter: action === 'CLOSE' ? null : price, realizedPnl: rpnl, kind };
}

async function avatarServer(): Promise<{ url: string; close: () => void }> {
  // 96px gradient PNG avatar served over local HTTP (resvg-compatible path).
  const sharp = (await import('sharp')).default;
  const buf = await sharp({
    create: { width: 96, height: 96, channels: 4, background: { r: 53, g: 229, b: 139, alpha: 1 } },
  })
    .composite([{ input: Buffer.from('<svg width="96" height="96"><circle cx="48" cy="48" r="30" fill="#08090C"/></svg>'), top: 0, left: 0 }])
    .png()
    .toBuffer();
  const srv = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length });
    res.end(buf);
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}/av.png`, close: () => srv.close() };
}

async function main() {
  const s = buildScenario({ scenarioId: SCN, seed: SCN });
  const px = (t: number) => Math.round(priceAt(s, t) * 10000) / 10000;
  const av = await avatarServer();

  const cases: Case[] = [
    {
      name: 'loss', username: 'jeetmachine', pnl: -3120.55, roi: -31.21, score: 96, rank: 96, rankTotal: 128, winRate: 0,
      trades: [ev(1, 'g', 2000, 'LONG', px(2000), 'OPEN'), ev(2, 'g', 44000, 'CLOSE', px(44000), 'TIMEOUT_CLOSE', -3120.55)],
    },
    {
      name: 'longname', username: 'thegreatestdegenever', pnl: 410.2, roi: 4.1, score: 812, rank: 12, rankTotal: 128, winRate: 100,
      trades: [ev(1, 'g', 5000, 'SHORT', px(5000), 'OPEN'), ev(2, 'g', 30000, 'CLOSE', px(30000), 'CLOSE', 410.2)],
    },
    {
      name: 'notrades', username: 'ghost', pnl: 0, roi: 0, score: 150, rank: 120, rankTotal: 128, winRate: 0, trades: [],
    },
    {
      name: 'huge', username: 'whale', pnl: 184291.72, roi: 1842.92, score: 9999, rank: 1, rankTotal: 4096, winRate: 100,
      trades: [ev(1, 'g', 1000, 'LONG', px(1000), 'OPEN'), ev(2, 'g', 44000, 'CLOSE', px(44000), 'TIMEOUT_CLOSE', 184291.72)],
    },
    {
      name: 'tiny', username: 'dust', pnl: 0.03, roi: 0.0, score: 402, rank: 64, rankTotal: 128, winRate: 100,
      trades: [ev(1, 'g', 8000, 'LONG', px(8000), 'OPEN'), ev(2, 'g', 12000, 'CLOSE', px(12000), 'CLOSE', 0.03)],
    },
    {
      name: 'avatar', username: 'pfpuser', pnl: 900.0, roi: 9.0, score: 1100, rank: 7, rankTotal: 128, winRate: 50, avatarUrl: av.url,
      trades: [ev(1, 'g', 4000, 'LONG', px(4000), 'OPEN'), ev(2, 'g', 20000, 'CLOSE', px(20000), 'CLOSE', 900)],
    },
  ];

  for (const c of cases) {
    const pid = `p_edge_${c.name}`;
    const gid = `g_edge_${c.name}`;
    await savePlayer(
      { playerId: pid, username: c.username, displayName: c.username, avatarUrl: c.avatarUrl, title: 'WICK TRADER', archetype: 'THE GRINDER', level: 2, guest: true, createdAt: now },
      emptyStats(now),
    );
    const trades = c.trades.map((t) => ({ ...t, gameId: gid }));
    const game: Game = {
      id: gid, playerId: pid, challengeId: 'S01-2026-09-20', scenarioId: SCN, seasonId: 'S01',
      mode: 'DAILY WICK', pair: 'WICK/USD', startsAt: now - 60_000, endsAt: now - 15_000,
      startBalance: 10_000, status: 'FINISHED', resultId: gid, createdAt: now - 60_000, trades,
    };
    await saveGame(game);
    const dbFile = path.join(process.cwd(), '.data', 'db.json');
    const db = JSON.parse(await fs.readFile(dbFile, 'utf8'));
    const closed = trades.filter((t) => t.action === 'CLOSE').length;
    db.results[gid] = {
      gameId: gid, playerId: pid, scenarioId: SCN, challengeId: 'S01-2026-09-20', seasonId: 'S01',
      mode: 'DAILY WICK', pair: 'WICK/USD', startBalance: 10_000, endBalance: 10000 + c.pnl, pnl: c.pnl,
      roi: c.roi, trades: closed, tradeEvents: trades.length, wins: c.winRate > 0 ? closed : 0,
      losses: c.winRate > 0 ? 0 : closed, winRate: c.winRate, holdTimeMs: 30000, maxDrawdownPct: 2,
      score: c.score, rank: c.rank, rankTotal: c.rankTotal, percentile: (c.rank / c.rankTotal) * 100,
      durationMs: 45_000, resultState: c.pnl >= 0 ? 'PROFITABLE' : 'WICKED',
      liquidated: false, verified: true, createdAt: now - 15_000,
    };
    await fs.writeFile(dbFile, JSON.stringify(db));

    const { cardId } = await gameResultCard(gid);
    const png = await readCardAsset(cardId, 'png');
    await fs.writeFile(`/tmp/ww-edge-${c.name}.png`, png!);
    console.log(c.name, '->', `/tmp/ww-edge-${c.name}.png`);

    const db2 = JSON.parse(await fs.readFile(dbFile, 'utf8'));
    delete db2.players[pid];
    delete db2.stats[pid];
    delete db2.games[gid];
    delete db2.results[gid];
    delete db2.usernames[c.username.toLowerCase()];
    for (const [id, cc] of Object.entries(db2.cards as Record<string, { playerId: string }>)) {
      if (cc.playerId === pid) delete db2.cards[id];
    }
    await fs.writeFile(dbFile, JSON.stringify(db2));
  }
  av.close();
  console.log('edge cases done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
