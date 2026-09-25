import type { MarketActorEvent, MarketActorPlan } from './types';
import type { RegimeConfig } from '../regime';

/**
 * Envelope calculation for smooth ramp-in, peak, and fade-out.
 * Returns influence factor [0, 1].
 */
function actorEnvelope(progress: number, attack = 0.25, decay = 0.3): number {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < attack) {
    const p = progress / attack;
    // Smooth quadratic ramp in
    return p * p;
  }
  if (progress > 1 - decay) {
    const p = (1 - progress) / decay;
    return p * p;
  }
  return 1.0;
}

/**
 * Computes the per-tick directional return pressure and volatility multiplier
 * injected by an active actor event at the specified timestamp `tMs`.
 */
export function computeActorTickInfluence(
  event: MarketActorEvent,
  tMs: number,
  regime?: RegimeConfig,
): { returnDelta: number; volMultiplier: number } {
  if (tMs < event.startMs || tMs > event.endMs) {
    return { returnDelta: 0, volMultiplier: 1 };
  }

  const progress = (tMs - event.startMs) / Math.max(1, event.durationMs);
  const dir = event.direction;
  const intensity = event.intensity * (regime?.reversalScale ?? 1);

  let shapeReturn = 0;
  let volBoost = 1.0;

  switch (event.actorId) {
    case 'jeets': {
      // Panic selling / late violent cascade.
      // Starts with hesitation, then violent steep drop in the middle/late section,
      // optionally preceded or followed by a weak failed bounce.
      if (event.variant === 'failed_bounce') {
        if (progress < 0.28) {
          // small bounce attempt
          shapeReturn = -dir * 0.0007 * (1 - progress / 0.28);
          volBoost = 1.2;
        } else {
          // sharp cascade dump
          const p = (progress - 0.28) / 0.72;
          const env = actorEnvelope(p, 0.2, 0.4);
          shapeReturn = dir * 0.0028 * env;
          volBoost = 1.8;
        }
      } else if (event.variant === 'cascade') {
        // Accelerating sell pressure
        const accel = Math.pow(progress, 1.6);
        shapeReturn = dir * 0.0026 * accel;
        volBoost = 1.4 + progress * 0.8;
      } else {
        // 'panic_sell': sudden violent flush then exhaustion
        const env = actorEnvelope(progress, 0.2, 0.4);
        shapeReturn = dir * 0.003 * env;
        volBoost = 1.7;
      }
      break;
    }

    case 'cabal': {
      // Coordinated pump & dump or distribution trap
      if (event.variant === 'pump_and_dump') {
        if (progress < 0.48) {
          // Rapid artificial acceleration upward
          const env = actorEnvelope(progress / 0.48, 0.2, 0.2);
          shapeReturn = dir * 0.0032 * env;
          volBoost = 1.5;
        } else {
          // Fast brutal distribution dump
          const env = actorEnvelope((progress - 0.48) / 0.52, 0.15, 0.35);
          shapeReturn = -dir * 0.0034 * env;
          volBoost = 1.9;
        }
      } else if (event.variant === 'cabal_fake_breakout') {
        if (progress < 0.35) {
          // Breakout push
          shapeReturn = dir * 0.0028 * actorEnvelope(progress / 0.35, 0.3, 0.1);
          volBoost = 1.4;
        } else {
          // Immediate aggressive trap reversal
          shapeReturn = -dir * 0.0029 * actorEnvelope((progress - 0.35) / 0.65, 0.1, 0.4);
          volBoost = 1.6;
        }
      } else {
        // accumulate_then_distribute
        if (progress < 0.3) {
          // stealth accumulation (slight positive drift, low vol)
          shapeReturn = dir * 0.001;
          volBoost = 0.85;
        } else if (progress < 0.6) {
          // markup pump
          shapeReturn = dir * 0.003 * actorEnvelope((progress - 0.3) / 0.3, 0.2, 0.2);
          volBoost = 1.6;
        } else {
          // heavy distribution dumping into retail liquidity
          shapeReturn = -dir * 0.0028 * actorEnvelope((progress - 0.6) / 0.4, 0.15, 0.3);
          volBoost = 1.7;
        }
      }
      break;
    }

    case 'whale': {
      // Accumulation / Absorption / Distribution / Dump
      // Large directional power, absorbs selling or distributes
      if (event.variant === 'absorption') {
        // Absorbs opposing flow: price dips slightly then recovers repeatedly
        const cycle = Math.sin(progress * Math.PI * 4);
        shapeReturn = dir * 0.0018 + cycle * 0.0012;
        volBoost = 1.3;
      } else if (event.variant === 'accumulation') {
        // Persistent strong buying floor
        const env = actorEnvelope(progress, 0.25, 0.35);
        shapeReturn = dir * 0.0024 * env;
        volBoost = 1.1;
      } else if (event.variant === 'distribution') {
        // Subtle but crushing selling ceiling
        const env = actorEnvelope(progress, 0.2, 0.4);
        shapeReturn = -dir * 0.0024 * env;
        volBoost = 1.2;
      } else {
        // 'dump': massive block liquidation
        const env = actorEnvelope(progress, 0.15, 0.4);
        shapeReturn = -Math.abs(dir) * 0.0032 * env;
        volBoost = 1.8;
      }
      break;
    }

    case 'sniper': {
      // Sweeps local high/low, then executes an instantaneous sharp wick reversal
      if (event.variant === 'high_sweep' || event.variant === 'sniper_fake_breakout') {
        if (progress < 0.3) {
          // Sharp push above resistance (wicking)
          shapeReturn = 0.0038 * Math.pow(1 - progress / 0.3, 0.5);
          volBoost = 2.0;
        } else {
          // Violent snapback trap
          shapeReturn = -0.0036 * actorEnvelope((progress - 0.3) / 0.7, 0.1, 0.35);
          volBoost = 1.7;
        }
      } else {
        // 'low_sweep' / 'fake_breakdown'
        if (progress < 0.3) {
          // Sharp push below support
          shapeReturn = -0.0038 * Math.pow(1 - progress / 0.3, 0.5);
          volBoost = 2.0;
        } else {
          // Violent snapback reclaim
          shapeReturn = 0.0036 * actorEnvelope((progress - 0.3) / 0.7, 0.1, 0.35);
          volBoost = 1.7;
        }
      }
      break;
    }

    case 'paper_hands': {
      // Panic after small move, followed by recovery or relief rally
      if (event.variant === 'panic_dump' || event.variant === 'capitulation') {
        if (progress < 0.5) {
          // cascading panic exit
          shapeReturn = dir * 0.0029 * actorEnvelope(progress / 0.5, 0.2, 0.2);
          volBoost = 1.8;
        } else {
          // sharp relief rally / dead recovery as sellers run out
          shapeReturn = -dir * 0.0024 * actorEnvelope((progress - 0.5) / 0.5, 0.15, 0.4);
          volBoost = 1.4;
        }
      } else {
        // 'panic_bounce' / 'relief_rally'
        if (progress < 0.45) {
          shapeReturn = -dir * 0.0026 * actorEnvelope(progress / 0.45, 0.2, 0.2);
          volBoost = 1.6;
        } else {
          shapeReturn = dir * 0.0028 * actorEnvelope((progress - 0.45) / 0.55, 0.2, 0.3);
          volBoost = 1.5;
        }
      }
      break;
    }

    case 'bot_flow': {
      // Algorithmic flow: short momentum bursts, mean reversion, and controlled whipsaws
      // Controlled frequency so it creates readable tape transitions without high-frequency oscillation noise
      if (event.variant === 'whipsaw' || event.variant === 'momentum_flip') {
        // 2 distinct phases: initial burst in direction, then sharp counter-momentum flip
        const wave = Math.sin(progress * Math.PI * 2);
        shapeReturn = dir * 0.0016 * wave;
        volBoost = 1.35;
      } else if (event.variant === 'mean_reversion') {
        // Counter-drift against current trend
        const wave = Math.cos(progress * Math.PI * 2);
        shapeReturn = -dir * 0.0014 * wave;
        volBoost = 1.25;
      } else {
        // 'chop': mild back-and-forth micro-rotations
        const wave = Math.sin(progress * Math.PI * 3);
        shapeReturn = dir * 0.0012 * wave;
        volBoost = 1.3;
      }
      break;
    }
  }

  const returnDelta = shapeReturn * intensity;
  return {
    returnDelta,
    volMultiplier: Math.max(0.6, Math.min(2.5, volBoost)),
  };
}

/**
 * Combines influence of all active actors at timestamp `tMs`.
 */
export function combinedActorInfluence(
  plan: MarketActorPlan,
  tMs: number,
  regime?: RegimeConfig,
): { returnDelta: number; volMultiplier: number } {
  let totalReturnDelta = 0;
  let maxVolMult = 1.0;

  for (const event of plan.events) {
    if (tMs >= event.startMs && tMs <= event.endMs) {
      const { returnDelta, volMultiplier } = computeActorTickInfluence(event, tMs, regime);
      totalReturnDelta += returnDelta;
      maxVolMult = Math.max(maxVolMult, volMultiplier);
    }
  }

  return {
    returnDelta: totalReturnDelta,
    volMultiplier: maxVolMult,
  };
}
