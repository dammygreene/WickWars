import { cookies } from 'next/headers';
import { challengeFor, newCodeVerifier, newState, xAuthUrl, xConfigured } from '@/lib/auth/x';
import { trackEvent } from '@/lib/store/db';
import { fail } from '@/lib/api/json';

export async function GET() {
  if (!xConfigured()) return fail('X_NOT_CONFIGURED', 'X login is not available right now.', 503);
  const state = newState();
  const verifier = newCodeVerifier();
  const secure = process.env.NODE_ENV === 'production';
  cookies().set('ww_x_state', state, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 600 });
  cookies().set('ww_x_verifier', verifier, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 600 });
  await trackEvent('auth_started', { method: 1 });
  return Response.redirect(xAuthUrl(state, challengeFor(verifier)), 302);
}
