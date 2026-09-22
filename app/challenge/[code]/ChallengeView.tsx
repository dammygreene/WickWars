'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { api } from '@/lib/client/api';
import { fmtPct, fmtSignedMoney } from '@/lib/utils';

export interface ChallengeData {
  code: string;
  challenger: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    score: number;
    pnl: number;
    roi: number;
    liquidated: boolean;
  };
  seasonId: string;
  pair: string;
  mode: string;
  cardId: string | null;
}

export function ChallengeView({ code }: { code: string }) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<ChallengeData>(`/api/challenges/${code}`).then(setData).catch(() => setError(true));
  }, [code]);

  if (error) {
    return <div className="ww-container max-w-md py-16"><ErrorState title="CHALLENGE UNAVAILABLE" body="That Wick may have expired or never existed." onRetry={() => window.location.reload()} /></div>;
  }
  if (!data) return <div className="ww-container max-w-md"><LoadingState label="LOADING CHALLENGE" /></div>;

  const { challenger } = data;
  return (
    <div className="ww-container max-w-lg py-10 sm:py-16">
      <div className="text-center">
        <p className="ww-mono text-xs font-semibold tracking-[0.2em] text-ww-win">WICK WARS · CHALLENGE</p>
        <div className="mt-8 flex justify-center"><Avatar username={challenger.username} src={challenger.avatarUrl} size="lg" /></div>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ww-text sm:text-5xl">
          @{challenger.username} scored {challenger.score.toLocaleString()}.
        </h1>
        <p className="mt-3 font-sans text-lg text-ww-secondary">Think you can beat it?</p>
      </div>

      <div className="ww-panel mt-8 grid grid-cols-3 divide-x divide-ww-border">
        <div className="px-2 py-4 text-center"><p className="ww-mono text-lg font-bold text-ww-text">{challenger.score.toLocaleString()}</p><p className="ww-label mt-1">Score</p></div>
        <div className="px-2 py-4 text-center"><p className="ww-mono text-lg font-bold text-ww-text">{fmtSignedMoney(challenger.pnl)}</p><p className="ww-label mt-1">P&amp;L</p></div>
        <div className="px-2 py-4 text-center"><p className="ww-mono text-lg font-bold text-ww-text">{fmtPct(challenger.roi)}</p><p className="ww-label mt-1">ROI</p></div>
      </div>

      {data.cardId && (
        <a href={`/card/${data.cardId}`} className="mt-6 block overflow-hidden rounded-xl border border-ww-border-strong">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/cards/${data.cardId}/image`} alt={`@${challenger.username}'s WICK WARS result card`} className="aspect-[4/5] w-full object-cover object-top" />
        </a>
      )}

      <Link href={`/play?challenge=${encodeURIComponent(data.code)}`} className="mt-6 block">
        <Button size="xl" className="w-full font-display text-lg font-bold tracking-wide">PLAY THIS WICK</Button>
      </Link>
      <p className="mt-3 text-center font-sans text-xs text-ww-muted">{data.pair} · {data.seasonId} · same scenario, fresh decisions</p>
    </div>
  );
}
