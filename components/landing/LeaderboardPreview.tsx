'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client/api';
import { Avatar } from '@/components/ui/Avatar';
import type { LeaderboardRow } from '@/lib/types';

export function LeaderboardPreview() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    api<{ rows: LeaderboardRow[] }>('/api/leaderboard?scope=daily&limit=5')
      .then((d) => setRows(d.rows))
      .catch(() => setRows([]));
  }, []);

  return (
    <section className="ww-panel p-5 sm:p-6" aria-label="Leaderboard preview">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-tight text-ww-text">TODAY&apos;S BOARD</h2>
        <Link href="/leaderboard" className="font-sans text-[13px] font-semibold text-ww-secondary transition-colors hover:text-ww-text">
          View all →
        </Link>
      </div>
      {rows === null ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ww-border-strong px-4 py-8 text-center">
          <p className="font-display text-base font-bold text-ww-text">THE BOARD IS EMPTY.</p>
          <p className="mt-1 font-sans text-sm text-ww-muted">Play the daily wick and take the crown.</p>
          <Link href="/play" className="mt-4 inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
            PLAY WICK
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r) => (
            <li key={r.playerId}>
              <Link
                href={`/profile/${r.username}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-ww-surface"
              >
                <span className={`ww-mono w-8 text-[15px] font-bold ${r.rank <= 3 ? 'text-ww-text' : 'text-ww-muted'}`}>
                  {String(r.rank).padStart(2, '0')}
                </span>
                <Avatar username={r.username} src={r.avatarUrl} size="sm" accent={r.rank === 1 ? 'win' : 'none'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm font-semibold text-ww-text">@{r.username}</span>
                  <span className="ww-mono block text-[11px] tracking-wider text-ww-disabled">{r.title}</span>
                </span>
                <span className="ww-mono text-sm font-bold text-ww-text">{r.score.toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
