import { describe, expect, it } from 'vitest';
import { titleForGames } from './identity';

describe('title boundaries', () => {
  it.each([
    [0, 'WICK NOVICE'], [4, 'WICK NOVICE'], [5, 'WICK TRADER'], [14, 'WICK TRADER'],
    [15, 'WICK HUNTER'], [39, 'WICK HUNTER'], [40, 'WICK LORD'], [99, 'WICK LORD'],
    [100, 'WICK GOD'], [101, 'WICK GOD'],
  ])('%i ranked games -> %s', (games, title) => expect(titleForGames(games)).toBe(title));
});
