import { promises as fs } from 'fs';
import path from 'path';

/**
 * Card templates are the art-directed source of truth (ww/*.svg).
 * We load them raw and strip only the <metadata> provenance blob to keep
 * generated assets lean. Layout, geometry, and styling are never altered.
 */

const cache = new Map<string, string>();

export async function loadTemplate(name: 'game-result-template.svg' | 'all-time-template.svg'): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const raw = await fs.readFile(path.join(process.cwd(), 'ww', name), 'utf8');
  const cleaned = raw.replace(/<metadata>[\s\S]*?<\/metadata>/, '');
  cache.set(name, cleaned);
  return cleaned;
}
