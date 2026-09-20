import { getGame, getResult, getPlayer } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

/** Public result payload (post-game; powers /results + social unfurls). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const game = await getGame(params.id);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    const result = await getResult(params.id);
    if (!result) return fail('RESULT_NOT_FOUND', 'Result not ready yet.', 404);
    const player = await getPlayer(game.playerId);
    return ok({
      result,
      game: { id: game.id, mode: game.mode, pair: game.pair, trades: game.trades },
      player: player ? { username: player.username, avatarUrl: player.avatarUrl, title: player.title } : null,
    });
  } catch (e) {
    return failFrom(e);
  }
}
