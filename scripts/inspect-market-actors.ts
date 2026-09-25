import { challengeForDay, dayKey } from '../lib/game/challenge';
import { regimeForDay } from '../lib/game/regime';
import { generateMarketActorPlan, summarizeMarketActors } from '../lib/game/actors/plan';
import { buildScenario } from '../lib/game/scenario';
import { analyzeMarketDiagnostics } from '../lib/game/actors/diagnostics';

function inspectDate(dateKey: string) {
  const challenge = challengeForDay(dateKey);
  const regime = regimeForDay(dateKey);
  const plan = generateMarketActorPlan({
    seed: challenge.scenarioId,
    regime,
  });
  const summary = summarizeMarketActors(plan);
  const scenario = buildScenario({
    scenarioId: challenge.scenarioId,
    seed: challenge.scenarioId,
    regime,
    marketActorsVersion: 'v1',
  });
  const diag = analyzeMarketDiagnostics(scenario.prices, scenario.startingPrice, plan);

  console.log(`\n======================================================`);
  console.log(`DATE: ${dateKey} | REGIME: ${regime.name} (${regime.id})`);
  console.log(`ACTORS (${plan.actorCount}):`);
  for (const e of plan.events) {
    const actorSum = summary.actors.find((a) => a.id === e.actorId);
    console.log(
      `  • ${actorSum?.name} [${actorSum?.variantName}] | ${(e.startMs / 1000).toFixed(1)}s - ${(e.endMs / 1000).toFixed(1)}s (${(e.durationMs / 1000).toFixed(1)}s) | Dir: ${e.direction > 0 ? 'BULL' : 'BEAR'} | Int: ${e.intensity.toFixed(2)}`
    );
  }
  console.log(`MARKET NARRATIVE METRICS:`);
  console.log(`  Major Reversals (>=3.5% swing): ${diag.majorReversalCount}`);
  console.log(`  Minor Reversals (>=1.5% swing): ${diag.minorReversalCount}`);
  console.log(`  Directional Segments: ${diag.directionalSegments}`);
  console.log(`  Actor Overlap Duration: ${(diag.actorOverlapDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Max Excursion: ${diag.maxExcursion.toFixed(3)}x | Max DD: ${diag.maxDrawdownPct.toFixed(2)}%`);
  console.log(`  Largest Move: ${diag.largestMovePct.toFixed(1)}% | Largest Reversal: ${diag.largestReversalPct.toFixed(1)}%`);
  console.log(`  End Return: ${(diag.cumulativeReturn * 100).toFixed(2)}% | Dominant Dir Ratio: ${(diag.dominantDirectionRatio * 100).toFixed(1)}%`);
  console.log(`  Hold Gaming Vulnerable: ${diag.isHoldGamingVulnerable ? 'YES (FAIL)' : 'NO (SAFE)'}`);
}

const testDates = [
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
];

for (const d of testDates) {
  inspectDate(d);
}
