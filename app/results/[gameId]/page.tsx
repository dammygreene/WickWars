import type { Metadata } from 'next';
import { getGame, getPlayer, getResult } from '@/lib/store/db';
import { ResultView } from '@/components/results/ResultView';
import { fmtPct } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const base = process.env.WW_BASE_URL || 'http://localhost:3000';
  const { gameId } = await params;
  try {
    const [game, result] = await Promise.all([getGame(gameId), getResult(gameId)]);
    if (!game || !result) return { title: 'Result' };
    const player = await getPlayer(game.playerId);
    const won = result.pnl >= 0;
    const title = `@${player?.username ?? 'ghost'} went ${won ? 'PROFITABLE' : 'WICKED'} ${fmtPct(result.roi)} — WICK WARS`;
    const desc = `Score ${result.score.toLocaleString()} · Rank #${result.rank}/${result.rankTotal} · ${result.mode}. Play the daily wick.`;
    return {
      title: `Run by @${player?.username ?? 'ghost'}`,
      description: desc,
      openGraph: { title, description: desc, url: `${base}/results/${gameId}`, type: 'article' },
      twitter: { card: 'summary', title, description: desc },
    };
  } catch {
    return { title: 'Result' };
  }
}

export default async function ResultPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <ResultView gameId={gameId} />;
}
