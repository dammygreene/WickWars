import { currentPlayer } from '@/lib/auth/session';
import { getGame, getResult, mutateGame, withDb, trackEvent } from '@/lib/store/db';
import { computeTick, finishedTick, scenarioForGame } from '@/lib/game/tick';
import { equityAt, LIQUIDATION_EQUITY_RATIO } from '@/lib/game/engine';
import { rateLimit, clientKey } from '@/lib/api/ratelimit';
import { ok, fail, failFrom } from '@/lib/api/json';
import type { Game } from '@/lib/types';

/**
 * Does this game need a write-locked state transition right now (timeout or
 * liquidation finalization)? Pure check — no mutation, no db read.
 */
function pendingFinalization(game: Game, now: number): boolean {
  const scenario = scenarioForGame(game);
  const t = now - game.startsAt;
  if (t >= scenario.durationMs) return true;
  const snap = equityAt(game, scenario, Math.max(0, t));
  return snap.side !== 'FLAT' && snap.equity <= game.startBalance * LIQUIDATION_EQUITY_RATIO;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await currentPlayer();
    // The client polls ~5/s during a run; 900/min is ~3x headroom. This only
    // blunts hammering — normal play never trips it.
    const rl = rateLimit(`tick:${clientKey(req, me?.playerId)}`, 900, 60_000);
    if (!rl.ok) {
      return fail('RATE_LIMITED', 'Too many updates — slowing down.', 429, { 'Retry-After': String(rl.retryAfterS) });
    }

    const game = await getGame(params.id);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    // Ticks are owner-only until finished (prevents peeking at others' live runs).
    if (me?.playerId !== game.playerId && !game.resultId) {
      return fail('FORBIDDEN', 'This run is private until it finishes.', 403);
    }

    // Fast path: finished runs are immutable — serve read-only with zero disk
    // writes (polling used to rewrite the whole store on every 200ms tick).
    if (game.resultId) {
      const result = await getResult(params.id);
      if (result) return ok(finishedTick(game, result));
    }

    const now = Date.now();
    if (!pendingFinalization(game, now)) {
      // Mid-game tick: a pure read (computeTick with commit=false never mutates).
      const tick = await withDb((db) => computeTick(db, game, now, false));
      return ok(tick);
    }

    // Transition tick: finalize under the write lock exactly once.
    const out = await mutateGame(params.id, (g, db) => {
      if (!g) return null;
      return computeTick(db, g, Date.now(), true);
    });
    if (!out) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    if (out.result) {
      // Best-effort funnel event (dedupe not critical).
      await trackEvent('game_completed');
    }
    return ok(out);
  } catch (e) {
    return failFrom(e);
  }
}
