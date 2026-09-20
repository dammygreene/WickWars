import { readCardAsset } from '@/lib/cards/render';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { cardId: string } }) {
  const png = await readCardAsset(params.cardId, 'png');
  if (!png) return new Response('Card not found', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(png.length),
    },
  });
}
