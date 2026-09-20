/**
 * X (Twitter) OAuth 2.0 with PKCE — real implementation.
 * Active only when X_CLIENT_ID / X_CLIENT_SECRET / X_REDIRECT_URI are set;
 * otherwise the UI shows an honest "unavailable" state and guest play stays open.
 */
import { createHash, randomBytes } from 'crypto';

export function xConfigured(): boolean {
  return !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_REDIRECT_URI);
}

export function xAuthUrl(state: string, codeChallenge: string): string {
  const u = new URL('https://twitter.com/i/oauth2/authorize');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', process.env.X_CLIENT_ID!);
  u.searchParams.set('redirect_uri', process.env.X_REDIRECT_URI!);
  u.searchParams.set('scope', 'users.read tweet.read offline.access');
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export function newCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function newState(): string {
  return randomBytes(16).toString('base64url');
}

export interface XTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string, verifier: string): Promise<XTokenSet> {
  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.X_REDIRECT_URI!,
      code_verifier: verifier,
      client_id: process.env.X_CLIENT_ID!,
    }),
  });
  if (!res.ok) throw new Error(`X token exchange failed (${res.status})`);
  const json = (await res.json()) as XTokenSet;
  // Confidential client: X also accepts basic auth; form client_id works for PKCE public-ish flows.
  return json;
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

export async function fetchXUser(accessToken: string): Promise<XUser> {
  const res = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`X user fetch failed (${res.status})`);
  const json = (await res.json()) as { data: XUser };
  return json.data;
}

/** Prefer the full-size avatar over the default thumbnail. */
export function fullSizeAvatar(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/_normal(\.[a-z]+)$/i, '_400x400$1');
}
