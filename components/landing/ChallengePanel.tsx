'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, errMsg } from '@/lib/client/api';
import { CountdownChip } from '@/components/ui/Countdown';
import { Avatar } from '@/components/ui/Avatar';
import { fmtPct } from '@/lib/utils';
import type { DailyChallenge } from '@/lib/types';

interface Data {
  challenge: DailyChallenge;
  counts: { games: number; players: number };
  top: Array<{ rank: number; score: number; roi: number; username: string; avatarUrl?: string; gameId: string }>;
  myBest: { score: number; roi: number; rank: number; gameId: string } | null;
}

export function ChallengePanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Data>('/api/challenge/today')
      .then(setData)
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) {
    return (
      <div className="ww-panel p-6" role="alert">
        <p className="ww-label">Daily wick</p>
        <p className="mt-2 font-sans text-sm text-ww-secondary">Challenge feed is down. The game still works — jump in.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ww-panel p-6" aria-hidden>
        <div className="skeleton h-5 w-32 rounded" />
        <div className="skeleton mt-4 h-9 w-48 rounded" />
        <div className="skeleton mt-4 h-16 w-full rounded-lg" />
      </div>
    );
  }

  const { challenge, counts, top, myBest } = data;
  return (
    <section className="ww-panel overflow-hidden" aria-label="Today's challenge">
      <div className="flex items-center justify-between gap-3 border-b border-ww-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-ww-win" aria-hidden />
          <p className="font-display text-[13px] font-bold tracking-[0.12em] text-ww-text">DAILY WICK · LIVE</p>
        </div>
        <CountdownChip targetMs={new Date(challenge.endsAt).getTime()} />
      </div>

      <div className="grid grid-cols-3 divide-x divide-ww-border border-b border-ww-border">
        <div className="px-4 py-3.5 text-center">
          <p className="ww-mono text-xl font-bold text-ww-text">{counts.players}</p>
          <p className="ww-label mt-0.5">Players</p>
        </div>
        <div className="px-4 py-3.5 text-center">
          <p className="ww-mono text-xl font-bold text-ww-text">{top[0]?.score.toLocaleString() ?? '—'}</p>
          <p className="ww-label mt-0.5">Top score</p>
        </div>
        <div className="px-4 py-3.5 text-center">
          <p className="ww-mono text-xl font-bold text-ww-win">{myBest ? `#${myBest.rank}` : '—'}</p>
          <p className="ww-label mt-0.5">Your rank</p>
        </div>
      </div>

      <div className="px-2 py-2">
        {top.length === 0 ? (
          <p className="px-3 py-4 text-center font-sans text-sm text-ww-muted">
            No runs yet today. <span className="text-ww-text">Be the first wick.</span>
          </p>
        ) : (
          top.map((t) => (
            <Link
              key={t.gameId}
              href={`/results/${t.gameId}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-ww-surface"
            >
              <span className="ww-mono w-6 text-sm font-bold text-ww-muted">#{t.rank}</span>
              <Avatar username={t.username} src={t.avatarUrl} size="sm" />
              <span className="flex-1 truncate font-sans text-sm font-semibold text-ww-text">@{t.username}</span>
              <span className={`ww-mono text-[13px] font-semibold ${t.roi >= 0 ? 'text-ww-win' : 'text-ww-loss'}`}>
                {fmtPct(t.roi)}
              </span>
              <span className="ww-mono text-[13px] text-ww-secondary">{t.score.toLocaleString()}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
