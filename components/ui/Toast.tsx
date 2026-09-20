'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  title: string;
  body?: string;
  kind: 'info' | 'success' | 'error';
}

interface Ctx {
  toast: (t: Omit<Toast, 'id'>) => void;
}

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className={cn(
                'pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-2xl backdrop-blur',
                t.kind === 'error' && 'border-ww-loss/40 bg-[#160b0d]/95',
                t.kind === 'success' && 'border-ww-win/30 bg-[#08120d]/95',
                t.kind === 'info' && 'border-ww-border-strong bg-ww-surface/95',
              )}
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <p className="font-sans text-sm font-semibold text-ww-text">{t.title}</p>
              {t.body && <p className="mt-0.5 font-sans text-[13px] text-ww-secondary">{t.body}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
