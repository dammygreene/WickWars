import type { Metadata } from 'next';
import { getGame, getPlayer, getResult } from '@/lib/store/db';
import { ResultView } from '@/components/results/ResultView';
import { fmtPct } from '@/lib/utils';

export async function generateMetadata({ params }: { params: { gameId: string } }): Promise<Metadata> {
  const base = process.env.WW_BASE_URL || 'http://localhost:3000';
  try {
    const [game, result] = await Promise.all([getGame(params.gameId), getResult(params.gameId)]);
    if (!game || !result) return { title: 'Result' };
    const player = await getPlayer(game.playerId);
    const won = result.pnl >= 0;
    const title = `@${player?.username ?? 'ghost'} went ${won ? 'PROFITABLE' : 'WICKED'} ${fmtPct(result.roi)} — WICK WARS`;
    const desc = `Score ${result.score.toLocaleString()} · Rank #${result.rank}/${result.rankTotal} · ${result.mode}. Play the daily wick.`;
    return {
      title: `Run by @${player?.username ?? 'ghost'}`,
      description: desc,
      openGraph: { title, description: desc, url: `${base}/results/${params.gameId}`, type: 'article' },
      twitter: { card: 'summary', title, description: desc },
    };
  } catch {
    return { title: 'Result' };
  }
}

export default function ResultPage({ params }: { params: { gameId: string } }) {
  return <ResultView gameId={params.gameId} />;
}
