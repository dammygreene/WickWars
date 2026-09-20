import { requirePlayer } from '@/lib/auth/session';
import { todayChallenge } from '@/lib/game/challenge';
import { COUNTDOWN_MS } from '@/lib/game/engine';
import { newId, saveGame, trackEvent } from '@/lib/store/db';
import type { Game } from '@/lib/types';
import { ok, failFrom } from '@/lib/api/json';

export async function POST() {
  try {
    const me = await requirePlayer();
    const challenge = todayChallenge();
    if (challenge.status !== 'LIVE') {
      return ok({ error: 'CHALLENGE_NOT_LIVE' }, { status: 409 });
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
