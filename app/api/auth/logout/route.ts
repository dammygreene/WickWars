import { clearSessionCookie } from '@/lib/auth/session';
import { ok } from '@/lib/api/json';

export async function POST() {
  clearSessionCookie();
  return ok({ loggedOut: true });
}
