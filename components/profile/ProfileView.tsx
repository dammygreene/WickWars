'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { usePlayer } from '@/lib/client/usePlayer';
import { Avatar } from '@/components/ui/Avatar';
import { CardGenerator } from '@/components/cards/CardGenerator';
import { StreakCalendar } from '@/components/profile/StreakCalendar';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/States';
import { cn, fmtDuration, fmtPct, fmtSignedMoney, timeAgo } from '@/lib/utils';
import type { PublicPlayer, CardRecord, StreakCalendar as StreakCalendarData, PlayerAchievements } from '@/lib/types';

interface Data extends PublicPlayer {
  cards: CardRecord[];
  streakCalendar: StreakCalendarData;
  achievements: PlayerAchievements;
}

export function ProfileView({ username }: { username: string }) {
  const { player: me } = usePlayer();
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const handle = username.replace(/^@/, '');
    api<Data>(`/api/profile/${encodeURIComponent(handle)}`)
      .then((d) => {
        setData(d);
        track('profile_viewed');
      })
      .catch(() => setMissing(true));
  }, [username]);

  const spark = useMemo(() => {
    if (!data || data.recentGames.length < 2) return null;
    const pts = [...data.recentGames].reverse().map((g) => g.score);
    const lo = Math.min(...pts);
    const hi = Math.max(...pts);
    const span = hi - lo || 1;
    const W = 560;
    const H = 120;
    const coords = pts.map((v, i) => ({
      x: 8 + (i / (pts.length - 1)) * (W - 16),
      y: H - 10 - ((v - lo) / span) * (H - 20),
    }));
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    return { line, last: coords[coords.length - 1], lo, hi };
  }, [data]);

  if (missing) {
    return (
      <div className="ww-container max-w-2xl py-12">
        <ErrorState title="PLAYER NOT FOUND" body="That handle hasn't entered the arena." />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="ww-container max-w-3xl">
        <LoadingState label="LOADING PROFILE" />
      </div>
    );
  }

  const s = data.stats;
  const isMine = me?.playerId === data.playerId;
  const allTimeCards = data.cards.filter((c) => c.type === 'ALL_TIME');
  const gameCards = data.cards.filter((c) => c.type === 'GAME_RESULT');

  return (
    <div className="ww-container max-w-3xl py-8 sm:py-12">
      {/* Identity hero */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} aria-label="Player identity">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar username={data.username} src={data.avatarUrl} size="xl" accent={s.winRate >= 50 && s.games > 0 ? 'win' : 'none'} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight text-ww-text sm:text-4xl">@{data.username}</h1>
            <p className="ww-mono mt-1 text-[13px] font-semibold tracking-[0.14em] text-ww-win">{data.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="ww-mono rounded-md border border-ww-border bg-ww-surface px-2 py-1 text-[11px] font-semibold tracking-wider text-ww-secondary">
                {data.archetype}
              </span>
              <span className="ww-mono rounded-md border border-ww-border bg-ww-surface px-2 py-1 text-[11px] font-semibold tracking-wider text-ww-secondary">
                LVL {data.level}
              </span>
              {data.hasX && (
                <span className="ww-mono rounded-md border border-ww-border bg-ww-surface px-2 py-1 text-[11px] font-semibold tracking-wider text-ww-secondary">
                  X LINKED
                </span>
              )}
              {data.hasWallet && (
                <span className="ww-mono rounded-md border border-ww-border bg-ww-surface px-2 py-1 text-[11px] font-semibold tracking-wider text-ww-secondary">
                  WALLET LINKED
                </span>
              )}
            </div>
          </div>
          {isMine ? (
            <Link href="/play" className="rounded-lg bg-ww-text px-6 py-3 text-center font-display text-sm font-bold tracking-wide text-ww-bg">
              PLAY WICK
            </Link>
          ) : (
            <Link href="/play" className="rounded-lg border border-ww-border-strong bg-ww-surface px-6 py-3 text-center font-sans text-sm font-semibold text-ww-text">
              BEAT THEM
            </Link>
          )}
        </div>
      </motion.section>

      {/* Stat strip */}
      <section className="ww-panel mt-6 grid grid-cols-3 divide-x divide-ww-border sm:grid-cols-6" aria-label="Career stats">
        {[
          { l: 'Games', v: String(s.games) },
          { l: 'Win rate', v: `${Math.round(s.winRate)}%` },
          { l: 'Best', v: s.bestScore.toLocaleString() },
          { l: 'Best win', v: fmtPct(s.bestWinPct) },
          { l: 'Peak rank', v: s.peakRank != null ? `#${s.peakRank}` : '—' },
          { l: 'Streak', v: `${s.currentStreak}x` },
        ].map((x) => (
          <div key={x.l} className="px-2 py-3.5 text-center">
            <p className="ww-mono text-sm font-bold text-ww-text sm:text-[15px]">{x.v}</p>
            <p className="ww-label mt-1">{x.l}</p>
          </div>
        ))}
      </section>

      <StreakCalendar calendar={data.streakCalendar} />

      <section className="ww-panel mt-6 p-5 sm:p-6" aria-label="Titles and badges">
        <p className="ww-label">CURRENT TITLE</p>
        <p className="mt-1 font-display text-2xl font-bold text-ww-text">{data.achievements.title}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {data.achievements.badges.map((badge) => (
            <button key={badge.id} type="button" title={badge.description} aria-label={`${badge.name}: ${badge.earned ? 'earned' : 'locked'}. ${badge.description}`} className={cn('rounded-md border px-3 py-2 text-left font-sans text-xs font-bold', badge.earned ? 'border-ww-win/40 bg-ww-win/10 text-ww-win' : 'border-ww-border bg-ww-bg text-ww-muted')}>
              {badge.name}{!badge.earned && badge.progress ? ` · ${badge.progress.current}/${badge.progress.target}` : ''}
            </button>
          ))}
        </div>
      </section>

      {s.games === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="YOUR FIRST WICK IS WAITING."
            body={isMine ? 'No runs yet. 45 seconds from now you could be on the board.' : 'This player has not played yet.'}
            action={
              isMine ? (
                <Link href="/play" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
                  PLAY YOUR FIRST WICK
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Form spark */}
          <section className="ww-panel mt-6 p-5" aria-label="Recent form">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ww-text">RECENT FORM</h2>
              <p className="ww-mono text-xs text-ww-muted">LAST {data.recentGames.length} · SCORE</p>
            </div>
            {spark ? (
              <svg viewBox="0 0 560 120" className="mt-3 h-28 w-full" role="img" aria-label="Score history chart">
                <path d={`${spark.line} L 552 120 L 8 120 Z`} fill="rgba(53,229,139,0.08)" />
                <path d={spark.line} fill="none" stroke="#35E58B" strokeWidth="2" />
                <circle cx={spark.last.x} cy={spark.last.y} r="4" fill="#35E58B" />
              </svg>
            ) : (
              <p className="mt-3 font-sans text-sm text-ww-muted">One run deep. Keep going.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <p className="ww-mono text-xs text-ww-muted">TOTAL P&L <span className={s.totalPnl >= 0 ? 'text-ww-win' : 'text-ww-loss'}>{fmtSignedMoney(s.totalPnl)}</span></p>
              <p className="ww-mono text-xs text-ww-muted">LONGEST STREAK <span className="text-ww-text">{s.longestStreak}x</span></p>
              <p className="ww-mono text-xs text-ww-muted">AVG HOLD <span className="text-ww-text">{s.totalTrades ? fmtDuration(s.totalHoldMs / s.totalTrades) : '—'}</span></p>
              <p className="ww-mono text-xs text-ww-muted">SEASONS <span className="text-ww-text">{Math.max(1, s.seasonsPlayed.length)}</span></p>
            </div>
          </section>

          {/* All-time card */}
          <section className="ww-panel mt-6 p-5 sm:p-6" aria-label="All-time card">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-base font-bold text-ww-text">ALL-TIME CARD</h2>
              <p className="font-sans text-[13px] text-ww-muted">Your permanent WICK identity snapshot.</p>
            </div>
            <div className="mt-4 flex justify-center">
              {isMine ? (
                <CardGenerator mode="alltime" shareText={`My all-time WICK WARS record: ${s.games} games, best ${s.bestScore.toLocaleString()}. Come take it.`} />
              ) : allTimeCards.length > 0 ? (
                <Link href={`/card/${allTimeCards[0].id}`} className="block w-full max-w-[320px] overflow-hidden rounded-xl border border-ww-border-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/cards/${allTimeCards[0].id}/image`} alt={`All-time card of @${data.username}`} loading="lazy" className="aspect-[4/5] w-full object-cover object-top" />
                </Link>
              ) : (
                <p className="font-sans text-sm text-ww-muted">No all-time card minted yet.</p>
              )}
            </div>
          </section>

          {/* Recent runs */}
          <section className="mt-6" aria-label="Recent games">
            <h2 className="font-display text-base font-bold text-ww-text">RECENT RUNS</h2>
            <div className="ww-panel mt-3 divide-y divide-ww-border overflow-hidden">
              {data.recentGames.map((g) => (
                <Link key={g.gameId} href={`/results/${g.gameId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ww-surface">
                  <span className={cn('ww-mono rounded px-1.5 py-0.5 text-[11px] font-bold', g.pnl >= 0 ? 'bg-ww-win/10 text-ww-win' : 'bg-ww-loss/10 text-ww-loss')}>
                    {g.resultState.replace('_', ' ')}
                  </span>
                  <span className={cn('ww-mono flex-1 text-sm font-bold', g.pnl >= 0 ? 'text-ww-win' : 'text-ww-loss')}>
                    {fmtSignedMoney(g.pnl)} <span className="font-medium opacity-80">({fmtPct(g.roi)})</span>
                  </span>
                  <span className="ww-mono text-[13px] text-ww-secondary">{g.score.toLocaleString()} PTS</span>
                  <span className="ww-mono hidden text-xs text-ww-muted sm:block">#{g.rank}/{g.rankTotal}</span>
                  <span className="ww-mono hidden text-xs text-ww-disabled md:block">{timeAgo(g.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Card wall */}
          {gameCards.length > 0 && (
            <section className="mt-6" aria-label="Generated cards">
              <h2 className="font-display text-base font-bold text-ww-text">CARD WALL</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gameCards.slice(0, 6).map((c) => (
                  <Link key={c.id} href={`/card/${c.id}`} className="ww-panel overflow-hidden p-2 transition-transform hover:scale-[1.01]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/cards/${c.id}/image`} alt="WICK WARS performance card" loading="lazy" className="aspect-[4/5] w-full rounded-md object-cover object-top" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
