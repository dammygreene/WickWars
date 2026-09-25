import { requirePlayer } from '@/lib/auth/session';
import { todayChallenge } from '@/lib/game/challenge';
import { COUNTDOWN_MS } from '@/lib/game/engine';
import { eligibleGhostGames, findActiveGame, getChallenge, getGame, getResult, newId, onboardingStatus, saveGame, trackEvent } from '@/lib/store/db';
import { ONBOARDING_CHALLENGE_ID, ONBOARDING_DURATION_MS, ONBOARDING_SCENARIO_ID } from '@/lib/game/onboarding';
import { regimeById, regimeForDay, publicRegime } from '@/lib/game/regime';
import { getGameLeverage, parseLeverage, DEFAULT_RULES_VERSION } from '@/lib/game/leverage';
import type { Game } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';
import { rateLimit, clientKey } from '@/lib/api/ratelimit';
import { logEvent } from '@/lib/server/log';

export async function POST(req: Request) {
  try {
    const me = await requirePlayer();
    const body = (await req.json().catch(() => ({}))) as { runType?: string; challengeCode?: string; ghostRunId?: string; leverage?: unknown };
    const onboarding = body.runType === 'onboarding';
    const practice = body.runType === 'practice';
    const challengeRun = Boolean(body.challengeCode);
    const ghostRun = body.runType === 'ghost';
    const hasLeverage = Object.prototype.hasOwnProperty.call(body, 'leverage');
    const requestedLeverage = hasLeverage ? parseLeverage(body.leverage) : 10;
    if (requestedLeverage == null) return fail('INVALID_LEVERAGE', 'Choose a supported leverage value.', 400);
    if (body.runType && !onboarding && !practice && !ghostRun && body.runType !== 'ranked' && body.runType !== 'challenge') {
      return fail('INVALID_RUN_TYPE', 'That run type is not available.', 400);
    }
    if (practice && body.challengeCode) return fail('INVALID_RUN_TYPE', 'Choose practice or challenge.', 400);
    if (onboarding && body.challengeCode) return fail('INVALID_RUN_TYPE', 'Choose onboarding or challenge.', 400);
    if (ghostRun && (body.challengeCode || !body.ghostRunId)) return fail('INVALID_RUN_TYPE', 'Choose a compatible ghost.', 400);
    if (onboarding && requestedLeverage !== 10) return fail('INVALID_LEVERAGE', 'Onboarding is fixed at 10x.', 400);

    // Guard against start-spam (double clicks, stuck loops, scripted farming).
    const rl = rateLimit(`start:${clientKey(req, me.playerId)}`, 12, 5 * 60_000);
    if (!rl.ok) {
      return fail('RATE_LIMITED', 'Too many starts — take a breath and retry shortly.', 429, {
        'Retry-After': String(rl.retryAfterS),
      });
    }

    const daily = todayChallenge();
    if (onboarding) {
      const status = await onboardingStatus(me.playerId);
      if (!status.eligible && !status.activeGameId) return fail('ONBOARDING_UNAVAILABLE', 'Onboarding is already complete.', 409);
      const existing = status.activeGameId ? await getGame(status.activeGameId) : null;
      if (existing) return createdGameResponse(existing, ONBOARDING_DURATION_MS);
      const now = Date.now();
      const game: Game = {
        id: newId('g'), playerId: me.playerId, challengeId: ONBOARDING_CHALLENGE_ID, scenarioId: ONBOARDING_SCENARIO_ID, leverage: 10, rulesVersion: DEFAULT_RULES_VERSION,
        seasonId: 'ONBOARDING', runType: 'onboarding', mode: 'ONBOARDING', pair: 'WICK/USD', startsAt: now + COUNTDOWN_MS,
        endsAt: now + COUNTDOWN_MS + ONBOARDING_DURATION_MS, startBalance: 10_000, status: 'COUNTDOWN', trades: [], createdAt: now,
      };
      await saveGame(game);
      await trackEvent('onboarding_started');
      return createdGameResponse(game, ONBOARDING_DURATION_MS);
    }
    if (ghostRun) {
      const dailyGhosts = await eligibleGhostGames(daily.scenarioId, me.playerId, 50);
      const source = dailyGhosts.find((game) => game.id === body.ghostRunId);
      if (!source) return fail('GHOST_UNAVAILABLE', 'That ghost is no longer available.', 409);
      if (hasLeverage && requestedLeverage !== getGameLeverage(source)) return fail('INVALID_LEVERAGE', 'Ghost leverage must match the source run.', 400);
      const existing = await findActiveGame(me.playerId);
      if (existing && existing.runType === 'ghost' && existing.ghostSourceGameId === source.id) return createdGameResponse(existing, daily.durationMs);
      const now = Date.now();
      const game: Game = {
        id: newId('g'), playerId: me.playerId, challengeId: daily.id, scenarioId: daily.scenarioId, seasonId: daily.seasonId,
        runType: 'ghost', ghostSourceGameId: source.id, regimeId: source.regimeId ?? daily.regime.id, regimeVersion: source.regimeVersion ?? daily.regime.version, marketActorsVersion: source.marketActorsVersion ?? 'v1', leverage: source.leverage ?? 10, rulesVersion: source.rulesVersion ?? DEFAULT_RULES_VERSION, mode: 'GHOST DUEL', pair: daily.pair, startsAt: now + COUNTDOWN_MS,
        endsAt: now + COUNTDOWN_MS + daily.durationMs, startBalance: daily.startingBalance, status: 'COUNTDOWN', trades: [], createdAt: now,
      };
      await saveGame(game);
      await trackEvent('ghost_game_started');
      return createdGameResponse(game, daily.durationMs);
    }
    const shared = body.challengeCode ? await getChallenge(body.challengeCode) : null;
    let sharedRegime: ReturnType<typeof publicRegime> | undefined;
    let sharedMarketActorsVersion: string | undefined;
    if (body.challengeCode && !shared) return fail('CHALLENGE_NOT_FOUND', 'That challenge link is invalid or expired.', 404);
    if (shared) {
      const original = await getGame(shared.challengerGameId);
      const originalResult = await getResult(shared.challengerGameId);
      if (!original || !originalResult?.verified || original.scenarioId !== shared.scenarioId || original.challengeId !== shared.challengeId) {
        return fail('CHALLENGE_NOT_FOUND', 'That challenge is no longer available.', 404);
      }
      if (original.regimeId && original.regimeVersion) {
        const regime = regimeById(original.regimeId, original.regimeVersion);
        if (regime) sharedRegime = publicRegime(regime);
      }
      sharedMarketActorsVersion = original.marketActorsVersion ?? shared.marketActorsVersion;
    }
    if (!body.challengeCode && daily.status !== 'LIVE') {
      return fail('CHALLENGE_NOT_LIVE', "Today's wick isn't live — new rounds drop at 00:00 UTC.", 409);
    }
    if (!body.challengeCode && requestedLeverage !== (practice ? requestedLeverage : 10)) return fail('INVALID_LEVERAGE', 'Ranked Daily Wick is fixed at 10x.', 400);
    if (shared && hasLeverage && requestedLeverage !== (shared.leverage ?? 10)) return fail('INVALID_LEVERAGE', 'Challenge leverage must match the source run.', 400);
    const challenge = shared
      ? { id: shared.challengeId, seasonId: shared.seasonId, scenarioId: shared.scenarioId, pair: shared.pair, durationMs: daily.durationMs, leverage: shared.leverage ?? 10, startingBalance: daily.startingBalance, mode: 'CHALLENGE', regime: sharedRegime, marketActorsVersion: sharedMarketActorsVersion }
      : { ...daily, marketActorsVersion: 'v1' };

    // One live run per player. An in-flight game is returned in the exact
    // "created game" shape so the client transparently resumes it instead of
    // erroring (e.g. double-tab or refresh mid-run).
    const existing = await findActiveGame(me.playerId);
    if (existing && existing.challengeId === challenge.id && existing.challengeCode === body.challengeCode && (existing.runType ?? 'ranked') === (challengeRun ? 'challenge' : practice ? 'practice' : 'ranked')) {
      return ok({
        game: {
          id: existing.id,
          challengeId: existing.challengeId,
          challengeCode: existing.challengeCode,
          mode: existing.mode,
          pair: existing.pair,
          startsAt: existing.startsAt,
          endsAt: existing.endsAt,
          startBalance: existing.startBalance,
          durationMs: challenge.durationMs,
          leverage: getGameLeverage(existing),
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
      runType: challengeRun ? 'challenge' : practice ? 'practice' : 'ranked',
      challengeCode: body.challengeCode,
      regimeId: challenge.regime?.id,
      regimeVersion: challenge.regime?.version,
      marketActorsVersion: challenge.marketActorsVersion ?? 'v1',
      leverage: challengeRun ? (parseLeverage(challenge.leverage) ?? 10) : practice ? requestedLeverage : 10,
      rulesVersion: DEFAULT_RULES_VERSION,
      mode: challengeRun ? 'CHALLENGE' : practice ? 'PRACTICE' : challenge.mode,
      pair: challenge.pair,
      startsAt: now + COUNTDOWN_MS,
      endsAt: now + COUNTDOWN_MS + challenge.durationMs,
      startBalance: challenge.startingBalance,
      status: 'COUNTDOWN',
      trades: [],
      createdAt: now,
    };
    await saveGame(game);
    logEvent('game_created', { gameId: game.id, playerId: me.playerId, challengeId: game.challengeId });
    await trackEvent('game_started');
    return createdGameResponse(game, challenge.durationMs);
  } catch (e) {
    return failFrom(e);
  }
}

function createdGameResponse(game: Game, durationMs: number) {
  return ok({
      game: {
        id: game.id,
        challengeId: game.challengeId,
          challengeCode: game.challengeCode,
        mode: game.mode,
        pair: game.pair,
        startsAt: game.startsAt,
        endsAt: game.endsAt,
        startBalance: game.startBalance,
        durationMs,
        leverage: getGameLeverage(game),
        countdownMs: COUNTDOWN_MS,
      },
      serverNow: Date.now(),
    });
}
