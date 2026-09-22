/** WICK WARS — shared domain types. Server is authoritative; client mirrors these. */

export type PositionSide = 'FLAT' | 'LONG' | 'SHORT';
export type TradeAction = 'LONG' | 'SHORT' | 'CLOSE';
export type GameStatus = 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'LIQUIDATED' | 'INVALID';
export type RunType = 'ranked' | 'challenge' | 'practice' | 'onboarding' | 'ghost';
export type ResultState = 'PROFITABLE' | 'WICKED' | 'PERSONAL_BEST' | 'TOP_10' | 'LEGENDARY';
export type ChallengeStatus = 'UPCOMING' | 'LIVE' | 'ENDED';
export type CardType = 'GAME_RESULT' | 'ALL_TIME';
export type Leverage = 1 | 2 | 5 | 10 | 20;
export type RankedDayState = 'PROFITABLE' | 'WICKED' | 'FLAT' | 'NOT_PLAYED';

export interface RankedDay {
  date: string;
  state: RankedDayState;
  score: number | null;
  pnl: number | null;
  activeStreak: boolean;
  today: boolean;
}

export interface StreakCalendar {
  days: RankedDay[];
  currentStreak: number;
  todayState: RankedDayState;
  streakAtRisk: boolean;
  resetAt: string;
}

export type NearMiss =
  | { type: 'leaderboard_cutoff'; targetRank: number; pointsAway: number }
  | { type: 'leaderboard_tie'; targetRank: number }
  | { type: 'liquidation_survival'; liquidationEquityPercent: number }
  | { type: 'near_liquidation'; minimumEquityPercent: number }
  | null;

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
  regimeId?: string;
  regimeVersion?: number;
}

export interface MarketRegime {
  id: string;
  version: number;
  name: string;
  description: string;
}

export interface DailyRecap {
  dayKey: string;
  scenarioId: string;
  regime: MarketRegime | null;
  playerCount: number;
  highScore: number;
  averageScore: number;
  biggestWickPercent: number | null;
  mostUsedDirection: 'LONG' | 'SHORT' | null;
  profitablePlayerPercent: number | null;
}

export interface OnboardingStatus {
  eligible: boolean;
  activeGameId: string | null;
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

export interface GhostAction {
  action: TradeAction;
  t: number;
  price: number;
  kind: TradeEvent['kind'];
}

export interface Game {
  id: string;
  playerId: string;
  challengeId: string;
  scenarioId: string;
  seasonId: string;
  /** Missing on pre-migration records, which are treated as ranked. */
  runType?: RunType;
  challengeCode?: string;
  ghostSourceGameId?: string;
  regimeId?: string;
  regimeVersion?: number;
  leverage?: Leverage;
  rulesVersion?: string;
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
  /** Missing on pre-migration records, which are treated as ranked. */
  runType?: RunType;
  challengeCode?: string;
  ghostSourceGameId?: string;
  regimeId?: string;
  regimeVersion?: number;
  leverage?: Leverage;
  rulesVersion?: string;
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

export interface ChallengeRecord {
  code: string;
  challengerGameId: string;
  challengerPlayerId: string;
  /** Legacy snapshot retained for backwards compatibility; reads use the canonical result reference. */
  challengerResult: Pick<GameResult, 'score' | 'pnl' | 'roi' | 'liquidated' | 'seasonId' | 'pair' | 'mode'>;
  challengeId: string;
  scenarioId: string;
  seasonId: string;
  pair: string;
  leverage?: Leverage;
  rulesVersion?: string;
  createdAt: number;
}

export interface KillCamFrame {
  t: number;
  price: number;
  candles: Candle[];
  equity: number;
  pnl: number;
  unrealized: number;
  side: PositionSide;
  entryPrice: number | null;
  events: TradeEvent[];
}

export interface KillCamReplay {
  durationMs: number;
  frames: KillCamFrame[];
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

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
}

export interface PlayerBadge extends BadgeDefinition {
  earned: boolean;
  progress?: { current: number; target: number };
}

export interface PlayerAchievements {
  title: string;
  archetype: string;
  badges: PlayerBadge[];
  newBadgeIds: string[];
  titleChanged: boolean;
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
  regime: MarketRegime;
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
