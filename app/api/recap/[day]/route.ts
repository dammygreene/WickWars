import { challengeForDay } from '@/lib/game/challenge';
import { buildDailyRecap } from '@/lib/game/recap';
import { withDb } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ day: string }> }) {
  try {
    const { day } = await params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return fail('RECAP_NOT_FOUND', 'Recap not found.', 404);
    const challenge = challengeForDay(day);
    if (challenge.status === 'UPCOMING') return fail('RECAP_NOT_AVAILABLE', 'This Wick has not happened yet.', 409);
    const recap = await withDb((db) => buildDailyRecap(day, Object.values(db.games), Object.values(db.results)));
    if (!recap) return fail('RECAP_NOT_AVAILABLE', 'Today\'s recap is not ready yet.', 409);
    return ok(recap);
  } catch (e) {
    return failFrom(e);
  }
}
