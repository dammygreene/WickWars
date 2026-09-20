import type { Metadata } from 'next';
import { ProfileView } from '@/components/profile/ProfileView';
import { getPlayerByUsername, getStats } from '@/lib/store/db';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const handle = decodeURIComponent(params.username).replace(/^@/, '');
  try {
    const p = await getPlayerByUsername(handle);
    if (!p) return { title: 'Player not found' };
    const s = await getStats(p.playerId);
    const title = `@${p.username} — ${p.title} · WICK WARS`;
    const desc = `${s.games} games · best ${s.bestScore.toLocaleString()} · ${p.archetype}. Trade the chart. Survive the wick.`;
    return { title: `@${p.username}`, description: desc, openGraph: { title, description: desc } };
  } catch {
    return { title: 'Profile' };
  }
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  return <ProfileView username={decodeURIComponent(params.username)} />;
}
