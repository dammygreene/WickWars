/**
 * DEV ONLY — seeds the local file-store (.data, gitignored) with realistic
 * players + verified games so leaderboards/profiles/cards can be QA'd visually.
 * Every record flows through the REAL trade validator + finalizer.
 * Never run against production data. Nothing here is committed.
 */
import { saveGame, savePlayer, emptyStats, mutateGame, newId } from '@/lib/store/db';
import { todayChallenge } from '@/lib/game/challenge';
import { buildScenario } from '@/lib/game/scenario';
import { applyTrade } from '@/lib/game/engine';
import { finalizeLocked } from '@/lib/game/finish';
import { scenarioForGame } from '@/lib/game/tick';
import { gameResultCard, allTimeCard } from '@/lib/cards/generate';
import type { Game, PlayerIdentity } from '@/lib/types';

const HANDLES = ['sniperwick', 'jeetmachine', 'wicklord', 'longlisa', 'shortking', 'degen_dan', 'wickhunter', 'paperhands_pete'];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function playSyntheticGame(playerId: string, challengeId: string, rand: () => number): Promise<string> {
  const ch = todayChallenge();
  const now = Date.now();
  const game: Game = {
    id: newId('g'),
    playerId,
    challengeId,
    scenarioId: ch.scenarioId,
    seasonId: ch.seasonId,
    mode: ch.mode,
    pair: ch.pair,
    startsAt: now - 60_000,
    endsAt: now - 15_000,
    startBalance: ch.startingBalance,
    status: 'LIVE',
    trades: [],
    createdAt: now - 60_000,
  };
  const scenario = buildScenario({ scenarioId: ch.scenarioId, seed: ch.scenarioId, difficulty: ch.difficulty });
  // Random valid session: 1-5 round trips + possible timeout-open tail.
  let t = 1500 + rand() * 3000;
  const trips = 1 + Math.floor(rand() * 5);
  for (let i = 0; i < trips && t < 38000; i++) {
    const side = rand() < 0.5 ? 'LONG' : 'SHORT';
    game.trades.push(...applyTrade(game, scenario, side, Math.round(t)));
    t += 3000 + rand() * 9000;
    if (t >= 43000) break;
    try {
      game.trades.push(...applyTrade(game, scenario, 'CLOSE', Math.round(Math.min(t, 44000))));
    } catch {
      break;
    }
    t += 1500 + rand() * 4000;
  }
  if (rand() < 0.3 && t < 40000) {
    // Leave one position open to exercise the timeout-close path.
    game.trades.push(...applyTrade(game, scenario, rand() < 0.5 ? 'LONG' : 'SHORT', Math.round(t)));
  }
  await saveGame(game);
  await mutateGame(game.id, async (g, db) => {
    if (!g) throw new Error('missing');
    finalizeLocked(db, g, scenarioForGame(g), 45_000, false);
  });
  return game.id;
}

async function main() {
  console.log('SEED-DEV: writing LOCAL-ONLY test data to .data/ (gitignored)');
  const ch = todayChallenge();
  const firstGameIds: string[] = [];
  for (let i = 0; i < HANDLES.length; i++) {
    const username = HANDLES[i];
    const rand = rng(1000 + i * 77);
    const p: PlayerIdentity = {
      playerId: newId('p'),
      username,
      displayName: username,
      title: 'WICK NOVICE',
      archetype: 'UNRANKED',
      level: 1,
      guest: true,
      createdAt: Date.now() - 86400_000,
    };
    await savePlayer(p, emptyStats(Date.now() - 86400_000));
    const games = 1 + Math.floor(rand() * 3);
    for (let g = 0; g < games; g++) {
      const gid = await playSyntheticGame(p.playerId, ch.id, rand);
      if (i === 0 && g === 0) firstGameIds.push(gid);
    }
    console.log(`  ${username}: ${games} game(s)`);
  }
  // Mint sample cards for the first dev player (populates card wall UI).
  const db = await import('@/lib/store/db');
  const p0 = await db.getPlayerByUsername(HANDLES[0]);
  if (p0 && firstGameIds[0]) {
    const { cardId } = await gameResultCard(firstGameIds[0]);
    console.log(`  game card: ${cardId}`);
    const at = await allTimeCard(p0.playerId);
    console.log(`  all-time card: ${at.cardId}`);
  }
  console.log('done. wipe with: rm -rf .data');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
