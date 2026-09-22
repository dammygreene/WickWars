import { gamesForPlayer, getPlayerByUsername, getStats, rankedResultsForPlayer, resultsForPlayer, cardsForPlayer } from '@/lib/store/db';
import { refreshIdentity } from '@/lib/auth/identity';
import type { PublicPlayer, StreakCalendar } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';
import { buildStreakCalendar, longestDailyStreak, STREAK_CALENDAR_DAYS } from '@/lib/game/streak';
import { deriveAchievements } from '@/lib/auth/achievements';

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    const handle = decodeURIComponent(username).replace(/^@/, '');
    let player = await getPlayerByUsername(handle);
    if (!player) return fail('PLAYER_NOT_FOUND', 'Player not found.', 404);
    player = await refreshIdentity(player);
    const stats = await getStats(player.playerId);
    const achievements = deriveAchievements(await gamesForPlayer(player.playerId), await resultsForPlayer(player.playerId, 500), stats, player.title);
    const rankedHistory = await rankedResultsForPlayer(player.playerId);
    const streakCalendar = buildStreakCalendar(rankedHistory, new Date(), STREAK_CALENDAR_DAYS);
    const recentGames = await resultsForPlayer(player.playerId, 10);
    const cards = await cardsForPlayer(player.playerId, 12);
    const data: PublicPlayer & { cards: typeof cards; streakCalendar: StreakCalendar; achievements: typeof achievements } = {
      playerId: player.playerId,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      title: player.title,
      archetype: player.archetype,
      level: player.level,
      hasX: !!player.x,
      hasWallet: !!player.wallet,
      stats: { ...stats, longestStreak: longestDailyStreak(rankedHistory), winRate: stats.games ? (stats.wins / stats.games) * 100 : 0 },
      streakCalendar,
      achievements,
      recentGames,
      cards,
    };
    return ok(data);
  } catch (e) {
    return failFrom(e);
  }
}
