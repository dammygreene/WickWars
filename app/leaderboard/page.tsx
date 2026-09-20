'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { useSeason } from '@/lib/client/useSeason';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingState, EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/utils';
import type { LeaderboardRow } from '@/lib/types';

type Scope = 'daily' | 'season' | 'alltime';
const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: 'daily', label: 'DAILY' },
  { id: 'season', label: 'SEASON' },
  { id: 'alltime', label: 'ALL-TIME' },
];

function Board() {
  const search = useSearchParams();
  const router = useRouter();
  const { season } = useSeason();
  const scope = (search.get('scope') as Scope) || 'daily';
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    setRows(null);
    api<{ rows: LeaderboardRow[]; myRank: number | null; total: number }>(`/api/leaderboard?scope=${scope}&limit=100`)
      .then((d) => {
        setRows(d.rows);
        setMyRank(d.myRank);
        setTotal(d.total);
      })
      .catch(() => setRows([]));
  }, [scope]);

  useEffect(() => {
    load();
    track('leaderboard_viewed', { scope });
  }, [load, scope]);

  return (
    <div className="ww-container max-w-3xl py-8 sm:py-12">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ww-mono text-xs font-semibold tracking-[0.18em] text-ww-win">SEASON 01</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-ww-text sm:text-5xl">LEADERBOARD</h1>
        </div>
        <p className="ww-mono text-xs text-ww-muted">{total} RANKED PLAYERS</p>
      </div>

      <div className="mt-6 flex gap-1 rounded-xl border border-ww-border bg-ww-elevated p-1" role="tablist" aria-label="Leaderboard scope">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={scope === s.id}
            onClick={() => router.push(`/leaderboard?scope=${s.id}`)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 font-display text-sm font-bold tracking-wide transition-colors',
              scope === s.id ? 'bg-ww-surface2 text-ww-text' : 'text-ww-muted hover:text-ww-secondary',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {myRank != null && (
        <div className="sticky top-16 z-10 mt-4 flex items-center justify-between rounded-xl border border-ww-win/30 bg-[#08120d]/95 px-4 py-2.5 backdrop-blur">
          <p className="font-sans text-sm font-semibold text-ww-text">
            YOUR RANK <span className="ww-mono font-bold text-ww-win">#{myRank}</span>
          </p>
          <button onClick={load} className="font-sans text-[13px] font-semibold text-ww-secondary hover:text-ww-text">
            REFRESH
          </button>
        </div>
      )}

      <div className="mt-4">
        {rows === null ? (
          <LoadingState label="LOADING BOARD" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="NO RUNS YET."
            body={scope === 'daily' ? 'Nobody has played today. First blood is yours.' : 'Play your first round.'}
            action={
              <Link href="/play" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
                PLAY YOUR FIRST WICK
              </Link>
            }
          />
        ) : (
          <ol className="ww-panel divide-y divide-ww-border overflow-hidden">
            {rows.map((r, i) => (
              <motion.li
                key={r.playerId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
              >
                <Link href={`/profile/${r.username}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ww-surface sm:px-4">
                  <span className={cn('ww-mono w-9 text-[15px] font-bold', r.rank <= 3 ? 'text-ww-win' : 'text-ww-muted')}>
                    {String(r.rank).padStart(2, '0')}
                  </span>
                  <Avatar username={r.username} src={r.avatarUrl} size="sm" accent={r.rank === 1 ? 'win' : 'none'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-sm font-semibold text-ww-text">@{r.username}</span>
                    <span className="ww-mono block truncate text-[11px] tracking-wider text-ww-disabled">
                      {r.title} · {r.games}G · {Math.round(r.winRate)}% WR
                    </span>
                  </span>
                  <span className={cn('ww-mono hidden text-[13px] font-semibold sm:block', r.roi >= 0 ? 'text-ww-win' : 'text-ww-loss')}>
                    {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(1)}%
                  </span>
                  <span className="ww-mono w-16 text-right text-[15px] font-bold text-ww-text">{r.score.toLocaleString()}</span>
                </Link>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="ww-container max-w-3xl"><LoadingState label="LOADING BOARD" /></div>}>
      <Board />
    </Suspense>
  );
}
