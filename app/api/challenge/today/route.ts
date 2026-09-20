import { todayChallenge } from '@/lib/game/challenge';
import { countChallengeGames, playerBestToday, resultsForChallenge } from '@/lib/store/db';
import { currentPlayer } from '@/lib/auth/session';
import { getPlayer } from '@/lib/store/db';
import { ok } from '@/lib/api/json';

export async function GET() {
  const challenge = todayChallenge();
  const counts = await countChallengeGames(challenge.id);
  const top = (await resultsForChallenge(challenge.id)).slice(0, 3);
  const topRows = await Promise.all(
    top.map(async (r) => {
      const p = await getPlayer(r.playerId);
      return {
        rank: 0,
        score: r.score,
        roi: r.roi,
        username: p?.username ?? 'ghost',
        avatarUrl: p?.avatarUrl,
        gameId: r.gameId,
      };
    }),
  );
  topRows.forEach((r, i) => (r.rank = i + 1));

  const me = await currentPlayer();
  const myBest = me ? await playerBestToday(me.playerId, challenge.id) : null;
  const myRank = myBest
    ? (await resultsForChallenge(challenge.id)).findIndex((r) => r.gameId === myBest.gameId) + 1
    : null;

  return ok({
    challenge,
    counts,
    top: topRows,
    myBest: myBest ? { score: myBest.score, roi: myBest.roi, rank: myRank, gameId: myBest.gameId } : null,
  });
}
