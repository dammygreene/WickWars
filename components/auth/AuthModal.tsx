'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePlayer } from '@/lib/client/usePlayer';
import { api, errMsg } from '@/lib/client/api';
import { track } from '@/lib/client/analytics';
import { connectWallet, hasWallet, signMessage } from '@/lib/wallet/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  title?: string;
}

export function AuthModal({ open, onClose, onDone, title = 'ENTER THE ARENA' }: Props) {
  const { refresh } = usePlayer();
  const { toast } = useToast();
  const [methods, setMethods] = useState<{ x: boolean; wallet: boolean; guest: boolean } | null>(null);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState<'guest' | 'wallet' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    api<{ x: boolean; wallet: boolean; guest: boolean }>('/api/auth/methods')
      .then(setMethods)
      .catch(() => setMethods({ x: false, wallet: true, guest: true }));
  }, [open ]);

  const done = async () => {
    await refresh();
    onClose();
    onDone?.();
  };

  const playGuest = async () => {
    setBusy('guest');
    setError(null);
    track('auth_started', { method: 0 });
    try {
      await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ username: username.trim() || undefined }) });
      await done();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const connectX = () => {
    track('auth_started', { method: 1 });
    window.location.href = '/api/auth/x/start';
  };

  const connectW = async () => {
    setBusy('wallet');
    setError(null);
    try {
      if (!hasWallet()) {
        setError('No wallet detected. Install one to continue — or play as guest.');
        return;
      }
      const { address, chain } = await connectWallet();
      const { message } = await api<{ message: string; nonce: string }>('/api/auth/wallet/nonce', {
        method: 'POST',
        body: JSON.stringify({ address }),
      });
      let signature: string;
      try {
        signature = await signMessage(address, message);
      } catch {
        setError('Signature rejected. Nothing was signed, nothing left your wallet.');
        return;
      }
      await api('/api/auth/wallet/verify', { method: 'POST', body: JSON.stringify({ address, message, signature, chain }) });
      toast({ kind: 'success', title: 'Wallet connected', body: 'Ownership verified. No transaction was requested.' });
      await done();
    } catch (e) {
      setError(errMsg(e, 'Wallet connection failed.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        {methods?.x ? (
          <Button size="lg" onClick={connectX} className="w-full font-bold tracking-wide">
            <XIcon />
            CONTINUE WITH X
          </Button>
        ) : (
          <div className="rounded-lg border border-ww-border bg-ww-surface px-4 py-3">
            <p className="font-sans text-sm font-semibold text-ww-secondary">X login unavailable</p>
            <p className="mt-0.5 font-sans text-[13px] text-ww-muted">
              X auth isn&apos;t configured on this deployment. Guest and wallet play work fully.
            </p>
          </div>
        )}

        <Button size="lg" variant="secondary" onClick={connectW} loading={busy === 'wallet'} className="w-full font-bold tracking-wide">
          <WalletIcon />
          CONNECT WALLET
        </Button>

        <div className="my-1 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-ww-border" />
          <span className="ww-label">OR JUMP STRAIGHT IN</span>
          <span className="h-px flex-1 bg-ww-border" />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="ww-label">Handle (optional)</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18))}
            placeholder="wick_trader"
            autoComplete="off"
            spellCheck={false}
            className="h-12 rounded-lg border border-ww-border-strong bg-ww-surface px-4 font-mono text-[15px] text-ww-text placeholder:text-ww-disabled focus:border-ww-win/60 focus:outline-none"
          />
        </label>
        <Button size="lg" variant="secondary" onClick={playGuest} loading={busy === 'guest'} className="w-full font-bold tracking-wide">
          PLAY AS GUEST
        </Button>

        {error && (
          <p className="rounded-lg border border-ww-loss/30 bg-ww-loss/[0.06] px-4 py-2.5 font-sans text-[13px] text-ww-loss" role="alert">
            {error}
          </p>
        )}

        <p className="mt-1 text-center font-sans text-xs text-ww-muted">
          Free to play. No transaction is ever required to start a game.
        </p>
      </div>
    </Modal>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M12.6 1.5h2.4l-5.3 6 6.2 8.2h-4.9l-3.8-5-4.4 5H.4l5.6-6.4L0 1.5h5l3.5 4.6 4.1-4.6Zm-.8 12.1h1.3L4.4 2.8H3L11.8 13.6Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="5" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 9.5h13.5a2 2 0 0 1 2 2v.5a2 2 0 0 1-2 2H13" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}
