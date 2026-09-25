import type { MarketActorPlan, MarketDiagnostics } from './types';

/**
 * Evaluates whether a generated price path satisfies the game's safety limits
 * and anti-gaming criteria (not trivially won by holding LONG once or SHORT once for 45s).
 *
 * Separates genuine tradeable macro market reversals (major: >= 3.5% swing excursion, min 10 ticks separation)
 * from tactical swing points (minor: >= 1.5% swing excursion) and micro-oscillations.
 */
export function analyzeMarketDiagnostics(
  prices: number[],
  startingPrice: number,
  plan?: MarketActorPlan,
): MarketDiagnostics {
  if (!prices || prices.length < 2) {
    return {
      cumulativeReturn: 0,
      maxExcursion: 1,
      maxDrawdownPct: 0,
      meaningfulDirectionalChanges: 0,
      meaningfulLocalReversals: 0,
      majorReversalCount: 0,
      minorReversalCount: 0,
      largestMovePct: 0,
      largestReversalPct: 0,
      directionalSegments: 0,
      dominantDirectionDurationMs: 0,
      actorOverlapDurationMs: 0,
      largestPositiveRunTicks: 0,
      largestNegativeRunTicks: 0,
      dominantDirectionRatio: 1,
      perTickMovementMax: 0,
      actorInfluenceContribution: 0,
      isHoldGamingVulnerable: true,
      isValid: false,
    };
  }

  const endPrice = prices[prices.length - 1];
  const cumulativeReturn = (endPrice - startingPrice) / startingPrice;

  let minPrice = prices[0];
  let maxPrice = prices[0];
  let maxTickMove = 0;

  // Track runs and reversals
  let currentRunTicks = 0;
  let currentRunDir = 0; // 1 up, -1 down
  let largestPositiveRunTicks = 0;
  let largestNegativeRunTicks = 0;
  let positiveTicks = 0;
  let negativeTicks = 0;

  let peak = prices[0];
  let maxDrawdownPct = 0;

  // Major Reversals (macro decision points: >= 3.5% swing with >= 10 ticks persistence)
  let majorReversalCount = 0;
  let majorPivotPrice = prices[0];
  let majorPivotIdx = 0;
  let majorDir = 0;
  let largestMovePct = 0;
  let largestReversalPct = 0;

  // Minor Reversals (tactical setups: >= 1.5% swing)
  let minorReversalCount = 0;
  let minorPivotPrice = prices[0];
  let minorDir = 0;

  for (let i = 1; i < prices.length; i++) {
    const p = prices[i];
    const prev = prices[i - 1];

    if (p < minPrice) minPrice = p;
    if (p > maxPrice) maxPrice = p;

    const tickDelta = Math.abs(p / prev - 1);
    if (tickDelta > maxTickMove) maxTickMove = tickDelta;

    if (p > peak) peak = p;
    const dd = ((peak - p) / peak) * 100;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;

    const dir = p > prev ? 1 : p < prev ? -1 : 0;
    if (dir > 0) positiveTicks++;
    else if (dir < 0) negativeTicks++;

    if (dir !== 0) {
      if (dir === currentRunDir) {
        currentRunTicks++;
      } else {
        if (currentRunDir > 0 && currentRunTicks > largestPositiveRunTicks) {
          largestPositiveRunTicks = currentRunTicks;
        } else if (currentRunDir < 0 && currentRunTicks > largestNegativeRunTicks) {
          largestNegativeRunTicks = currentRunTicks;
        }
        currentRunDir = dir;
        currentRunTicks = 1;
      }
    }

    // Minor Reversal Tracking (>= 1.5%)
    const minorMove = (p - minorPivotPrice) / minorPivotPrice;
    if (minorDir === 0) {
      if (Math.abs(minorMove) >= 0.015) {
        minorDir = minorMove > 0 ? 1 : -1;
        minorPivotPrice = p;
      }
    } else if (minorDir > 0) {
      if (p > minorPivotPrice) {
        minorPivotPrice = p;
      } else if ((minorPivotPrice - p) / minorPivotPrice >= 0.015) {
        minorReversalCount++;
        minorDir = -1;
        minorPivotPrice = p;
      }
    } else if (minorDir < 0) {
      if (p < minorPivotPrice) {
        minorPivotPrice = p;
      } else if ((p - minorPivotPrice) / minorPivotPrice >= 0.015) {
        minorReversalCount++;
        minorDir = 1;
        minorPivotPrice = p;
      }
    }

    // Major Reversal Tracking (>= 3.5%, >= 10 ticks separation)
    const majorMove = (p - majorPivotPrice) / majorPivotPrice;
    if (majorDir === 0) {
      if (Math.abs(majorMove) >= 0.035) {
        majorDir = majorMove > 0 ? 1 : -1;
        majorPivotPrice = p;
        majorPivotIdx = i;
        const absMove = Math.abs(majorMove) * 100;
        if (absMove > largestMovePct) largestMovePct = absMove;
      }
    } else if (majorDir > 0) {
      if (p > majorPivotPrice) {
        majorPivotPrice = p;
        majorPivotIdx = i;
        const absMove = ((majorPivotPrice - startingPrice) / startingPrice) * 100;
        if (absMove > largestMovePct) largestMovePct = absMove;
      } else if ((majorPivotPrice - p) / majorPivotPrice >= 0.035 && i - majorPivotIdx >= 10) {
        const revPct = ((majorPivotPrice - p) / majorPivotPrice) * 100;
        if (revPct > largestReversalPct) largestReversalPct = revPct;
        majorReversalCount++;
        majorDir = -1;
        majorPivotPrice = p;
        majorPivotIdx = i;
      }
    } else if (majorDir < 0) {
      if (p < majorPivotPrice) {
        majorPivotPrice = p;
        majorPivotIdx = i;
      } else if ((p - majorPivotPrice) / majorPivotPrice >= 0.035 && i - majorPivotIdx >= 10) {
        const revPct = ((p - majorPivotPrice) / majorPivotPrice) * 100;
        if (revPct > largestReversalPct) largestReversalPct = revPct;
        majorReversalCount++;
        majorDir = 1;
        majorPivotPrice = p;
        majorPivotIdx = i;
      }
    }
  }

  // Final flush of run length
  if (currentRunDir > 0 && currentRunTicks > largestPositiveRunTicks) {
    largestPositiveRunTicks = currentRunTicks;
  } else if (currentRunDir < 0 && currentRunTicks > largestNegativeRunTicks) {
    largestNegativeRunTicks = currentRunTicks;
  }

  const maxExcursion = maxPrice / Math.max(0.001, minPrice);
  const totalDirectedTicks = Math.max(1, positiveTicks + negativeTicks);
  const dominantDirectionRatio = Math.max(positiveTicks, negativeTicks) / totalDirectedTicks;
  const dominantDirectionDurationMs = Math.round(dominantDirectionRatio * (prices.length - 1) * 100);

  // Calculate actor overlap duration if plan is present
  let actorOverlapDurationMs = 0;
  if (plan && plan.events.length > 1) {
    for (let t = 0; t <= 45_000; t += 100) {
      const activeCount = plan.events.filter((e) => t >= e.startMs && t <= e.endMs).length;
      if (activeCount > 1) {
        actorOverlapDurationMs += 100;
      }
    }
  }

  // Meaningful directional changes corresponds to minorReversalCount (>=1.5% swings)
  const meaningfulDirectionalChanges = minorReversalCount;
  const meaningfulLocalReversals = minorReversalCount;
  const directionalSegments = minorReversalCount + 1;

  // Hold gaming vulnerability:
  // If dominantDirectionRatio > 0.82 (e.g. 82%+ ticks in one direction)
  // OR if there are 0 meaningful local reversals and the market only moved one way
  // OR if a single run consumed more than 38% of the entire game without interruption
  const isHoldGamingVulnerable =
    dominantDirectionRatio > 0.82 ||
    (meaningfulDirectionalChanges < 1 && Math.abs(cumulativeReturn) > 0.02) ||
    largestPositiveRunTicks > prices.length * 0.38 ||
    largestNegativeRunTicks > prices.length * 0.38;

  // Sanity check bounds:
  // - prices must be positive and finite
  // - max excursion must be < 2.5 (from regime bounds)
  // - max tick move < 0.08 (from regime bounds)
  // - excursion must be > 1.01 (market must move)
  const isValid =
    prices.every((p) => Number.isFinite(p) && p > 0) &&
    maxExcursion < 2.5 &&
    maxExcursion > 1.01 &&
    maxTickMove < 0.08 &&
    !isHoldGamingVulnerable;

  return {
    cumulativeReturn,
    maxExcursion,
    maxDrawdownPct,
    meaningfulDirectionalChanges,
    meaningfulLocalReversals,
    majorReversalCount,
    minorReversalCount,
    largestMovePct,
    largestReversalPct,
    directionalSegments,
    dominantDirectionDurationMs,
    actorOverlapDurationMs,
    largestPositiveRunTicks,
    largestNegativeRunTicks,
    dominantDirectionRatio,
    perTickMovementMax: maxTickMove,
    actorInfluenceContribution: plan ? plan.events.length : 0,
    isHoldGamingVulnerable,
    isValid,
  };
}
