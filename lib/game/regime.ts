import type { MarketRegime } from '@/lib/types';

export interface RegimeConfig extends MarketRegime {
  volatilityScale: number;
  trendScale: number;
  reversalScale: number;
  chopScale: number;
}

const REGIMES: readonly RegimeConfig[] = [
  { id: 'flash-crash', version: 1, name: 'FLASH CRASH', description: 'FAST MOVES. SHARP REVERSALS.', volatilityScale: 1.05, trendScale: 0.9, reversalScale: 1.35, chopScale: 0.9 },
  { id: 'chop-city', version: 1, name: 'CHOP CITY', description: 'LOW CONVICTION. WATCH THE WHIPSAW.', volatilityScale: 0.9, trendScale: 0.72, reversalScale: 1.2, chopScale: 1.3 },
  { id: 'trending-tape', version: 1, name: 'TRENDING TAPE', description: 'PICK A SIDE. STAY DISCIPLINED.', volatilityScale: 0.92, trendScale: 1.25, reversalScale: 0.8, chopScale: 0.75 },
  { id: 'dead-cat-bounce', version: 1, name: 'DEAD CAT BOUNCE', description: 'THE RELIEF RALLY CAN TURN FAST.', volatilityScale: 1, trendScale: 1.05, reversalScale: 1.15, chopScale: 0.9 },
];

export function regimeForDay(day: string): RegimeConfig {
  let hash = 2166136261;
  for (const character of day) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return REGIMES[(hash >>> 0) % REGIMES.length];
}

export function publicRegime(regime: RegimeConfig): MarketRegime {
  return { id: regime.id, version: regime.version, name: regime.name, description: regime.description };
}

export function regimeById(id: string, version: number): RegimeConfig | null {
  return REGIMES.find((regime) => regime.id === id && regime.version === version) ?? null;
}

export { REGIMES };