import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCard, getPlayer, getResult } from '@/lib/store/db';
import { Avatar } from '@/components/ui/Avatar';
import { fmtPct } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ cardId: string }> }): Promise<Metadata> {
  const base = process.env.WW_BASE_URL || 'http://localhost:3000';
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) return { title: 'Card' };
  const player = await getPlayer(card.playerId);
  const result = card.gameId ? await getResult(card.gameId) : null;
  const title =
    card.type === 'GAME_RESULT' && result
      ? `@${player?.username ?? 'ghost'} ${result.pnl >= 0 ? 'banked' : 'lost'} ${fmtPct(result.roi)} — WICK WARS`
      : `@${player?.username ?? 'ghost'}'s all-time WICK WARS record`;
  const desc = 'Trade the chart. Survive the wick. Play the daily.';
  const images = [`${base}/api/cards/${card.id}/image`];
  return {
    title: `@${player?.username ?? 'ghost'}'s card`,
    description: desc,
    openGraph: { title, description: desc, url: `${base}/card/${card.id}`, images, type: 'article' },
    twitter: { card: 'summary_large_image', title, description: desc, images },
  };
}

export default async function CardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const card = await getCard(cardId);
  if (!card) notFound();
  const player = await getPlayer(card.playerId);
  const result = card.gameId ? await getResult(card.gameId) : null;

  return (
    <div className="ww-container max-w-xl py-8 sm:py-12">
      <div className="flex items-center justify-center gap-3">
        {player && <Avatar username={player.username} src={player.avatarUrl} size="md" />}
        <div className="text-center">
          <p className="font-sans text-[15px] font-bold text-ww-text">@{player?.username ?? 'ghost'}</p>
          <p className="ww-mono text-xs text-ww-muted">
            {card.type === 'GAME_RESULT' ? `${result?.mode ?? ''} · ${card.gameId ? result?.seasonId ?? '' : ''}` : 'ALL-TIME RECORD'}
          </p>
        </div>
      </div>

      <figure className="ww-panel mt-6 overflow-hidden p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/cards/${card.id}/image`}
          alt={`WICK WARS performance card by @${player?.username ?? 'ghost'}`}
          className="aspect-[4/5] w-full rounded-lg object-cover"
        />
      </figure>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/play"
          className="flex-1 rounded-lg bg-ww-text px-6 py-3.5 text-center font-display text-[15px] font-bold tracking-wide text-ww-bg transition-transform active:scale-[0.98]"
        >
          PLAY WICK
        </Link>
        {player && (
          <Link
            href={`/profile/${player.username}`}
            className="flex-1 rounded-lg border border-ww-border-strong bg-ww-surface px-6 py-3.5 text-center font-sans text-sm font-semibold text-ww-text"
          >
            VIEW PLAYER
          </Link>
        )}
        {card.gameId && (
          <Link
            href={`/results/${card.gameId}`}
            className="flex-1 rounded-lg border border-ww-border-strong bg-ww-surface px-6 py-3.5 text-center font-sans text-sm font-semibold text-ww-text"
          >
            VIEW RUN
          </Link>
        )}
      </div>
      <p className="mt-4 text-center font-sans text-[13px] text-ww-muted">
        Simulated performance. Think you can beat it? 45 seconds. One chart.
      </p>
    </div>
  );
}
