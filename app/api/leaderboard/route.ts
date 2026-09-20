import { todayChallenge, seasonConfig } from '@/lib/game/challenge';
import { getPlayer } from '@/lib/store/db';
import { promises as fs } from 'fs';
import path from 'path';
import type { GameResult, LeaderboardRow } from '@/lib/types';
import { currentPlayer } from '@/lib/auth/session';
import { ok, failFrom } from '@/lib/api/json';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') ?? 'daily';
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

    const raw = await fs.readFile(path.join(process.cwd(), '.data', 'db.json'), 'utf8').catch(() => null);
    const results: GameResult[] = raw ? Object.values((JSON.parse(raw) as { results: Record<string, GameResult> }).results ?? {}) : [];
    const verified = results.filter((r) => r.verified);

    const challenge = todayChallenge();
    const season = seasonConfig();
    let pool: GameResult[];
    if (scope === 'season') pool = verified.filter((r) => r.seasonId === season.id);
    else if (scope === 'alltime') pool = verified;
    else pool = verified.filter((r) => r.challengeId === challenge.id);

    // Best score per player.
    const best = new Map<string, GameResult>();
    for (const r of pool) {
      const prev = best.get(r.playerId);
      if (!prev || r.score > prev.score) best.set(r.playerId, r);
    }
    const ranked = [...best.values()].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, limit);

    const rows: LeaderboardRow[] = [];
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const p = await getPlayer(r.playerId);
      if (!p) continue;
      const mine = pool.filter((x) => x.playerId === r.playerId);
      const wins = mine.filter((x) => x.pnl > 0).length;
      rows.push({
        rank: i + 1,
        playerId: r.playerId,
        username: p.username,
        avatarUrl: p.avatarUrl,
        title: p.title,
        score: r.score,
        roi: r.roi,
        winRate: mine.length ? (wins / mine.length) * 100 : 0,
        games: mine.length,
        streak: 0,
        gameId: r.gameId,
      });
    }

    const me = await currentPlayer();
    let myRank: number | null = null;
    if (me) {
      const idx = rows.findIndex((r) => r.playerId === me.playerId);
      myRank = idx >= 0 ? rows[idx].rank : null;
    }
    return ok({ scope, challenge: { id: challenge.id, endsAt: challenge.endsAt }, rows, myRank, total: best.size });
  } catch (e) {
    return failFrom(e);
  }
}
