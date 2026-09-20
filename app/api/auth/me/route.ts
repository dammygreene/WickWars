import { currentPlayer } from '@/lib/auth/session';
import { refreshIdentity } from '@/lib/auth/identity';
import { getStats } from '@/lib/store/db';
import { ok } from '@/lib/api/json';

export async function GET() {
  const p = await currentPlayer();
  if (!p) return ok({ player: null });
  const fresh = await refreshIdentity(p);
  const stats = await getStats(fresh.playerId);
  return ok({ player: { ...fresh, stats } });
}
