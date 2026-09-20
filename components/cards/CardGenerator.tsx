'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api, errMsg } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { cn } from '@/lib/utils';

interface Props {
  mode: 'game' | 'alltime';
  gameId?: string;
  shareText: string;
  compact?: boolean;
}

/** Generate → preview → download / share / copy. Used on results + profile. */
export function CardGenerator({ mode, gameId, shareText, compact }: Props) {
  const { toast } = useToast();
  const [cardId, setCardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = mode === 'game' ? `/api/cards/game/${gameId}` : '/api/cards/alltime';
      const { cardId: id } = await api<{ cardId: string; cached: boolean }>(path, { method: 'POST', body: '{}' });
      setCardId(id);
      track('card_generated');
    } catch (e) {
      setError(errMsg(e, 'Card generation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const imgUrl = cardId ? `/api/cards/${cardId}/image` : null;
  const pageUrl = () => `${window.location.origin}/card/${cardId}`;

  const download = async () => {
    if (!imgUrl || !cardId) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wickwars-${cardId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      track('card_downloaded');
    } catch {
      toast({ kind: 'error', title: 'Download failed', body: 'Try opening the full card and saving it manually.' });
    }
  };

  const shareX = () => {
    if (!cardId) return;
    track('card_shared');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl())}`;
    window.open(url, '_blank', 'noopener,width=560,height=460');
  };

  const copyLink = async () => {
    if (!cardId) return;
    try {
      await navigator.clipboard.writeText(pageUrl());
      toast({ kind: 'success', title: 'Card link copied' });
    } catch {
      toast({ kind: 'error', title: 'Copy failed', body: pageUrl() });
    }
  };

  if (!cardId) {
    return (
      <div className={cn('flex flex-col items-center gap-3', !compact && 'py-2')}>
        <Button size="lg" onClick={generate} loading={busy} className="w-full font-display font-bold tracking-wide sm:w-auto sm:px-10">
          {busy ? 'BUILDING YOUR CARD…' : mode === 'game' ? 'GENERATE CARD' : 'GENERATE ALL-TIME CARD'}
        </Button>
        {error && (
          <p className="font-sans text-sm text-ww-loss" role="alert">{error}</p>
        )}
        {!compact && (
          <p className="font-sans text-[13px] text-ww-muted">1200 × 1500 · real candles · real rank · ready to post</p>
        )}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col items-center gap-4">
      <a href={`/card/${cardId}`} className="group relative block w-full max-w-[380px] overflow-hidden rounded-xl border border-ww-border-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl!} alt="Generated WICK WARS performance card" className="aspect-[4/5] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.015]" />
        <span className="ww-mono absolute bottom-3 right-3 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          VIEW FULL CARD →
        </span>
      </a>
      <div className="grid w-full max-w-[380px] grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" onClick={download} className="font-bold">DOWNLOAD</Button>
        <Button variant="secondary" size="sm" onClick={shareX} className="font-bold">SHARE TO X</Button>
        <Button variant="secondary" size="sm" onClick={copyLink} className="font-bold">COPY LINK</Button>
      </div>
    </motion.div>
  );
}
