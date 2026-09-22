import { requirePlayer } from '@/lib/auth/session';
import { onboardingStatus } from '@/lib/store/db';
import { ok, failFrom } from '@/lib/api/json';

export async function GET() {
  try {
    const player = await requirePlayer();
    return ok(await onboardingStatus(player.playerId));
  } catch (e) {
    return failFrom(e);
  }
}
