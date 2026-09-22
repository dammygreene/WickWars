import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logError } from '@/lib/server/log';
import type {
  CardRecord,
  ChallengeRecord,
  Game,
  GameResult,
  PlayerIdentity,
  PlayerStats,
} from '@/lib/types';

export function isRankedRun(run: { runType?: string }): boolean {
  return (run.runType ?? 'ranked') === 'ranked';
}

/** Only ranked and explicitly shareable practice results may seed challenges. */
export function canCreateChallenge(run: { runType?: string }): boolean {
  const runType = run.runType ?? 'ranked';
  return runType === 'ranked' || runType === 'practice';
}

/**
 * File-backed store for MVP (JSON, atomic writes, in-process mutex).
 * All access goes through these repository functions so the backend can move
 * to Postgres/Redis later without touching game, card, or API logic.
 * Runtime data lives in `.data/` (gitignored) — never committed.
 */

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DbShape {
  version: 1;
  players: Record<string, PlayerIdentity>;
  usernames: Record<string, string>; // lower(username) -> playerId
  stats: Record<string, PlayerStats>;
  games: Record<string, Game>;
  results: Record<string, GameResult>; // by gameId
  cards: Record<string, CardRecord>;
  challenges: Record<string, ChallengeRecord>;
  nonces: Record<string, { value: string; exp: number }>;
  analytics: Array<{ e: string; at: number; p?: Record<string, string | number> }>;
  achievementClaims?: Record<string, string[]>;
}

const EMPTY: DbShape = {
  version: 1,
  players: {},
  usernames: {},
  stats: {},
  games: {},
  results: {},
  cards: {},
  challenges: {},
  nonces: {},
  analytics: [],
};

// In-process write mutex (dev/single-instance safe; DB migration path noted above).
let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DbShape;
    if (parsed.version !== 1) return structuredClone(EMPTY);
    return { ...parsed, challenges: parsed.challenges ?? {} };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return structuredClone(EMPTY);
    }
    logError('persistence_read_failed', error, { file: DB_FILE });
    throw error;
  }
}

async function writeDb(db: DbShape): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db));
    await fs.rename(tmp, DB_FILE);
  } catch (error) {
    logError('persistence_write_failed', error, { file: DB_FILE });
    throw error;
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function emptyStats(now = Date.now()): PlayerStats {
  return {
    games: 0,
    wins: 0,
    totalPnl: 0,
    bestScore: 0,
    bestWinPct: 0,
    currentStreak: 0,
    longestStreak: 0,
    peakRank: null,
    seasonsPlayed: [],
    firstPlayedAt: now,
    lastPlayedAt: now,
    totalHoldMs: 0,
    totalTrades: 0,
    longCount: 0,
    shortCount: 0,
    history: [],
  };
}

/* ---------- players ---------- */

export async function getPlayer(playerId: string): Promise<PlayerIdentity | null> {
  const db = await readDb();
  return db.players[playerId] ?? null;
}

export async function getPlayerByUsername(username: string): Promise<PlayerIdentity | null> {
  const db = await readDb();
  const id = db.usernames[username.toLowerCase()];
  return id ? (db.players[id] ?? null) : null;
}

export async function getPlayerByXId(xUserId: string): Promise<PlayerIdentity | null> {
  const db = await readDb();
  return Object.values(db.players).find((p) => p.x?.userId === xUserId) ?? null;
}

export async function getStats(playerId: string): Promise<PlayerStats> {
  const db = await readDb();
  return db.stats[playerId] ?? emptyStats();
}

export async function savePlayer(p: PlayerIdentity, s?: PlayerStats): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    const prev = db.players[p.playerId];
    if (prev && prev.username.toLowerCase() !== p.username.toLowerCase()) {
      delete db.usernames[prev.username.toLowerCase()];
    }
    db.players[p.playerId] = p;
    db.usernames[p.username.toLowerCase()] = p.playerId;
    if (s) db.stats[p.playerId] = s;
    else if (!db.stats[p.playerId]) db.stats[p.playerId] = emptyStats();
    await writeDb(db);
  });
}

export async function usernameTaken(username: string, exceptPlayerId?: string): Promise<boolean> {
  const db = await readDb();
  const id = db.usernames[username.toLowerCase()];
  return !!id && id !== exceptPlayerId;
}

