'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';

export function ChallengeButton({ gameId }: { gameId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const { code } = await api<{ code: string; cached: boolean }>('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({ gameId }),
      });
      const url = `${window.location.origin}/challenge/${code}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        toast({ kind: 'info', title: 'Challenge ready', body: url });
      }
      track('challenge_created');
      if (navigator.clipboard) toast({ kind: 'success', title: 'Challenge link copied', body: 'Send it to someone brave.' });
    } catch {
      toast({ kind: 'error', title: 'Challenge failed', body: 'Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="lg" variant="secondary" onClick={create} loading={busy} className="w-full font-bold sm:w-auto">
      CHALLENGE SOMEONE
    </Button>
  );
}
