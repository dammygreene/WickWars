import { createHash } from 'crypto';
import type { Game, GameResult, PlayerIdentity, PlayerStats } from '@/lib/types';
import { buildScenario } from '@/lib/game/scenario';
import { challengeForDay } from '@/lib/game/challenge';
import { getGame, getPlayer, getResult, getStats, findCardByRev, newId, saveCard } from '@/lib/store/db';
import { loadTemplate } from './templates';
import { replaceFullTextToken, replaceToken } from './text';
import { buildChartRegion, swapChartRegion } from './chart';
import { buildGraphRegion, swapGraphRegion, type GraphPoint } from './graph';
import { ALLTIME_AVATAR, GAME_AVATAR, embedAvatar, fetchAvatarDataUri } from './avatar';
import { renderCardPng, storeCardAsset } from './render';
import { fmtDuration, fmtMoney, fmtPct, fmtSignedMoney } from '@/lib/utils';

export const ACCENT_WIN = '#35E58B';
export const ACCENT_LOSS = '#FF4F5E';

function rev(parts: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24);
}

function initials(name: string): string {
  const c = (name || '?').replace(/^@/, '').trim().charAt(0) || '?';
  return c.toUpperCase();
}

function ordinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function seasonRange(stats: PlayerStats): string {
  const ss = stats.seasonsPlayed;
  if (!ss.length) return stats.history[0]?.seasonId ?? 'S01';
  if (ss.length === 1 || ss[0] === ss[ss.length - 1]) return ss[0];
  return `${ss[0]} → ${ss[ss.length - 1]}`;
}

/* ---------------- game result card ---------------- */

