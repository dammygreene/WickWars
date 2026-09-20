import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(code: string, message: string, status = 400, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers });
}

/** Friendly messages for known error codes (never leak internals). */
export function failFrom(e: unknown): NextResponse {
  if (e && typeof e === 'object' && 'code' in e) {
    const { code } = e as { code: string };
    const map: Record<string, [string, number]> = {
      NOT_AUTHENTICATED: ['Connect to continue.', 401],
      GAME_NOT_FOUND: ['Game not found.', 404],
      RESULT_NOT_FOUND: ['Result not found.', 404],
      RESULT_NOT_VERIFIED: ['This run could not be verified.', 422],
      PLAYER_NOT_FOUND: ['Player not found.', 404],
      NO_GAMES: ['Play your first round to build this card.', 422],
      USERNAME_TAKEN: ['That handle is taken.', 409],
      GAME_NOT_LIVE: ['This game is no longer live.', 409],
      OUTSIDE_WINDOW: ['Trade fell outside the game window.', 422],
      NO_POSITION: ['No open position to close.', 422],
      SAME_SIDE: ['Position is already on that side.', 422],
      LIQUIDATED: ['Position was liquidated.', 422],
      ALREADY_FINISHED: ['Game already finished.', 409],
      X_NOT_CONFIGURED: ['X login is not available right now.', 503],
      X_AUTH_FAILED: ['X authentication failed. Try again.', 502],
      WALLET_INVALID: ['Wallet signature invalid.', 401],
      CARD_NOT_FOUND: ['Card not found.', 404],
      CHALLENGE_NOT_LIVE: ["Today's wick isn't live — new rounds drop at 00:00 UTC.", 409],
      GAME_ALREADY_LIVE: ['Finish your live run first.', 409],
      RATE_LIMITED: ['Slow down — too many requests.', 429],
    };
    const hit = map[code];
    if (hit) return fail(code, hit[0], hit[1]);
    return fail(code, 'Something went wrong.', 400);
  }
  console.error('[api]', e);
  return fail('INTERNAL', 'Something went wrong.', 500);
}
