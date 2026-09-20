import { z } from 'zod';
import { trackEvent } from '@/lib/store/db';
import { ok, fail } from '@/lib/api/json';

const ALLOW = new Set([
  'landing_viewed',
  'play_clicked',
  'auth_started',
  'game_started',
  'trade_opened',
  'trade_closed',
  'game_completed',
  'personal_best_reached',
  'leaderboard_viewed',
  'profile_viewed',
  'card_generated',
  'card_downloaded',
  'card_shared',
  'card_link_opened',
  'replay_clicked',
  'season_viewed',
]);

const Body = z.object({ e: z.string().max(40), p: z.record(z.union([z.string(), z.number()])).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !ALLOW.has(parsed.data.e)) return fail('BAD_EVENT', 'Bad event.', 400);
  await trackEvent(parsed.data.e, parsed.data.p);
  return ok({ tracked: true });
}
