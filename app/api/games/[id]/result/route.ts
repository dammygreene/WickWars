import { claimAchievementUnlocks, gamesForPlayer, getChallenge, getGame, getResult, getPlayer, getStats, rankedResultsForPlayer, resultsForPlayer, withDb } from '@/lib/store/db';
import { buildKillCamReplay } from '@/lib/game/replay';
import { scenarioForGame } from '@/lib/game/tick';
import { dailyStreakFromResults } from '@/lib/game/streak';
import { nearMissForResult } from '@/lib/game/nearMiss';
import { publicRegime, regimeById } from '@/lib/game/regime';
import { generateMarketActorPlan, summarizeMarketActors, type PublicMarketActorSummary } from '@/lib/game/actors';
import { deriveAchievements } from '@/lib/auth/achievements';
import { ok, fail, failFrom } from '@/lib/api/json';

/** Public result payload (post-game; powers /results + social unfurls). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const game = await getGame(id);
    if (!game) return fail('GAME_NOT_FOUND', 'Game not found.', 404);
    const result = await getResult(id);
    if (!result) return fail('RESULT_NOT_FOUND', 'Result not ready yet.', 404);
    const player = await getPlayer(game.playerId);
    const scenario = scenarioForGame(game);
    const replay = result.liquidated ? buildKillCamReplay(game, result, scenario) : null;
    const nearMiss = await withDb((db) => nearMissForResult(db, game, result, scenario));
    const challenge = game.challengeCode ? await getChallenge(game.challengeCode) : null;
    const challenger = challenge ? await getResult(challenge.challengerGameId) : null;
    const ghostSource = game.ghostSourceGameId ? await getResult(game.ghostSourceGameId) : null;
    const rankedHistory = await rankedResultsForPlayer(result.playerId);
    const achievementGames = await gamesForPlayer(result.playerId);
    const achievementResults = await resultsForPlayer(result.playerId, 500);
    const achievements = deriveAchievements(achievementGames, achievementResults, await getStats(result.playerId));
    const before = deriveAchievements(achievementGames.filter((item) => item.id !== game.id), achievementResults.filter((item) => item.gameId !== game.id), await getStats(result.playerId));
    const newlyEligible = achievements.badges.filter((badge) => badge.earned && !before.badges.find((old) => old.id === badge.id)?.earned).map((badge) => badge.id);
    achievements.newBadgeIds = await claimAchievementUnlocks(game.id, newlyEligible);
    const rankedResult = (result.runType ?? 'ranked') === 'ranked';
    const resolvedRegime = game.regimeId && game.regimeVersion ? regimeById(game.regimeId, game.regimeVersion) : null;
    const regime = resolvedRegime ? publicRegime(resolvedRegime) : null;

    let marketActivity: PublicMarketActorSummary | null = null;
    if (scenario.marketActorsVersion === 'v1' && game.runType !== 'onboarding') {
      const plan = generateMarketActorPlan({
        seed: scenario.seed,
        durationMs: scenario.durationMs,
        regime: resolvedRegime ?? undefined,
      });
      marketActivity = summarizeMarketActors(plan);
    }

    return ok({
      result,
      leverage: result.leverage ?? 10,
      game: { id: game.id, mode: game.mode, pair: game.pair, trades: game.trades, challengeCode: game.challengeCode },
      replay,
      nearMiss,
      regime,
      marketActivity,
      streak: {
        current: dailyStreakFromResults(rankedHistory),
        rankedResult,
        updated: rankedResult && new Date(result.createdAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
      },
      achievements,
      challenge: challenge && challenger && result.runType === 'challenge' ? {
        code: challenge.code,
        outcome: result.score > challenger.score ? 'opponent_won' : result.score < challenger.score ? 'challenger_won' : 'tie',
        scoreDifference: Math.abs(result.score - challenger.score),
        challenger: {
          username: (await getPlayer(challenger.playerId))?.username ?? 'ghost',
          score: challenger.score,
          pnl: challenger.pnl,
          liquidated: challenger.liquidated,
        },
      } : null,
      ghost: ghostSource && result.runType === 'ghost' ? {
        username: (await getPlayer(ghostSource.playerId))?.username ?? 'ghost',
        score: ghostSource.score,
        pnl: ghostSource.pnl,
        liquidated: ghostSource.liquidated,
      } : null,
      player: player ? { username: player.username, avatarUrl: player.avatarUrl, title: player.title } : null,
    });
  } catch (e) {
    return failFrom(e);
  }
}
