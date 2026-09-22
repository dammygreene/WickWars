import { cardsForGame, getChallenge, getGame, getPlayer, getResult } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';
import { publicRegime, regimeById } from '@/lib/game/regime';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const challenge = await getChallenge(code);
    if (!challenge) return fail('CHALLENGE_NOT_FOUND', 'That challenge link is invalid or expired.', 404);
    const result = await getResult(challenge.challengerGameId);
    if (!result || !result.verified) return fail('CHALLENGE_NOT_FOUND', 'That challenge is no longer available.', 404);
      const sourceGame = await getGame(challenge.challengerGameId);
    const player = await getPlayer(result.playerId);
    const card = (await cardsForGame(challenge.challengerGameId))[0];
    return ok({
      code: challenge.code,
      challenger: {
        username: player?.username ?? 'ghost',
        displayName: player?.displayName ?? 'Wick player',
        avatarUrl: player?.avatarUrl,
        score: result.score,
        pnl: result.pnl,
        roi: result.roi,
        liquidated: result.liquidated,
      },
      seasonId: result.seasonId,
      pair: result.pair,
      mode: result.mode,
      regime: sourceGame?.regimeId && sourceGame.regimeVersion && regimeById(sourceGame.regimeId, sourceGame.regimeVersion)
        ? publicRegime(regimeById(sourceGame.regimeId, sourceGame.regimeVersion)!)
        : null,
      cardId: card?.id ?? null,
      durationMs: 45_000,
      startingBalance: 10_000,
      leverage: 10,
    });
  } catch (e) {
    return failFrom(e);
  }
}