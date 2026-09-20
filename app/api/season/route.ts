import { seasonConfig, todayChallenge } from '@/lib/game/challenge';
import { ok } from '@/lib/api/json';

/**
 * Single source of truth for season metadata on the client. Client components
 * must read season info from here (env vars are not available in the browser
 * bundle — importing seasonConfig() client-side silently returns defaults and
 * drifts from the server-configured season).
 */
export async function GET() {
  const season = seasonConfig();
  const challenge = todayChallenge();
  const now = Date.now();
  return ok({
    season: {
      id: season.id,
      name: season.name,
      start: season.start,
      end: season.end,
      live: now >= new Date(season.start).getTime() && now < new Date(season.end).getTime(),
    },
    challenge: {
      id: challenge.id,
      endsAt: challenge.endsAt,
      pair: challenge.pair,
      leverage: challenge.leverage,
    },
    serverNow: now,
  });
}