/* ---------- games & results ---------- */

export async function saveGame(g: Game): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.games[g.id] = g;
    await writeDb(db);
  });
}

/** Test-fixture cleanup; never called by product routes. */
export async function deleteGhostFixture(gameId: string, playerId: string): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    const ghostGameIds = Object.values(db.games).filter((game) => game.ghostSourceGameId === gameId).map((game) => game.id);
    delete db.games[gameId];
    delete db.results[gameId];
    if (db.achievementClaims) delete db.achievementClaims[gameId];
    for (const [code, challenge] of Object.entries(db.challenges)) if (challenge.challengerGameId === gameId) delete db.challenges[code];
    delete db.stats[playerId];
    delete db.players[playerId];
    for (const [username, id] of Object.entries(db.usernames)) if (id === playerId) delete db.usernames[username];
    for (const ghostGameId of ghostGameIds) {
      const ghost = db.games[ghostGameId];
      if (ghost) {
        delete db.stats[ghost.playerId];
        delete db.players[ghost.playerId];
        for (const [username, id] of Object.entries(db.usernames)) if (id === ghost.playerId) delete db.usernames[username];
      }
      delete db.games[ghostGameId];
      delete db.results[ghostGameId];
    }
    await writeDb(db);
  });
}

export async function getGame(id: string): Promise<Game | null> {
  const db = await readDb();
  return db.games[id] ?? null;
}

export async function claimAchievementUnlocks(gameId: string, badgeIds: string[]): Promise<string[]> {
  if (!badgeIds.length) return [];
  return withLock(async () => {
    const db = await readDb();
    db.achievementClaims ??= {};
    const claimed = new Set(db.achievementClaims[gameId] ?? []);
    const fresh = badgeIds.filter((id) => !claimed.has(id));
    db.achievementClaims[gameId] = [...claimed, ...fresh];
    await writeDb(db);
    return fresh;
  });
}

/** Read-only db access for pure computations (no writes, no lock). */
export async function withDb<T>(fn: (db: DbShape) => T): Promise<T> {
  const db = await readDb();
  return fn(db);
}

/**
 * A player's still-active unfinished game (result pending and its window has
 * not long expired). Games whose window ended more than `graceMs` ago are
 * considered abandoned orphans and never block a fresh start.
 */
export async function findActiveGame(playerId: string, graceMs = 120_000): Promise<Game | null> {
  const db = await readDb();
  const now = Date.now();
  return (
    Object.values(db.games).find(
      (g) => g.playerId === playerId && !g.resultId && g.endsAt > now - graceMs,
    ) ?? null
  );
}

export async function onboardingStatus(playerId: string): Promise<{ eligible: boolean; activeGameId: string | null }> {
  const db = await readDb();
  const active = Object.values(db.games).find((game) => game.playerId === playerId && game.runType === 'onboarding' && !game.resultId);
  const hasHistory = Object.values(db.games).some((game) => game.playerId === playerId);
  return { eligible: !hasHistory, activeGameId: active?.id ?? null };
}

/** Atomic trade append + finish. The mutation fn runs inside the write lock. */
export async function mutateGame<T>(id: string, fn: (g: Game | null, db: DbShape) => Promise<T> | T): Promise<T> {
  return withLock(async () => {
    const db = await readDb();
    const g = db.games[id] ?? null;
    const out = await fn(g, db);
    await writeDb(db);
    return out;
  });
}

export async function saveResult(r: GameResult): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.results[r.gameId] = r;
    const g = db.games[r.gameId];
    if (g) {
      g.status = r.liquidated ? 'LIQUIDATED' : 'FINISHED';
      g.resultId = r.gameId;
      db.games[r.gameId] = g;
    }
    await writeDb(db);
  });
}

export async function getResult(gameId: string): Promise<GameResult | null> {
  const db = await readDb();
  return db.results[gameId] ?? null;
}

export async function getChallenge(code: string): Promise<ChallengeRecord | null> {
  const db = await readDb();
  return db.challenges[code] ?? null;
}

export async function getChallengeForGame(gameId: string): Promise<ChallengeRecord | null> {
  const db = await readDb();
  return Object.values(db.challenges).find((challenge) => challenge.challengerGameId === gameId) ?? null;
}

