import { currentPlayer } from '@/lib/auth/session';
import { getGame } from '@/lib/store/db';
import { COUNTDOWN_MS } from '@/lib/game/engine';
import { ok, fail, failFrom } from '@/lib/api/json';
import { getGameLeverage } from '@/lib/game/leverage';

/** Owner-only metadata for resuming a server-created active game. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await currentPlayer();
    const game = await getGame(id);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    if (!me || me.playerId !== game.playerId) return fail('FORBIDDEN', 'This run is private.', 403);
    if (game.resultId) return fail('ALREADY_FINISHED', 'This game is already finished.', 409);
    return ok({
      game: {
        id: game.id,
        challengeId: game.challengeId,
        challengeCode: game.challengeCode,
        mode: game.mode,
        pair: game.pair,
        startsAt: game.startsAt,
        endsAt: game.endsAt,
        startBalance: game.startBalance,
        durationMs: Math.max(0, game.endsAt - game.startsAt - COUNTDOWN_MS),
        leverage: getGameLeverage(game),
        countdownMs: COUNTDOWN_MS,
      },
      serverNow: Date.now(),
    });
  } catch (e) {
    return failFrom(e);
  }
}
