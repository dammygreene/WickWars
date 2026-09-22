import type { DailyRecap, Game, GameResult } from '@/lib/types';
import { challengeForDay } from './challenge';
import { buildScenario } from './scenario';
import { publicRegime, regimeById } from './regime';

export function buildDailyRecap(day: string, games: Game[], results: GameResult[], now = new Date()): DailyRecap | null {
  const challenge = challengeForDay(day);
  if (now.getTime() < new Date(challenge.endsAt).getTime()) return null;

  const eligible = results.filter((result) => result.verified && (result.runType ?? 'ranked') === 'ranked' && result.challengeId === challenge.id);
  const best = new Map<string, GameResult>();
  for (const result of eligible) {
    const previous = best.get(result.playerId);
    if (!previous || result.score > previous.score || (result.score === previous.score && result.createdAt < previous.createdAt)) best.set(result.playerId, result);
  }
  const population = [...best.values()];
  const sourceGames = new Map(games.filter((game) => best.has(game.playerId)).map((game) => [game.id, game]));
  const directions = { LONG: 0, SHORT: 0 };
  for (const result of population) {
    const game = sourceGames.get(result.gameId);
    for (const event of game?.trades ?? []) {
      if (event.kind === 'OPEN' && (event.action === 'LONG' || event.action === 'SHORT')) directions[event.action]++;
    }
  }
  const scenarioGame = population.map((result) => sourceGames.get(result.gameId)).find(Boolean);
  const storedRegime = scenarioGame?.regimeId && scenarioGame.regimeVersion ? regimeById(scenarioGame.regimeId, scenarioGame.regimeVersion) : null;
  const scenario = scenarioGame ? buildScenario({ scenarioId: challenge.scenarioId, seed: challenge.scenarioId, seasonId: challenge.seasonId, difficulty: challenge.difficulty, regime: storedRegime ?? undefined }) : null;
  let biggestWickPercent: number | null = null;
  if (scenario) {
    for (let index = 1; index < scenario.prices.length; index++) {
      const move = Math.abs((scenario.prices[index] / scenario.prices[index - 1] - 1) * 100);
      biggestWickPercent = Math.max(biggestWickPercent ?? 0, move);
    }
    biggestWickPercent = Math.round((biggestWickPercent ?? 0) * 10) / 10;
  }
  const long = directions.LONG;
  const short = directions.SHORT;
  return {
    dayKey: day,
    scenarioId: challenge.scenarioId,
    regime: storedRegime ? publicRegime(storedRegime) : null,
    playerCount: population.length,
    highScore: population.length ? Math.max(...population.map((result) => result.score)) : 0,
    averageScore: population.length ? Math.round(population.reduce((total, result) => total + result.score, 0) / population.length) : 0,
    biggestWickPercent,
    mostUsedDirection: long === short ? null : long > short ? 'LONG' : 'SHORT',
    profitablePlayerPercent: population.length ? Math.round((population.filter((result) => result.pnl > 0).length / population.length) * 1000) / 10 : null,
  };
}