export async function saveChallenge(challenge: ChallengeRecord): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.challenges[challenge.code] = challenge;
    await writeDb(db);
  });
}

export async function resultsForChallenge(challengeId: string): Promise<GameResult[]> {
  const db = await readDb();
  return Object.values(db.results)
    .filter((r) => r.challengeId === challengeId && r.verified && isRankedRun(r))
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

export async function resultsForPlayer(playerId: string, limit = 50): Promise<GameResult[]> {
  const db = await readDb();
  return Object.values(db.results)
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function gamesForPlayer(playerId: string, limit = 500): Promise<Game[]> {
  const db = await readDb();
  return Object.values(db.games).filter((game) => game.playerId === playerId).sort((a, b) => a.createdAt - b.createdAt).slice(-limit);
}

export async function rankedResultsForPlayer(playerId: string, since?: number): Promise<GameResult[]> {
  const db = await readDb();
  return Object.values(db.results)
    .filter((result) => result.playerId === playerId && result.verified && isRankedRun(result) && (since == null || result.createdAt >= since))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function eligibleGhostGames(scenarioId: string, excludePlayerId: string, limit = 8): Promise<Game[]> {
  const db = await readDb();
  return Object.values(db.games)
    .filter((game) => game.scenarioId === scenarioId && game.playerId !== excludePlayerId && (game.runType ?? 'ranked') === 'ranked' && !!game.resultId && !!db.results[game.id]?.verified && game.trades.length > 0)
    .sort((a, b) => (db.results[b.id]?.score ?? 0) - (db.results[a.id]?.score ?? 0))
    .slice(0, limit);
}

export async function playerBestToday(playerId: string, challengeId: string): Promise<GameResult | null> {
  const db = await readDb();
  const mine = Object.values(db.results).filter((r) => r.playerId === playerId && r.challengeId === challengeId && r.verified && isRankedRun(r));
  if (!mine.length) return null;
  return mine.sort((a, b) => b.score - a.score)[0];
}

export async function countChallengeGames(challengeId: string): Promise<{ games: number; players: number }> {
  const db = await readDb();
  const rs = Object.values(db.results).filter((r) => r.challengeId === challengeId && r.verified && isRankedRun(r));
  return { games: rs.length, players: new Set(rs.map((r) => r.playerId)).size };
}

/* ---------- cards ---------- */

export async function saveCard(c: CardRecord): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.cards[c.id] = c;
    await writeDb(db);
  });
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const db = await readDb();
  return db.cards[id] ?? null;
}

export async function findCardByRev(playerId: string, type: CardRecord['type'], dataRev: string): Promise<CardRecord | null> {
  const db = await readDb();
  const found = Object.values(db.cards).find((c) => c.playerId === playerId && c.type === type && c.dataRev === dataRev);
  return found ?? null;
}

export async function cardsForGame(gameId: string): Promise<CardRecord[]> {
  const db = await readDb();
  return Object.values(db.cards)
    .filter((c) => c.gameId === gameId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function cardsForPlayer(playerId: string, limit = 24): Promise<CardRecord[]> {
  const db = await readDb();
  return Object.values(db.cards)
    .filter((c) => c.playerId === playerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/* ---------- wallet nonces ---------- */

export async function setNonce(address: string, value: string, ttlMs = 5 * 60_000): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.nonces[address.toLowerCase()] = { value, exp: Date.now() + ttlMs };
    await writeDb(db);
  });
}

export async function consumeNonce(address: string, value: string): Promise<boolean> {
  return withLock(async () => {
    const db = await readDb();
    const rec = db.nonces[address.toLowerCase()];
    if (!rec || rec.exp < Date.now() || rec.value !== value) return false;
    delete db.nonces[address.toLowerCase()];
    await writeDb(db);
    return true;
  });
}

/* ---------- analytics (product counters only, no PII) ---------- */

export async function trackEvent(e: string, p?: Record<string, string | number>): Promise<void> {
  await withLock(async () => {
    const db = await readDb();
    db.analytics.push({ e, at: Date.now(), p });
    if (db.analytics.length > 5000) db.analytics = db.analytics.slice(-5000);
    await writeDb(db);
  });
}

export type { DbShape };
