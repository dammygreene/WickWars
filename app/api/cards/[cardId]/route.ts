import { getCard, getPlayer, getResult, getGame } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const card = await getCard(cardId);
    if (!card) return fail('CARD_NOT_FOUND', 'Card not found.', 404);
    const player = await getPlayer(card.playerId);
    const game = card.gameId ? await getGame(card.gameId) : null;
    const result = card.gameId ? await getResult(card.gameId) : null;
    return ok({
      card,
      player: player ? { username: player.username, avatarUrl: player.avatarUrl, title: player.title } : null,
      game: game ? { id: game.id, mode: game.mode, pair: game.pair } : null,
      result,
    });
  } catch (e) {
    return failFrom(e);
  }
}
