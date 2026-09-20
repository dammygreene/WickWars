import { getPlayerByUsername, getStats, resultsForPlayer, cardsForPlayer } from '@/lib/store/db';
import { refreshIdentity } from '@/lib/auth/identity';
import type { PublicPlayer } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  try {
    const handle = decodeURIComponent(params.username).replace(/^@/, '');
    let player = await getPlayerByUsername(handle);
    if (!player) return fail('PLAYER_NOT_FOUND', 'Player not found.', 404);
    player = await refreshIdentity(player);
    const stats = await getStats(player.playerId);
    const recentGames = await resultsForPlayer(player.playerId, 10);
    const cards = await cardsForPlayer(player.playerId, 12);
    const data: PublicPlayer & { cards: typeof cards } = {
      playerId: player.playerId,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      title: player.title,
      archetype: player.archetype,
      level: player.level,
      hasX: !!player.x,
      hasWallet: !!player.wallet,
      stats: { ...stats, winRate: stats.games ? (stats.wins / stats.games) * 100 : 0 },
      recentGames,
      cards,
    };
    return ok(data);
  } catch (e) {
    return failFrom(e);
  }
}
