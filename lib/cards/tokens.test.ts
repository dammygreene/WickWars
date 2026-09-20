import { describe, it, expect } from 'vitest';
import { replaceToken, replaceFullTextToken, escapeXml } from './text';
import { buildChartRegion } from './chart';
import { buildScenario } from '@/lib/game/scenario';

describe('card tokens', () => {
  it('replaces both {{T}} and {T} spellings', () => {
    const svg = '<g>{{PNL}} and {PNL} and {{ACCENT}}{ACCENT}</g>';
    const out = replaceToken(replaceToken(svg, 'PNL', '+$5'), 'ACCENT', '#fff');
    expect(out).toBe('<g>+$5 and +$5 and #fff#fff</g>');
  });

  it('escapes xml in values', () => {
    expect(escapeXml('<a>&"\'')).toBe('&lt;a&gt;&amp;&quot;&apos;');
  });

  it('shrinks full-content text to fit and truncates long usernames', () => {
    const svg = '<text x="0" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="24" fill="#fff">{USERNAME}</text>';
    const out = replaceFullTextToken(svg, 'USERNAME', '@thegreatestdegenever', { maxWidth: 140, minSize: 13, truncateAt: 16 });
    expect(out).toContain('…');
    expect(out).not.toContain('{USERNAME}');
    const size = parseFloat(out.match(/font-size="([\d.]+)"/)![1]);
    expect(size).toBeLessThanOrEqual(24);
    expect(size).toBeGreaterThanOrEqual(13);
  });

  it('leaves inline tokens for plain replacement', () => {
    const svg = '<text font-size="12">START {START_BALANCE}</text>';
    expect(replaceFullTextToken(svg, 'START_BALANCE', '$10', { maxWidth: 50, minSize: 8 })).toBe(svg);
    expect(replaceToken(svg, 'START_BALANCE', '$10')).toContain('START $10');
  });
});

describe('chart region', () => {
  it('builds candles + markers without placeholders', () => {
    const s = buildScenario({ scenarioId: 't', seed: 't' });
    const g = buildChartRegion({
      scenario: s,
      trades: [
        { id: 'a', gameId: 'g', t: 5000, action: 'LONG', price: s.prices[50], notional: 10000, sideAfter: 'LONG', entryPriceAfter: 1, realizedPnl: 0, kind: 'OPEN' },
        { id: 'b', gameId: 'g', t: 15000, action: 'CLOSE', price: s.prices[150], notional: 10000, sideAfter: 'FLAT', entryPriceAfter: null, realizedPnl: 5, kind: 'CLOSE' },
      ],
      mode: 'DAILY WICK',
      pair: 'WICK/USD',
      durationLabel: '45s',
      startLabel: '$10,000',
      endLabel: '$10,005.00',
    });
    expect(g).toContain('id="chart-region"');
    expect(g).not.toMatch(/\{[A-Z_]+\}/);
    expect((g.match(/<rect/g) || []).length).toBeGreaterThan(25);
  });

  it('handles a no-trade game gracefully', () => {
    const s = buildScenario({ scenarioId: 't', seed: 't' });
    const g = buildChartRegion({ scenario: s, trades: [], mode: 'M', pair: 'P', durationLabel: '45s', startLabel: 'S', endLabel: 'E' });
    expect(g).toContain('id="chart-region"');
    expect(g).not.toContain('<circle');
  });
});
