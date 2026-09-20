'use client';

/**
 * Minimal WebAudio blips for game feedback. OFF by default; the player opts in
 * via the sound toggle. No loops, no assets, respects autoplay policies
 * (context resumes on first user gesture).
 */

let ctx: AudioContext | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  return enabled;
}

export function setSound(on: boolean): void {
  enabled = on;
  if (on) ensure();
  listeners.forEach((fn) => fn(on));
}

export function onSoundChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function ensure(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, durMs: number, type: OscillatorType, gain = 0.05, when = 0): void {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  try {
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + durMs / 1000 + 0.02);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  count: () => blip(440, 120, 'sine'),
  go: () => blip(880, 180, 'sine', 0.07),
  open: () => blip(620, 90, 'triangle'),
  closeWin: () => {
    blip(660, 100, 'triangle');
    blip(990, 140, 'triangle', 0.05, 0.07);
  },
  closeLoss: () => blip(220, 160, 'triangle'),
  end: () => blip(520, 220, 'sine', 0.06),
  rekt: () => blip(110, 400, 'sawtooth', 0.04),
};
