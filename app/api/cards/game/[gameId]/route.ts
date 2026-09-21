import { currentPlayer } from '@/lib/auth/session';
import { cardsForGame, getGame, trackEvent } from '@/lib/store/db';
import { gameResultCard } from '@/lib/cards/generate';
import { ok, fail, failFrom } from '@/lib/api/json';
import { rateLimit } from '@/lib/api/ratelimit';
import { logError } from '@/lib/server/log';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;
    const me = await currentPlayer();
    if (!me) return fail('FORBIDDEN', 'Only the player can mint this card.', 403);
    // Card rendering (resvg @2x + sharp) is the most expensive endpoint — cap it.
    const rl = rateLimit(`card:${me.playerId}`, 10, 60_000);
    if (!rl.ok) {
      return fail('RATE_LIMITED', 'Card forge is cooling down — retry shortly.', 429, {
        'Retry-After': String(rl.retryAfterS),
      });
    }
    const game = await getGame(gameId);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    if (me.playerId !== game.playerId) return fail('FORBIDDEN', 'Only the player can mint this card.', 403);
    const existing = await cardsForGame(gameId);
    if (existing.length) return ok({ cardId: existing[0].id, cached: true });
    const { cardId, cached } = await gameResultCard(gameId);
    await trackEvent('card_generated');
    return ok({ cardId, cached });
  } catch (e) {
    logError('card_generation_failed', e, { gameId: (await params).gameId });
    return failFrom(e);
  }
}
