'use client';

/** Raw EIP-1193 wallet client (no heavy SDK). Prove ownership via personal_sign — never a transaction. */

export interface EthProvider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (ev: string, fn: (...a: unknown[]) => void) => void;
  removeListener?: (ev: string, fn: (...a: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

export function hasWallet(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

export async function connectWallet(): Promise<{ address: string; chain: string }> {
  if (!hasWallet()) throw new Error('No wallet found. Install a wallet to continue.');
  const accounts = (await window.ethereum!.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.length) throw new Error('Wallet connection was rejected.');
  let chain = 'ethereum';
  try {
    const id = (await window.ethereum!.request({ method: 'eth_chainId' })) as string;
    chain = id ?? 'ethereum';
  } catch {
    /* ignore */
  }
  return { address: accounts[0], chain };
}

export async function signMessage(address: string, message: string): Promise<string> {
  const sig = (await window.ethereum!.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;
  return sig;
}
