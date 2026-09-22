import type { Metadata } from 'next';
import { getChallenge, getPlayer, getResult } from '@/lib/store/db';
import { ChallengeView } from './ChallengeView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const challenge = await getChallenge(code);
  if (!challenge) return { title: 'Challenge Not Found' };
  const result = await getResult(challenge.challengerGameId);
  const player = result ? await getPlayer(result.playerId) : null;
  const username = player?.username ?? 'ghost';
  const score = result?.score ?? challenge.challengerResult.score;
  return {
    title: `@${username} challenged you on WICK WARS`,
    description: `Can you beat ${score.toLocaleString()}? Play the same Wick.`,
    openGraph: { title: `@${username} challenged you on WICK WARS`, description: `Can you beat ${score.toLocaleString()}?`, type: 'website' },
    twitter: { card: 'summary', title: `@${username} challenged you on WICK WARS`, description: `Can you beat ${score.toLocaleString()}?` },
  };
}

export default async function ChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ChallengeView code={code} />;
}
