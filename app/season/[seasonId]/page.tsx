'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { Avatar } from '@/components/ui/Avatar';
import { CountdownChip } from '@/components/ui/Countdown';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { seasonConfig, todayChallenge } from '@/lib/game/challenge';
import { cn } from '@/lib/utils';
import type { LeaderboardRow } from '@/lib/types';

export default function SeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const season = seasonConfig();
  const id = seasonId === 'current' ? season.id : seasonId.toUpperCase();
  const known = id === season.id;
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const challenge = todayChallenge();

  useEffect(() => {
    if (!known) return;
    api<{ rows: LeaderboardRow[]; myRank: number | null }>(`/api/leaderboard?scope=season&limit=10`)
      .then((d) => {
        setRows(d.rows);
        setMyRank(d.myRank);
      })
      .catch(() => setRows([]));
    track('season_viewed');
  }, [known]);

  if (!known) {
    return (
      <div className="ww-container max-w-2xl py-12">
        <EmptyState
          title="SEASON NOT FOUND."
          body={`There is no ${id} on record. Season ${season.id} is live now.`}
          action={
            <Link href="/season/current" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
              VIEW CURRENT SEASON
            </Link>
          }
        />
      </div>
    );
  }

  const start = new Date(season.start);
  const end = new Date(season.end);

  return (
    <div className="ww-container max-w-3xl py-8 sm:py-12">
      <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">SEASON HUB</p>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-ww-text sm:text-5xl">{season.name.toUpperCase()}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="ww-mono rounded-md border border-ww-border bg-ww-surface px-2.5 py-1 text-xs text-ww-secondary">
          {start.toISOString().slice(0, 10)} → {end.toISOString().slice(0, 10)}
        </span>
        <CountdownChip targetMs={end.getTime()} />
        {myRank != null && (
          <span className="ww-mono rounded-md border border-ww-win/30 bg-ww-win/10 px-2.5 py-1 text-xs font-bold text-ww-win">
            YOUR SEASON RANK #{myRank}
          </span>
        )}
      </div>

      <div className="ww-panel mt-6 grid grid-cols-1 divide-y divide-ww-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { t: 'ONE DAILY SCENARIO', d: 'Everyone trades the same chart each day. Same wick, same pain, same glory.' },
          { t: 'BEST SCORE COUNTS', d: 'Replay all you want — your season rank uses your best score per scope.' },
          { t: 'SERVER-VERIFIED', d: 'Prices, fills and scores are computed server-side. No fake runs on the board.' },
        ].map((r) => (
          <div key={r.t} className="px-5 py-4">
            <p className="font-display text-sm font-bold text-ww-text">{r.t}</p>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-ww-secondary">{r.d}</p>
          </div>
        ))}
      </div>

      <section className="mt-8" aria-label="Season standings">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ww-text">SEASON STANDINGS</h2>
          <Link href="/leaderboard?scope=season" className="font-sans text-[13px] font-semibold text-ww-secondary hover:text-ww-text">
            Full board →
          </Link>
        </div>
        <div className="mt-3">
          {rows === null ? (
            <LoadingState label="LOADING STANDINGS" />
          ) : rows.length === 0 ? (
            <EmptyState
              title="THIS IS YOUR FIRST SEASON."
              body="No ranked runs yet. Set the pace."
              action={
                <Link href="/play" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
                  PLAY THE DAILY WICK
                </Link>
              }
            />
          ) : (
            <ol className="ww-panel divide-y divide-ww-border overflow-hidden">
              {rows.map((r) => (
                <li key={r.playerId}>
                  <Link href={`/profile/${r.username}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ww-surface">
                    <span className={cn('ww-mono w-8 text-[15px] font-bold', r.rank <= 3 ? 'text-ww-win' : 'text-ww-muted')}>
                      {String(r.rank).padStart(2, '0')}
                    </span>
                    <Avatar username={r.username} src={r.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-sm font-semibold text-ww-text">@{r.username}</span>
                      <span className="ww-mono block text-[11px] tracking-wider text-ww-disabled">{r.title}</span>
                    </span>
                    <span className="ww-mono text-[13px] text-ww-secondary">{r.games}G</span>
                    <span className="ww-mono w-16 text-right text-[15px] font-bold text-ww-text">{r.score.toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/play" className="flex-1 rounded-lg bg-ww-text px-6 py-3.5 text-center font-display text-sm font-bold tracking-wide text-ww-bg">
          PLAY TODAY&apos;S WICK
        </Link>
        <Link href="/how-to-play" className="flex-1 rounded-lg border border-ww-border-strong bg-ww-surface px-6 py-3.5 text-center font-sans text-sm font-semibold text-ww-text">
          SCORING RULES
        </Link>
      </div>
      <p className="ww-mono mt-4 text-center text-xs text-ww-disabled">
        DAILY RESET {new Date(challenge.endsAt).toISOString().slice(11, 16)} UTC · {challenge.pair} · {challenge.leverage}x
      </p>
    </div>
  );
}
