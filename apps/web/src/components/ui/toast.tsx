'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/cn';
import { Close, CheckCircle, AlertCircle } from '../icons';

type ToastTone = 'neutral' | 'success' | 'error';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback<ToastContextValue['toast']>((input) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, ...input }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              'group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-pop',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              t.tone === 'success' && 'bg-leaf/10 border-leaf/40 text-ink',
              t.tone === 'error' && 'bg-rose/10 border-rose/40 text-ink',
              (!t.tone || t.tone === 'neutral') && 'bg-paper border-line-2 text-ink',
            )}
          >
            <span className={cn(
              'mt-0.5 shrink-0',
              t.tone === 'success' ? 'text-leaf' : t.tone === 'error' ? 'text-rose' : 'text-ink-2',
            )}>
              {t.tone === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </span>
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-medium">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-ink-2">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close aria-label="Close" className="text-ink-3 hover:text-ink">
              <Close size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
