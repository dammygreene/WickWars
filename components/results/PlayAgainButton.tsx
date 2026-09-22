'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { api, errMsg } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';

interface Props {
  sourceRunType?: string;
}

export function PlayAgainButton({ sourceRunType }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playAgain = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    track('play_again_clicked', { sourceRunType: sourceRunType ?? 'ranked', resultingRunType: 'practice' });
    try {
      const { game } = await api<{ game: { id: string } }>('/api/games', {
        method: 'POST',
        body: JSON.stringify({ runType: 'practice' }),
      });
      router.push(`/play?mode=practice&game=${encodeURIComponent(game.id)}`);
    } catch (e) {
      setError(errMsg(e, 'Could not start practice.'));
      setBusy(false);
    }
  };

  return (
    <div className="flex-1">
      <Button
        size="lg"
        className="w-full font-bold tracking-wide"
        onClick={playAgain}
        loading={busy}
        aria-label="Play again in practice mode"
      >
        PLAY AGAIN — PRACTICE
      </Button>
      {error && <p className="mt-2 text-center font-sans text-xs text-ww-loss" role="alert">{error}</p>}
    </div>
  );
}
