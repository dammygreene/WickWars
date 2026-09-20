import { requirePlayer } from '@/lib/auth/session';
import { trackEvent } from '@/lib/store/db';
import { allTimeCard } from '@/lib/cards/generate';
import { ok, failFrom } from '@/lib/api/json';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  try {
    const me = await requirePlayer();
    const { cardId, cached } = await allTimeCard(me.playerId);
    await trackEvent('card_generated');
    return ok({ cardId, cached });
  } catch (e) {
    return failFrom(e);
  }
}
