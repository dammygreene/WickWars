'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';
import { track } from '@/lib/client/analytics';

/**
 * Route-level error boundary. Catches render/data errors in any page segment
 * and keeps them from blanking the whole app. Server data (results, stats,
 * cards) is durable — a retry re-mounts the segment cleanly.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route-error]', error);
    track('client_error', { digest: error.digest ?? '', where: 'route' });
  }, [error]);

  return (
    <div className="ww-container max-w-2xl py-16">
      <ErrorState
        title="SOMETHING BROKE."
        body="The arena hit a snag mid-render. Your runs and stats are safe on the server — retry the page."
        onRetry={reset}
      />
    </div>
  );
}
