import { z } from 'zod';
import { isAddress, getAddress, verifyMessage } from 'viem';
import { consumeNonce, emptyStats, newId, savePlayer } from '@/lib/store/db';
import { currentPlayer, setSessionCookie } from '@/lib/auth/session';
import { trackEvent } from '@/lib/store/db';
import type { PlayerIdentity } from '@/lib/types';
import { ok, fail, failFrom } from '@/lib/api/json';

const Body = z.object({
  address: z.string(),
  message: z.string().max(500),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  chain: z.string().max(32).default('ethereum'),
});

export async function POST(req: Request) {
  try {
    const { address, message, signature, chain } = Body.parse(await req.json());
    if (!isAddress(address)) return fail('BAD_ADDRESS', 'Not a valid wallet address.', 400);
    const checksum = getAddress(address);
    const nonceMatch = message.match(/Nonce: ([0-9a-f]{32})/);
    if (!nonceMatch || !message.includes(checksum)) return fail('WALLET_INVALID', 'Wallet signature invalid.', 401);
    const okNonce = await consumeNonce(checksum, nonceMatch[1]);
    if (!okNonce) return fail('WALLET_INVALID', 'Challenge expired. Try again.', 401);
    const valid = await verifyMessage({ address: checksum, message, signature: signature as `0x${string}` });
    if (!valid) return fail('WALLET_INVALID', 'Wallet signature invalid.', 401);

    const me = await currentPlayer();
    let player: PlayerIdentity;
    if (me) {
      player = { ...me, guest: me.guest && !me.x ? true : false, wallet: { address: checksum, chain } };
      await savePlayer(player);
    } else {
      player = {
        playerId: newId('p'),
        username: `wick_${checksum.slice(2, 8).toLowerCase()}`,
        displayName: `${checksum.slice(0, 6)}…${checksum.slice(-4)}`,
        title: 'WICK NOVICE',
        archetype: 'UNRANKED',
        level: 1,
        guest: false,
        wallet: { address: checksum, chain },
        createdAt: Date.now(),
      };
      // Ensure unique handle
      const { usernameTaken } = await import('@/lib/store/db');
      let h = player.username;
      let i = 0;
      while (await usernameTaken(h)) h = `${player.username}${++i}`;
      player.username = h;
      await savePlayer(player, emptyStats());
    }
    setSessionCookie(player.playerId);
    await trackEvent('wallet_connected');
    await trackEvent('auth_completed', { method: 2 });
    return ok({ player });
  } catch (e) {
    if (e instanceof z.ZodError) return fail('BAD_REQUEST', 'Invalid wallet payload.', 400);
    return failFrom(e);
  }
}
