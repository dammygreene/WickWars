import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  CardRecord,
  Game,
  GameResult,
  PlayerIdentity,
  PlayerStats,
} from '@/lib/types';

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
  nonces: Record<string, { value: string; exp: number }>;
  analytics: Array<{ e: string; at: number; p?: Record<string, string | number> }>;
}

const EMPTY: DbShape = {
  version: 1,
  players: {},
  usernames: {},
  stats: {},
  games: {},
  results: {},
  cards: {},
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
    return parsed;
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, DB_FILE);
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

export async function getGame(id: string): Promise<Game | null> {
  const db = await readDb();
  return db.games[id] ?? null;
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

export async function resultsForChallenge(challengeId: string): Promise<GameResult[]> {
  const db = await readDb();
  return Object.values(db.results)
    .filter((r) => r.challengeId === challengeId && r.verified)
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

export async function resultsForPlayer(playerId: string, limit = 50): Promise<GameResult[]> {
  const db = await readDb();
  return Object.values(db.results)
    .filter((r) => r.playerId === playerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function playerBestToday(playerId: string, challengeId: string): Promise<GameResult | null> {
  const db = await readDb();
  const mine = Object.values(db.results).filter((r) => r.playerId === playerId && r.challengeId === challengeId && r.verified);
  if (!mine.length) return null;
  return mine.sort((a, b) => b.score - a.score)[0];
}

export async function countChallengeGames(challengeId: string): Promise<{ games: number; players: number }> {
  const db = await readDb();
  const rs = Object.values(db.results).filter((r) => r.challengeId === challengeId && r.verified);
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
