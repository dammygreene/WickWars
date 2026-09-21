'use client';

import { useEffect, useState } from 'react';
import { Lockup } from '@/components/brand/Logo';
import { AtmosphereBackground } from './AtmosphereBackground';

export function LoadingScreen() {
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'hidden'>('visible');

  useEffect(() => {
    let exitTimer = 0;
    let hideTimer = 0;
    const beginExit = () => {
      exitTimer = window.setTimeout(() => {
        setPhase('exiting');
        hideTimer = window.setTimeout(() => setPhase('hidden'), 450);
      }, 260);
    };
    if (document.readyState === 'complete') beginExit();
    else window.addEventListener('load', beginExit, { once: true });
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener('load', beginExit);
    };
  }, []);

  if (phase === 'hidden') return null;
  return (
    <div className={`loading-screen loading-screen-${phase}`} role="status" aria-label="Entering the market">
      <AtmosphereBackground state="loading" />
      <div className="loading-content">
        <div className="loading-logo-wrap">
          <Lockup className="loading-logo" />
        </div>
        <div className="loading-progress" aria-hidden>
          <span />
        </div>
        <p className="loading-label">ENTERING THE MARKET</p>
        <p className="loading-sublabel">PREPARING THE DAILY WICK</p>
      </div>
    </div>
  );
}