import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { PlayerIdentity } from '@/lib/types';
import { getPlayer } from '@/lib/store/db';

const COOKIE = 'ww_session';
const TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

function secret(): string {
  const s = process.env.WW_SESSION_SECRET;
  if (!s) throw new Error('WW_SESSION_SECRET is not set');
  return s;
}

interface SessionPayload {
  pid: string;
  iat: number;
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function mintSession(playerId: string): string {
  const payload: SessionPayload = { pid: playerId, iat: Date.now(), exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(sign(body));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!p.pid || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function currentPlayer(): Promise<PlayerIdentity | null> {
  const token = cookies().get(COOKIE)?.value;
  const s = verifySession(token);
  if (!s) return null;
  return getPlayer(s.pid);
}

export async function requirePlayer(): Promise<PlayerIdentity> {
  const p = await currentPlayer();
  if (!p) throw new AuthError('NOT_AUTHENTICATED', 'Connect to play.');
  return p;
}

export function setSessionCookie(playerId: string) {
  cookies().set(COOKIE, mintSession(playerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const SESSION_COOKIE = COOKIE;
