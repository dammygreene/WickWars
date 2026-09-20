import { currentPlayer } from '@/lib/auth/session';
import { cardsForGame, getGame, trackEvent } from '@/lib/store/db';
import { gameResultCard } from '@/lib/cards/generate';
import { ok, fail, failFrom } from '@/lib/api/json';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { gameId: string } }) {
  try {
    const game = await getGame(params.gameId);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    const me = await currentPlayer();
    const existing = await cardsForGame(params.gameId);
    if (existing.length) return ok({ cardId: existing[0].id, cached: true });
    if (!me || me.playerId !== game.playerId) return fail('FORBIDDEN', 'Only the player can mint this card.', 403);
    const { cardId, cached } = await gameResultCard(params.gameId);
    await trackEvent('card_generated');
    return ok({ cardId, cached });
  } catch (e) {
    return failFrom(e);
  }
}
