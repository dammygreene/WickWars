import { xConfigured } from '@/lib/auth/x';
import { ok } from '@/lib/api/json';

export async function GET() {
  return ok({ x: xConfigured(), wallet: true, guest: true });
}
