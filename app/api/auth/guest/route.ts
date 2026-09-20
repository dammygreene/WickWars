import { z } from 'zod';
import { setSessionCookie, currentPlayer } from '@/lib/auth/session';
import { createGuest } from '@/lib/auth/identity';
import { trackEvent } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

const Body = z.object({ username: z.string().trim().max(20).optional() });

export async function POST(req: Request) {
  try {
    const existing = await currentPlayer();
    if (existing) return ok({ player: existing, fresh: false });
    const body = Body.parse(await req.json().catch(() => ({})));
    const player = await createGuest(body.username || undefined);
    setSessionCookie(player.playerId);
    await trackEvent('auth_completed', { method: 0 });
    return ok({ player, fresh: true });
  } catch (e) {
    if (e instanceof z.ZodError) return fail('BAD_USERNAME', e.issues[0]?.message ?? 'Bad username.', 400);
    if (e instanceof Error && e.message === 'USERNAME_TAKEN') return fail('USERNAME_TAKEN', 'That handle is taken.', 409);
    return failFrom(e);
  }
}
