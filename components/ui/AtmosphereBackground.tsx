import { cn } from '@/lib/utils';

export type AtmosphereState =
  | 'neutral'
  | 'profit'
  | 'loss'
  | 'intense-profit'
  | 'intense-loss'
  | 'liquidation'
  | 'loading';

export function AtmosphereBackground({ state = 'neutral', className }: { state?: AtmosphereState; className?: string }) {
  return (
    <div className={cn('atmosphere', `atmosphere-${state}`, className)} aria-hidden>
      <div className="atmosphere-grid" />
      <div className="atmosphere-trace atmosphere-trace-one" />
      <div className="atmosphere-trace atmosphere-trace-two" />
      <div className="atmosphere-noise" />
    </div>
  );
}