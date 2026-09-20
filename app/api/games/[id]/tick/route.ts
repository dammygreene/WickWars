import { currentPlayer } from '@/lib/auth/session';
import { mutateGame } from '@/lib/store/db';
import { computeTick } from '@/lib/game/tick';
import { trackEvent } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await currentPlayer();
    const out = await mutateGame(params.id, async (game, db) => {
      if (!game) return { error: 'GAME_NOT_FOUND' as const };
      // Ticks are owner-only until finished (prevents peeking at others' live runs).
      if (me?.playerId !== game.playerId && !game.resultId) return { error: 'FORBIDDEN' as const };
      const tick = computeTick(db, game, Date.now(), true);
      return { tick };
    });
    if ('error' in out) {
      if (out.error === 'GAME_NOT_FOUND') return fail('GAME_NOT_FOUND', 'Game not found.', 404);
      return fail('FORBIDDEN', 'This run is private until it finishes.', 403);
    }
    if (out.tick.result && (out.tick.status === 'FINISHED' || out.tick.status === 'LIQUIDATED')) {
      // Best-effort funnel event (dedupe not critical).
      await trackEvent('game_completed');
    }
    return ok(out.tick);
  } catch (e) {
    return failFrom(e);
  }
}
