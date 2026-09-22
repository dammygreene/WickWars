import type { Metadata } from 'next';
import Link from 'next/link';
import { challengeForDay } from '@/lib/game/challenge';
import { buildDailyRecap } from '@/lib/game/recap';
import { withDb } from '@/lib/store/db';
import { EmptyState } from '@/components/ui/States';

export const dynamic = 'force-dynamic';

async function load(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const challenge = challengeForDay(day);
  if (challenge.status === 'UPCOMING') return null;
  return withDb((db) => buildDailyRecap(day, Object.values(db.games), Object.values(db.results)));
}

export async function generateMetadata({ params }: { params: Promise<{ day: string }> }): Promise<Metadata> {
  const { day } = await params;
  const recap = await load(day);
  if (!recap) return { title: 'Recap Not Available' };
  const label = recap.regime?.name ?? 'DAILY WICK';
  return {
    title: `WICK WARS — ${label} Daily Recap`,
    description: `${recap.playerCount.toLocaleString()} players. High score: ${recap.highScore.toLocaleString()}.`,
  };
}

export default async function RecapPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const recap = await load(day);
  if (!recap) {
    return <div className="ww-container max-w-xl py-16"><EmptyState title="RECAP NOT AVAILABLE" body="The Daily Wick must close before its final numbers are revealed." action={<Link href="/play" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">PLAY TODAY&apos;S WICK</Link>} /></div>;
  }
  const date = new Date(`${day}T12:00:00.000Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="ww-container max-w-2xl py-10 sm:py-16">
      <div className="text-center">
        <p className="ww-mono text-xs font-semibold tracking-[0.2em] text-ww-win">WICK WARS · DAILY RECAP</p>
        <p className="ww-mono mt-4 text-xs text-ww-muted">{date.toUpperCase()}</p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-ww-text sm:text-7xl">TODAY&apos;S WICK</h1>
        <p className="mt-4 font-display text-2xl font-bold text-ww-win sm:text-3xl">{recap.regime?.name ?? 'LEGACY DAILY WICK'}</p>
        {recap.regime && <p className="mt-2 font-sans text-sm uppercase tracking-[0.14em] text-ww-secondary">{recap.regime.description}</p>}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="PLAYERS" value={recap.playerCount.toLocaleString()} />
        <Metric label="HIGH SCORE" value={recap.highScore.toLocaleString()} />
        <Metric label="AVERAGE SCORE" value={recap.averageScore.toLocaleString()} />
        <Metric label="MOST USED" value={recap.mostUsedDirection ?? '—'} />
      </div>
      <div className="ww-panel mt-3 grid grid-cols-2 divide-x divide-ww-border p-5 text-center">
        <div><p className="ww-label">BIGGEST WICK</p><p className="mt-2 font-display text-3xl font-bold text-ww-loss">{recap.biggestWickPercent == null ? '—' : `${recap.biggestWickPercent.toFixed(1)}%`}</p></div>
        <div><p className="ww-label">FINISHED PROFITABLE</p><p className="mt-2 font-display text-3xl font-bold text-ww-win">{recap.profitablePlayerPercent == null ? '—' : `${recap.profitablePlayerPercent.toFixed(1)}%`}</p></div>
      </div>
      <Link href="/play" className="mt-8 block text-center font-sans text-sm font-semibold text-ww-secondary hover:text-ww-text">BACK TO WICK WARS →</Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="ww-panel p-4 text-center"><p className="ww-label">{label}</p><p className="mt-2 font-display text-2xl font-bold text-ww-text sm:text-3xl">{value}</p></div>;
}
