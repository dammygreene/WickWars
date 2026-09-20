import { requirePlayer } from '@/lib/auth/session';
import { trackEvent } from '@/lib/store/db';
import { allTimeCard } from '@/lib/cards/generate';
import { ok, fail, failFrom } from '@/lib/api/json';
import { rateLimit } from '@/lib/api/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  try {
    const me = await requirePlayer();
    const rl = rateLimit(`card:${me.playerId}`, 10, 60_000);
    if (!rl.ok) {
      return fail('RATE_LIMITED', 'Card forge is cooling down — retry shortly.', 429, {
        'Retry-After': String(rl.retryAfterS),
      });
    }
    const { cardId, cached } = await allTimeCard(me.playerId);
    await trackEvent('card_generated');
    return ok({ cardId, cached });
  } catch (e) {
    return failFrom(e);
  }
}
