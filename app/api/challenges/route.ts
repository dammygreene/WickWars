import { requirePlayer } from '@/lib/auth/session';
import { canCreateChallenge, getChallenge, getGame, getResult, getChallengeForGame, newId, saveChallenge, trackEvent } from '@/lib/store/db';
import { getGameLeverage } from '@/lib/game/leverage';
import type { ChallengeRecord } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';
import { rateLimit, clientKey } from '@/lib/api/ratelimit';

export async function POST(req: Request) {
  try {
    const me = await requirePlayer();
    const rl = rateLimit(`challenge:${clientKey(req, me.playerId)}`, 20, 60_000);
    if (!rl.ok) return fail('RATE_LIMITED', 'Too many challenge links — retry shortly.', 429);
    const body = (await req.json().catch(() => ({}))) as { gameId?: string };
    if (!body.gameId) return fail('GAME_NOT_FOUND', 'Completed run required.', 404);

    const game = await getGame(body.gameId);
    if (!game || game.playerId !== me.playerId) return fail('FORBIDDEN', 'Only the player can challenge from this run.', 403);
    const result = await getResult(game.id);
    if (!result || !result.verified) return fail('RESULT_NOT_VERIFIED', 'That run is not ready to challenge.', 422);
    if (!canCreateChallenge(game) || !canCreateChallenge(result)) return fail('CHALLENGE_SOURCE_NOT_ALLOWED', 'That run type cannot create a challenge.', 422);

    const existing = await getChallengeForGame(game.id);
    if (existing) return ok({ code: existing.code, cached: true });

    let code = newId('ch');
    while (await getChallenge(code)) code = newId('ch');
    const challenge: ChallengeRecord = {
      code,
      challengerGameId: game.id,
      challengerPlayerId: game.playerId,
      challengerResult: {
        score: result.score,
        pnl: result.pnl,
        roi: result.roi,
        liquidated: result.liquidated,
        seasonId: result.seasonId,
        pair: result.pair,
        mode: result.mode,
      },
      challengeId: game.challengeId,
      scenarioId: game.scenarioId,
      seasonId: game.seasonId,
      pair: game.pair,
      regimeId: game.regimeId,
      regimeVersion: game.regimeVersion,
      marketActorsVersion: game.marketActorsVersion,
      leverage: getGameLeverage(game),
      rulesVersion: game.rulesVersion ?? 'v1',
      createdAt: Date.now(),
    };
    await saveChallenge(challenge);
    await trackEvent('challenge_created');
    return ok({ code: challenge.code, cached: false });
  } catch (e) {
    return failFrom(e);
  }
}