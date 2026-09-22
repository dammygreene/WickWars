import { LEVERAGE as DEFAULT_LEVERAGE } from './constants';
import type { Game, Leverage } from '@/lib/types';

export const ALLOWED_LEVERAGES: readonly Leverage[] = [1, 2, 5, 10, 20];
export const RANKED_LEVERAGE: Leverage = 10;
export const DEFAULT_RULES_VERSION = 'v1';

export function getGameLeverage(game: Pick<Game, 'leverage'>): Leverage {
  return game.leverage ?? DEFAULT_LEVERAGE as Leverage;
}

export function parseLeverage(value: unknown): Leverage | null {
  return typeof value === 'number' && ALLOWED_LEVERAGES.includes(value as Leverage) ? value as Leverage : null;
}

export function practiceLeverageLabel(leverage: Leverage): string {
  if (leverage === 1) return 'LOWER LIQUIDATION RISK';
  if (leverage === 20) return 'HIGHER LIQUIDATION RISK';
  if (leverage === 5) return 'BALANCED';
  return 'STANDARD';
}