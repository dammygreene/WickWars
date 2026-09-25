export type MarketActorId =
  | 'jeets'
  | 'cabal'
  | 'whale'
  | 'sniper'
  | 'paper_hands'
  | 'bot_flow';

export type JeetVariant = 'panic_sell' | 'failed_bounce' | 'cascade';
export type CabalVariant = 'pump_and_dump' | 'cabal_fake_breakout' | 'accumulate_then_distribute';
export type WhaleVariant = 'accumulation' | 'absorption' | 'distribution' | 'dump';
export type SniperVariant = 'high_sweep' | 'low_sweep' | 'sniper_fake_breakout' | 'fake_breakdown';
export type PaperHandsVariant = 'panic_dump' | 'panic_bounce' | 'capitulation' | 'relief_rally';
export type BotFlowVariant = 'chop' | 'momentum_flip' | 'mean_reversion' | 'whipsaw';

export type MarketActorVariant =
  | JeetVariant
  | CabalVariant
  | WhaleVariant
  | SniperVariant
  | PaperHandsVariant
  | BotFlowVariant;

export interface MarketActorEvent {
  actorId: MarketActorId;
  variant: MarketActorVariant;
  startMs: number;
  endMs: number;
  durationMs: number;
  intensity: number; // 0.6 .. 1.4
  direction: 1 | -1;
  params: Record<string, number>;
}

export interface MarketActorPlan {
  version: 'v1';
  seed: string;
  actorCount: number;
  events: MarketActorEvent[];
}

export interface PublicMarketActorSummary {
  actorCount: number;
  actors: Array<{
    id: MarketActorId;
    name: string;
    variant: MarketActorVariant;
    variantName: string;
    role: string;
  }>;
}

export interface MarketDiagnostics {
  cumulativeReturn: number;
  maxExcursion: number;
  maxDrawdownPct: number;
  meaningfulDirectionalChanges: number;
  meaningfulLocalReversals: number;
  majorReversalCount: number;
  minorReversalCount: number;
  largestMovePct: number;
  largestReversalPct: number;
  directionalSegments: number;
  dominantDirectionDurationMs: number;
  actorOverlapDurationMs: number;
  largestPositiveRunTicks: number;
  largestNegativeRunTicks: number;
  dominantDirectionRatio: number; // ratio of time in dominant trend
  perTickMovementMax: number;
  actorInfluenceContribution: number;
  isHoldGamingVulnerable: boolean;
  isValid: boolean;
}
