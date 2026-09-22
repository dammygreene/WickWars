import type { BadgeDefinition, Game, GameResult, PlayerAchievements, PlayerBadge, PlayerStats } from '@/lib/types';
import { titleForGames, archetypeForStats } from './identity';
import { minimumEquityPercent } from '@/lib/game/nearMiss';
import { scenarioForGame } from '@/lib/game/tick';

export const BADGES: readonly BadgeDefinition[] = [
  { id: 'wick-whisperer', name: 'WICK WHISPERER', description: 'Complete 5 consecutive ranked runs without liquidation.' },
  { id: 'one-shot', name: 'ONE SHOT', description: 'Win a ranked Wick with exactly one closed trade.' },
  { id: 'paper-hands', name: 'PAPER HANDS', description: 'Close a ranked position within 2 seconds of entry.' },
  { id: 'reversal', name: 'REVERSAL', description: 'Flip direction in a ranked run and finish profitably.' },
  { id: 'survivor', name: 'SURVIVOR', description: 'Finish a ranked run after reaching 6% equity without liquidation.' },
];

function eligible(games: Game[], results: GameResult[]) {
  const resultById = new Map(results.filter((result) => result.verified && (result.runType ?? 'ranked') === 'ranked').map((result) => [result.gameId, result]));
  return games.filter((game) => resultById.has(game.id)).map((game) => ({ game, result: resultById.get(game.id)! }));
}

export function deriveAchievements(games: Game[], results: GameResult[], stats: PlayerStats, previousTitle?: string): PlayerAchievements {
  const runs = eligible(games, results).sort((a, b) => a.result.createdAt - b.result.createdAt);
  const badges: PlayerBadge[] = BADGES.map((definition) => ({ ...definition, earned: false }));
  let consecutiveSurvived = 0;
  let maxConsecutiveSurvived = 0;
  for (const { game, result } of runs) {
    consecutiveSurvived = result.liquidated ? 0 : consecutiveSurvived + 1;
    maxConsecutiveSurvived = Math.max(maxConsecutiveSurvived, consecutiveSurvived);
    if (result.pnl > 0 && result.trades === 1) badges[1].earned = true;
    const entries = game.trades.filter((event) => event.kind === 'OPEN');
    if (game.trades.some((event) => event.kind === 'CLOSE' && event.t > 0 && entries.some((entry) => event.t - entry.t <= 2000))) badges[2].earned = true;
    const flipped = game.trades.some((event, index) => event.kind === 'FLIP_CLOSE' && (game.trades[index + 1]?.action === 'LONG' || game.trades[index + 1]?.action === 'SHORT'));
    if (result.pnl > 0 && flipped) badges[3].earned = true;
    if (!result.liquidated) {
      const minimum = minimumEquityPercent(game, result, scenarioForGame(game));
      if (minimum > 5 && minimum <= 6) badges[4].earned = true;
    }
  }
  badges[0].earned = maxConsecutiveSurvived >= 5;
  if (!badges[0].earned) badges[0].progress = { current: maxConsecutiveSurvived, target: 5 };
  const title = titleForGames(runs.length);
  return { title, archetype: archetypeForStats(stats), badges, newBadgeIds: [], titleChanged: !!previousTitle && previousTitle !== title };
}