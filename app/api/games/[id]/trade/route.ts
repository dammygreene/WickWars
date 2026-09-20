import { z } from 'zod';
import { requirePlayer } from '@/lib/auth/session';
import { mutateGame, trackEvent } from '@/lib/store/db';
import { applyTrade, TradeRejected } from '@/lib/game/engine';
import { computeTick, scenarioForGame } from '@/lib/game/tick';
import { ok, fail, failFrom } from '@/lib/api/json';

const Body = z.object({ action: z.enum(['LONG', 'SHORT', 'CLOSE']) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requirePlayer();
    const { action } = Body.parse(await req.json());
    type Out =
      | { kind: 'game_not_found' }
      | { kind: 'forbidden' }
      | { kind: 'finished' }
      | { kind: 'rejected'; code: string; message: string }
      | { kind: 'ok'; tick: ReturnType<typeof computeTick> };
    const out: Out = await mutateGame(params.id, async (game, db) => {
      if (!game) return { kind: 'game_not_found' } as Out;
      if (game.playerId !== me.playerId) return { kind: 'forbidden' } as Out;
      if (game.resultId) return { kind: 'finished' } as Out;
      const now = Date.now();
      const scenario = scenarioForGame(game);
      const t = now - game.startsAt;
      try {
        const events = applyTrade(game, scenario, action, t);
        game.trades.push(...events);
        if (game.status === 'COUNTDOWN' && t >= 0) game.status = 'LIVE';
        db.games[game.id] = game;
      } catch (e) {
        if (e instanceof TradeRejected) return { kind: 'rejected', code: e.code, message: e.message } as Out;
        throw e;
      }
      const tick = computeTick(db, game, Date.now(), true);
      return { kind: 'ok', tick } as Out;
    });
    if (out.kind === 'rejected') return fail(out.code, out.message, 422);
    if (out.kind === 'game_not_found') return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    if (out.kind === 'forbidden') return fail('FORBIDDEN', 'Not your game.', 403);
    if (out.kind === 'finished') return fail('ALREADY_FINISHED', 'Game already finished.', 409);
    await trackEvent(action === 'CLOSE' ? 'trade_closed' : 'trade_opened');
    return ok(out.tick);
  } catch (e) {
    if (e instanceof z.ZodError) return fail('BAD_REQUEST', 'Invalid trade.', 400);
    return failFrom(e);
  }
}
