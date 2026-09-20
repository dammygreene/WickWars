import { requirePlayer } from '@/lib/auth/session';
import { todayChallenge } from '@/lib/game/challenge';
import { COUNTDOWN_MS } from '@/lib/game/engine';
import { findActiveGame, newId, saveGame, trackEvent } from '@/lib/store/db';
import type { Game } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';
import { rateLimit, clientKey } from '@/lib/api/ratelimit';

export async function POST(req: Request) {
  try {
    const me = await requirePlayer();

    // Guard against start-spam (double clicks, stuck loops, scripted farming).
    const rl = rateLimit(`start:${clientKey(req, me.playerId)}`, 12, 5 * 60_000);
    if (!rl.ok) {
      return fail('RATE_LIMITED', 'Too many starts — take a breath and retry shortly.', 429, {
        'Retry-After': String(rl.retryAfterS),
      });
    }

    const challenge = todayChallenge();
    if (challenge.status !== 'LIVE') {
      return fail('CHALLENGE_NOT_LIVE', "Today's wick isn't live — new rounds drop at 00:00 UTC.", 409);
    }

    // One live run per player. An in-flight game is returned in the exact
    // "created game" shape so the client transparently resumes it instead of
    // erroring (e.g. double-tab or refresh mid-run).
    const existing = await findActiveGame(me.playerId);
    if (existing && existing.challengeId === challenge.id) {
      return ok({
        game: {
          id: existing.id,
          challengeId: existing.challengeId,
          mode: existing.mode,
          pair: existing.pair,
          startsAt: existing.startsAt,
          endsAt: existing.endsAt,
          startBalance: existing.startBalance,
          durationMs: challenge.durationMs,
          leverage: challenge.leverage,
          countdownMs: COUNTDOWN_MS,
        },
        serverNow: Date.now(),
      });
    }

    const now = Date.now();
    const game: Game = {
      id: newId('g'),
      playerId: me.playerId,
      challengeId: challenge.id,
      scenarioId: challenge.scenarioId,
      seasonId: challenge.seasonId,
      mode: challenge.mode,
      pair: challenge.pair,
      startsAt: now + COUNTDOWN_MS,
      endsAt: now + COUNTDOWN_MS + challenge.durationMs,
      startBalance: challenge.startingBalance,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: now,
    };
    await saveGame(game);
    await trackEvent('game_started');
    return ok({
      game: {
        id: game.id,
        challengeId: game.challengeId,
        mode: game.mode,
        pair: game.pair,
        startsAt: game.startsAt,
        endsAt: game.endsAt,
        startBalance: game.startBalance,
        durationMs: challenge.durationMs,
        leverage: challenge.leverage,
        countdownMs: COUNTDOWN_MS,
      },
      serverNow: Date.now(),
    });
  } catch (e) {
    return failFrom(e);
  }
}
