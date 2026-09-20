import { cookies } from 'next/headers';
import { exchangeCode, fetchXUser, fullSizeAvatar, xConfigured } from '@/lib/auth/x';
import { currentPlayer, setSessionCookie } from '@/lib/auth/session';
import { emptyStats, newId, savePlayer, usernameTaken, getPlayer } from '@/lib/store/db';
import { trackEvent } from '@/lib/store/db';
import type { PlayerIdentity } from '@/lib/types';

function base(): string {
  return process.env.WW_BASE_URL || 'http://localhost:3000';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (msg: string) => Response.redirect(`${base()}/?auth=x&error=${encodeURIComponent(msg)}`, 302);
  if (!xConfigured()) return fail('unavailable');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (err) return fail('denied');
  const jar = cookies();
  const wantState = jar.get('ww_x_state')?.value;
  const verifier = jar.get('ww_x_verifier')?.value;
  jar.delete('ww_x_state');
  jar.delete('ww_x_verifier');
  if (!code || !state || !wantState || state !== wantState || !verifier) return fail('invalid');

  try {
    const tokens = await exchangeCode(code, verifier);
    const xu = await fetchXUser(tokens.access_token);
    const avatar = fullSizeAvatar(xu.profile_image_url);

    const me = await currentPlayer();
    if (me) {
      // Link X to the current player.
      let username = me.username;
      if (me.guest && me.username.startsWith('wick_') && !(await usernameTaken(xu.username, me.playerId))) {
        username = xu.username;
      }
      const next: PlayerIdentity = {
        ...me,
        username,
        displayName: xu.name || username,
        avatarUrl: avatar ?? me.avatarUrl,
        guest: false,
        x: { userId: xu.id, handle: xu.username, avatarUrl: avatar },
      };
      await savePlayer(next);
      setSessionCookie(next.playerId);
      await trackEvent('auth_completed', { method: 1 });
      return Response.redirect(`${base()}/profile/${username}`, 302);
    }

    const { getPlayerByXId } = await import('@/lib/store/db');
    const found: PlayerIdentity | null = await getPlayerByXId(xu.id);

    if (found) {
      const next: PlayerIdentity = {
        ...found,
        displayName: xu.name || found.displayName,
        avatarUrl: avatar ?? found.avatarUrl,
        guest: false,
        x: { userId: xu.id, handle: xu.username, avatarUrl: avatar },
      };
      await savePlayer(next);
      setSessionCookie(next.playerId);
      await trackEvent('auth_completed', { method: 1 });
      return Response.redirect(`${base()}/profile/${next.username}`, 302);
    }

    let username = xu.username.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 18) || `wick_${xu.id.slice(-6)}`;
    if (username.length < 3) username = `wick_${xu.id.slice(-6)}`;
    if (await usernameTaken(username)) username = `${username.slice(0, 12)}_${xu.id.slice(-4)}`;
    const p: PlayerIdentity = {
      playerId: newId('p'),
      username,
      displayName: xu.name || username,
      avatarUrl: avatar,
      title: 'WICK NOVICE',
      archetype: 'UNRANKED',
      level: 1,
      guest: false,
      x: { userId: xu.id, handle: xu.username, avatarUrl: avatar },
      createdAt: Date.now(),
    };
    await savePlayer(p, emptyStats());
    setSessionCookie(p.playerId);
    await getPlayer(p.playerId); // warm
    await trackEvent('auth_completed', { method: 1 });
    return Response.redirect(`${base()}/profile/${username}`, 302);
  } catch (e) {
    console.error('[x-callback]', e);
    return fail('failed');
  }
}
