import { requirePlayer } from '@/lib/auth/session';
import { todayChallenge } from '@/lib/game/challenge';
import { eligibleGhostGames, getPlayer, getResult } from '@/lib/store/db';
import { ok, failFrom } from '@/lib/api/json';

export async function GET() {
  try {
    const me = await requirePlayer();
    const challenge = todayChallenge();
    const games = await eligibleGhostGames(challenge.scenarioId, me.playerId);
    const ghosts = await Promise.all(games.map(async (game) => {
      const [player, result] = await Promise.all([getPlayer(game.playerId), getResult(game.id)]);
      return { gameId: game.id, username: player?.username ?? 'ghost', avatarUrl: player?.avatarUrl, score: result?.score ?? 0, pnl: result?.pnl ?? 0, scenarioId: game.scenarioId };
    }));
    return ok({ ghosts });
  } catch (e) {
    return failFrom(e);
  }
}