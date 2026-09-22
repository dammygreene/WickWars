import { describe, expect, it } from 'vitest';
import { scenarioForGame } from './tick';
import { canCreateChallenge, isRankedRun } from '@/lib/store/db';
import type { Game } from '@/lib/types';

function game(runType: Game['runType'], challengeCode?: string): Game {
  return {
    id: 'g_challenge',
    playerId: 'p_test',
    challengeId: 'S01-2026-09-21',
    scenarioId: 'scn-S01-2026-09-21',
    seasonId: 'S01',
    runType,
    challengeCode,
    mode: 'CHALLENGE',
    pair: 'WICK/USD',
    startsAt: 0,
    endsAt: 45_000,
    startBalance: 10_000,
    status: 'COUNTDOWN',
    trades: [],
    createdAt: 0,
  };
}

describe('challenge link invariants', () => {
  it('resolves the same deterministic scenario independent of challenge code', () => {
    const original = scenarioForGame(game('ranked'));
    for (const code of ['ch_today', 'ch_later', 'ch_second_opponent']) {
      const opponent = scenarioForGame(game('challenge', code));
      expect(opponent.id).toBe(original.id);
      expect(opponent.seed).toBe(original.seed);
      expect(opponent.tickMs).toBe(original.tickMs);
      expect(opponent.prices).toEqual(original.prices);
    }
  });

  it('keeps challenge runs outside ranked eligibility', () => {
    expect(isRankedRun(game('challenge', 'ch_opaque_code'))).toBe(false);
    expect(isRankedRun(game('ranked'))).toBe(true);
  });

  it('allows only ranked and explicitly shareable practice sources', () => {
    expect(canCreateChallenge(game('ranked'))).toBe(true);
    expect(canCreateChallenge(game('practice'))).toBe(true);
    expect(canCreateChallenge(game('challenge', 'ch_recursive'))).toBe(false);
    expect(canCreateChallenge(game('onboarding'))).toBe(false);
  });
});