export async function gameResultCard(gameId: string): Promise<{ cardId: string; cached: boolean }> {
  const game = await getGame(gameId);
  if (!game) throw new Error('GAME_NOT_FOUND');
  const result = await getResult(gameId);
  if (!result || !result.verified) throw new Error('RESULT_NOT_VERIFIED');
  const player = await getPlayer(game.playerId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');

  const challenge = challengeForDay(result.challengeId.slice(result.seasonId.length + 1));
  const dataRev = rev({
    v: 1,
    game: gameId,
    score: result.score,
    rank: result.rank,
    total: result.rankTotal,
    pnl: result.pnl,
    u: player.username,
    av: player.avatarUrl ?? null,
    trades: game.trades.map((t) => [t.t, t.action, Math.round(t.price * 1e4), t.kind]),
  });
  const existing = await findCardByRev(player.playerId, 'GAME_RESULT', dataRev);
  if (existing) return { cardId: existing.id, cached: true };

  const scenario = buildScenario({
    scenarioId: game.scenarioId,
    seed: game.scenarioId,
    seasonId: game.seasonId,
    difficulty: challenge.difficulty,
  });

  const won = result.pnl >= 0;
  const accent = won ? ACCENT_WIN : ACCENT_LOSS;
  const tag =
    result.resultState === 'LEGENDARY'
      ? 'LEGENDARY'
      : result.resultState === 'TOP_10'
        ? 'TOP 10'
        : result.resultState === 'PERSONAL_BEST'
          ? 'PERSONAL BEST'
          : won
            ? 'PROFITABLE'
            : 'WICKED';

  let svg = await loadTemplate('game-result-template.svg');

  // 1. Avatar (before token replacement so the fallback path stays intact)
  const avatarUri = await fetchAvatarDataUri(player.avatarUrl);
  svg = embedAvatar(svg, GAME_AVATAR, avatarUri);

  // 2. Dynamic chart region from REAL scenario + trade data
  const chart = buildChartRegion({
    scenario,
    trades: game.trades,
    mode: game.mode,
    pair: game.pair,
    durationLabel: fmtDuration(result.durationMs),
    startLabel: fmtMoney(result.startBalance, 0),
    endLabel: fmtMoney(result.endBalance),
  });
  svg = swapChartRegion(svg, chart);

  // 3. Bounded text tokens (shrink-to-fit, then truncate)
  const username = `@${player.username}`;
  svg = replaceFullTextToken(svg, 'USERNAME', username, { maxWidth: 620, minSize: 13, truncateAt: 26 });
  svg = replaceFullTextToken(svg, 'PNL', fmtSignedMoney(result.pnl), { maxWidth: 900, minSize: 30 });
  svg = replaceFullTextToken(svg, 'SCORE', result.score.toLocaleString('en-US'), { maxWidth: 600, minSize: 20 });

  // 3b. Size the result pill to the tag (template pill fits ~10 chars;
  // PERSONAL BEST / LEGENDARY need room). Pill stays left-anchored at x=178.
  const pillW = Math.max(104, Math.ceil(tag.length * 8.2 + 30));
  const pillCx = 178 + pillW / 2;
  svg = svg.replace(
    '<rect x="178" y="138" width="104" height="26" rx="13"',
    `<rect x="178" y="138" width="${pillW}" height="26" rx="13"`,
  );
  svg = svg.replace('<text x="230" y="155" text-anchor="middle"', `<text x="${pillCx}" y="155" text-anchor="middle"`);

  // 4. Plain tokens
  const date = new Date(result.createdAt).toISOString().slice(0, 10);
  const plain: Record<string, string> = {
    ACCENT: accent,
    AVATAR_INITIAL: initials(player.username),
    USERNAME: username,
    SEASON: result.seasonId,
    RESULT_TAG: tag,
    DATE: date,
    MODE: game.mode,
    PAIR: game.pair,
    DURATION: fmtDuration(result.durationMs),
    START_BALANCE: fmtMoney(result.startBalance, 0),
    END_BALANCE: fmtMoney(result.endBalance),
    PNL: fmtSignedMoney(result.pnl),
    ROI_ARROW: result.roi >= 0 ? '▲' : '▼',
    ROI: fmtPct(result.roi).replace(/^[+-]/, ''),
    TRADES: String(result.trades),
    WIN_RATE: `${Math.round(result.winRate)}%`,
    HOLD_TIME: fmtDuration(result.holdTimeMs),
    SCORE: result.score.toLocaleString('en-US'),
    RANK: ordinal(result.rank),
    RANK_TOTAL: String(result.rankTotal),
    PERCENTILE: result.rankTotal > 0 ? `TOP ${Math.max(1, Math.ceil((result.rank / result.rankTotal) * 100))}%` : '—',
  };
  for (const [k, v] of Object.entries(plain)) svg = replaceToken(svg, k, v);

  const { png } = await renderCardPng(svg);
  const cardId = newId('card');
  await storeCardAsset(cardId, svg, png);
  await saveCard({ id: cardId, type: 'GAME_RESULT', playerId: player.playerId, gameId, dataRev, createdAt: Date.now() });
  return { cardId, cached: false };
}

/* ---------------- all-time card ---------------- */

export function allTimeRev(player: PlayerIdentity, stats: PlayerStats): string {
  return rev({
    v: 1,
    p: player.playerId,
    u: player.username,
    av: player.avatarUrl ?? null,
    t: player.title,
    a: player.archetype,
    g: stats.games,
    w: stats.wins,
    bs: stats.bestScore,
    bw: Math.round(stats.bestWinPct * 100),
    ls: stats.longestStreak,
    pr: stats.peakRank,
    sp: stats.seasonsPlayed,
    h: stats.history.map((x) => [x.score, Math.round(x.roi * 100), x.seasonId]),
  });
}

export async function allTimeCard(playerId: string): Promise<{ cardId: string; cached: boolean }> {
  const player = await getPlayer(playerId);
  if (!player) throw new Error('PLAYER_NOT_FOUND');
  const stats = await getStats(playerId);
  if (stats.games === 0) throw new Error('NO_GAMES');

  const dataRev = allTimeRev(player, stats);
  const existing = await findCardByRev(playerId, 'ALL_TIME', dataRev);
  if (existing) return { cardId: existing.id, cached: true };

  const winRate = stats.games ? (stats.wins / stats.games) * 100 : 0;
  const accent = winRate >= 50 ? ACCENT_WIN : ACCENT_LOSS;
  const taglines: Record<string, string> = {
    THE_SNIPER: 'PATIENCE IS THE POSITION.',
    THE_APE: 'SIZE FIRST. QUESTIONS LATER.',
    THE_JEET: 'PAPER IS STILL PROFIT.',
    THE_CONTRARIAN: 'FADE THE CROWD.',
    THE_DEGEN: 'LONG AND PROUD.',
    THE_SURVIVOR: 'STILL HERE. STILL WICKING.',
    THE_GRINDER: 'SHOW UP. TRADE. REPEAT.',
    UNRANKED: 'YOUR FIRST WICK IS WAITING.',
  };

  let svg = await loadTemplate('all-time-template.svg');

  // Template erratum (minimal collision fix, not a redesign): the section
  // divider at y=946 sits 6px above the row-3 value baseline (y=952), cutting
  // through 23px text. Nudge divider + title block down; rhythm preserved.
  svg = svg
    .split('<line x1="96" y1="946" x2="1104" y2="946"')
    .join('<line x1="96" y1="968" x2="1104" y2="968"');
  svg = svg.split('<g transform="translate(600.0,992)"').join('<g transform="translate(600.0,1012)"');

  const avatarUri = await fetchAvatarDataUri(player.avatarUrl);
  svg = embedAvatar(svg, ALLTIME_AVATAR, avatarUri);

  // Real history graph
  const seasons = [...new Set(stats.history.map((h) => h.seasonId))];
  let points: GraphPoint[];
  if (seasons.length > 1) {
    points = seasons.map((s) => {
      const hs = stats.history.filter((h) => h.seasonId === s);
      return { label: s, value: Math.round(hs.reduce((a, h) => a + h.score, 0) / hs.length) };
    });
  } else {
    const hs = stats.history.slice(-24);
    points = hs.map((h, i) => ({ label: `#${stats.history.length - hs.length + i + 1}`, value: h.score }));
  }
  svg = swapGraphRegion(svg, buildGraphRegion(points, accent));

  // Bounded tokens
  svg = replaceFullTextToken(svg, 'USERNAME', `@${player.username}`, { maxWidth: 560, minSize: 14, truncateAt: 24 });
  svg = replaceFullTextToken(svg, 'TITLE', player.title, { maxWidth: 900, minSize: 24 });
  svg = replaceFullTextToken(svg, 'ARCHETYPE', player.archetype, { maxWidth: 300, minSize: 13 });
  svg = replaceFullTextToken(svg, 'BEST_SCORE', stats.bestScore.toLocaleString('en-US'), { maxWidth: 300, minSize: 14 });
  svg = replaceFullTextToken(svg, 'BEST_WIN', fmtPct(stats.bestWinPct), { maxWidth: 300, minSize: 14 });
  svg = replaceFullTextToken(svg, 'GAMES', String(stats.games), { maxWidth: 300, minSize: 14 });
  svg = replaceFullTextToken(svg, 'WIN_RATE', `${Math.round(winRate)}%`, { maxWidth: 300, minSize: 14 });
  svg = replaceFullTextToken(svg, 'PEAK_RANK', stats.peakRank ? ordinal(stats.peakRank) : '—', { maxWidth: 300, minSize: 14 });
  svg = replaceFullTextToken(svg, 'LONGEST_STREAK', `${stats.longestStreak}x`, { maxWidth: 300, minSize: 14 });
  const taglineEarly = taglines[player.archetype.replace(/ /g, '_')] ?? 'TRADE THE CHART. SURVIVE THE WICK.';
  svg = replaceFullTextToken(svg, 'TAGLINE', taglineEarly, {
    maxWidth: 900,
    minSize: 11,
  });

  const first = new Date(stats.firstPlayedAt).toISOString().slice(0, 10);
  const plain: Record<string, string> = {
    ACCENT: accent,
    AVATAR_INITIAL: initials(player.username),
    USERNAME: `@${player.username}`,
    TITLE: player.title,
    PEAK_RANK: stats.peakRank ? ordinal(stats.peakRank) : '—',
    GAMES: String(stats.games),
    WIN_RATE: `${Math.round(winRate)}%`,
    BEST_SCORE: stats.bestScore.toLocaleString('en-US'),
    BEST_WIN: fmtPct(stats.bestWinPct),
    LONGEST_STREAK: `${stats.longestStreak}x`,
    SEASONS_PLAYED: String(Math.max(1, stats.seasonsPlayed.length)),
    FIRST_PLAYED: first,
    ARCHETYPE: player.archetype,
    SEASON_RANGE: seasonRange(stats),
    TAGLINE: taglineEarly,
  };
  for (const [k, v] of Object.entries(plain)) svg = replaceToken(svg, k, v);

  const { png } = await renderCardPng(svg);
  const cardId = newId('card');
  await storeCardAsset(cardId, svg, png);
  await saveCard({ id: cardId, type: 'ALL_TIME', playerId, dataRev, createdAt: Date.now() });
  return { cardId, cached: false };
}

export type { Game };
