/** WICK WARS — shared domain types. Server is authoritative; client mirrors these. */

export type PositionSide = 'FLAT' | 'LONG' | 'SHORT';
export type TradeAction = 'LONG' | 'SHORT' | 'CLOSE';
export type GameStatus = 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'LIQUIDATED' | 'INVALID';
export type ResultState = 'PROFITABLE' | 'WICKED' | 'PERSONAL_BEST' | 'TOP_10' | 'LEGENDARY';
export type ChallengeStatus = 'UPCOMING' | 'LIVE' | 'ENDED';
export type CardType = 'GAME_RESULT' | 'ALL_TIME';

export interface Candle {
  timestamp: number; // ms offset from game start
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketScenario {
  id: string;
  symbol: string;
  pair: string;
  durationMs: number;
  startingPrice: number;
  tickMs: number;
  /** price at every tick index (0..tickCount), deterministic from seed */
  prices: number[];
  seed: string;
  difficulty: number; // 1..5
  seasonId: string;
}

export interface TradeEvent {
  id: string;
  gameId: string;
  /** ms offset from game start (server clock) */
  t: number;
  action: TradeAction;
  price: number;
  /** signed notional frozen at entry for opens; realized pnl for closes */
  notional: number;
  sideAfter: PositionSide;
  entryPriceAfter: number | null;
  realizedPnl: number;
  kind: 'OPEN' | 'CLOSE' | 'FLIP_CLOSE' | 'TIMEOUT_CLOSE' | 'LIQUIDATION_CLOSE';
}

export interface Game {
  id: string;
  playerId: string;
  challengeId: string;
  scenarioId: string;
  seasonId: string;
  mode: string;
  pair: string;
  startsAt: number; // unix ms (server clock, includes countdown)
  endsAt: number;
  startBalance: number;
  status: GameStatus;
  trades: TradeEvent[];
  /** set at finish */
  resultId?: string;
  createdAt: number;
}

export interface GameResult {
  gameId: string;
  playerId: string;
  scenarioId: string;
  challengeId: string;
  seasonId: string;
  mode: string;
  pair: string;
  startBalance: number;
  endBalance: number;
  pnl: number;
  roi: number; // percent
  trades: number; // closed trades (round trips counted as 1; flips count closes)
  tradeEvents: number;
  wins: number;
  losses: number;
  winRate: number; // percent
  holdTimeMs: number;
  maxDrawdownPct: number;
  score: number;
  rank: number;
  rankTotal: number;
  percentile: number;
  durationMs: number;
  resultState: ResultState;
  liquidated: boolean;
  verified: boolean;
  createdAt: number;
}

export interface PlayerIdentity {
  playerId: string;
  username: string; // without @
  displayName: string;
  avatarUrl?: string;
  title: string;
  archetype: string;
  level: number;
  x?: { userId: string; handle: string; avatarUrl?: string };
  wallet?: { address: string; chain: string };
  guest: boolean;
  createdAt: number;
}

export interface PlayerStats {
  games: number;
  wins: number;
  totalPnl: number;
  bestScore: number;
  bestWinPct: number;
  bestGameId?: string;
  currentStreak: number;
  longestStreak: number;
  peakRank: number | null;
  seasonsPlayed: string[];
  firstPlayedAt: number;
  lastPlayedAt: number;
  totalHoldMs: number;
  totalTrades: number;
  longCount: number;
  shortCount: number;
  history: Array<{ gameId: string; score: number; roi: number; at: number; seasonId: string }>;
}

export interface DailyChallenge {
  id: string;
  seasonId: string;
  name: string;
  mode: string;
  pair: string;
  startsAt: string;
  endsAt: string;
  scenarioId: string;
  startingBalance: number;
  durationMs: number;
  leverage: number;
  difficulty: number;
  status: ChallengeStatus;
}

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  username: string;
  avatarUrl?: string;
  title: string;
  score: number;
  roi: number;
  winRate: number;
  games: number;
  streak: number;
  gameId?: string;
}

export interface CardRecord {
  id: string;
  type: CardType;
  playerId: string;
  gameId?: string;
  dataRev: string; // hash of inputs — reuse card when unchanged
  createdAt: number;
}

export interface PublicPlayer {
  playerId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  title: string;
  archetype: string;
  level: number;
  hasX: boolean;
  hasWallet: boolean;
  stats: PlayerStats & { winRate: number };
  recentGames: GameResult[];
}
