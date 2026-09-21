import { readCardAsset } from '@/lib/cards/render';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const png = await readCardAsset(cardId, 'png');
  if (!png) return new Response('Card not found', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(png.length),
    },
  });
}
