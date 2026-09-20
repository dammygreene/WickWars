import { promises as fs } from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

/**
 * SVG -> PNG pipeline: render at 2x (2400x3000) with resvg + brand TTFs,
 * then downsample to the final 1200x1500 share asset with sharp.
 */

const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');
const CARDS_DIR = path.join(process.cwd(), '.data', 'cards');

let fontFiles: string[] | null = null;
async function getFontFiles(): Promise<string[]> {
  if (!fontFiles) {
    const entries = await fs.readdir(FONTS_DIR);
    fontFiles = entries.filter((f) => f.endsWith('.ttf')).map((f) => path.join(FONTS_DIR, f));
    if (!fontFiles.length) throw new Error('No card fonts found in assets/fonts');
  }
  return fontFiles;
}

export interface RenderedCard {
  png: Buffer;
  width: number;
  height: number;
  direct: boolean; // true when sharp downsample was unavailable
}

export async function renderCardPng(svg: string): Promise<RenderedCard> {
  const files = await getFontFiles();
  const hi = new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: files, defaultFontFamily: 'Inter, sans-serif' },
    fitTo: { mode: 'width', value: 2400 },
  });
  const hiPng = Buffer.from(hi.render().asPng());

  try {
    const sharp = (await import('sharp')).default;
    const png = await sharp(hiPng).resize(1200, 1500, { fit: 'fill' }).png({ quality: 92, compressionLevel: 9 }).toBuffer();
    return { png, width: 1200, height: 1500, direct: false };
  } catch (err) {
    console.error('[cards] sharp downsample unavailable, rendering direct 1200px', err);
    const lo = new Resvg(svg, {
      font: { loadSystemFonts: false, fontFiles: files, defaultFontFamily: 'Inter, sans-serif' },
      fitTo: { mode: 'width', value: 1200 },
    });
    return { png: Buffer.from(lo.render().asPng()), width: 1200, height: 1500, direct: true };
  }
}

export async function storeCardAsset(cardId: string, svg: string, png: Buffer): Promise<void> {
  await fs.mkdir(CARDS_DIR, { recursive: true });
  await fs.writeFile(path.join(CARDS_DIR, `${cardId}.svg`), svg);
  await fs.writeFile(path.join(CARDS_DIR, `${cardId}.png`), png);
}

export async function readCardAsset(cardId: string, ext: 'png' | 'svg'): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(CARDS_DIR, `${cardId}.${ext}`));
  } catch {
    return null;
  }
}
