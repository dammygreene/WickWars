import { z } from 'zod';
import { isAddress, getAddress } from 'viem';
import { randomBytes } from 'crypto';
import { setNonce } from '@/lib/store/db';
import { ok, fail, failFrom } from '@/lib/api/json';

const Body = z.object({ address: z.string() });

export async function POST(req: Request) {
  try {
    const { address } = Body.parse(await req.json());
    if (!isAddress(address)) return fail('BAD_ADDRESS', 'Not a valid wallet address.', 400);
    const checksum = getAddress(address);
    const nonce = randomBytes(16).toString('hex');
    await setNonce(checksum, nonce);
    const message = `WICK WARS — verify wallet ownership\n\nAddress: ${checksum}\nNonce: ${nonce}\n\nThis signature proves you own this wallet. It never moves funds.`;
    return ok({ message, nonce });
  } catch (e) {
    return failFrom(e);
  }
}
