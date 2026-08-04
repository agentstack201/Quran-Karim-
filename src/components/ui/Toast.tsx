'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useIsClient } from '@/hooks/useIsClient';
import { cn } from '@/utils';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'neutral' | 'success' | 'error' | 'info';

export type Toast = {
  readonly id: string;
  readonly message: string;
  readonly tone: ToastTone;
  readonly duration: number;
};

export type ToastOptions = {
  readonly tone?: ToastTone;
  /** Milliseconds before auto-dismissal. Use 0 to require manual dismissal. */
  readonly duration?: number;
};

type ToastContextValue = {
  readonly toast: (message: string, options?: ToastOptions) => void;
  readonly dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  neutral: 'border-border bg-surface-raised text-ink',
  success: 'border-success/35 bg-success-soft text-success',
  error: 'border-danger/35 bg-danger-soft text-danger',
  info: 'border-info/35 bg-info-soft text-info',
};

const TONE_ICONS: Record<ToastTone, IconName> = {
  neutral: 'info',
  success: 'checkCircle',
  error: 'alert',
  info: 'info',
};

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 3200;

/**
 * Transient status messages.
 *
 * The stack lives in a portal and is announced through a polite live region, so
 * confirmations like "تم نسخ الآية" reach screen-reader users without stealing
 * focus. Errors are announced assertively and stay twice as long.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const mounted = useIsClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const tone = options?.tone ?? 'neutral';
      const duration =
        options?.duration ?? (tone === 'error' ? DEFAULT_DURATION * 2 : DEFAULT_DURATION);
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((current) => [...current, { id, message, tone, duration }].slice(-MAX_VISIBLE));

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-start sm:ps-6"
            data-print="hidden"
          >
            {toasts.map((item) => (
              <output
                key={item.id}
                aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm animate-[var(--animate-slide-up)] items-center gap-3',
                  'rounded-lg border px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)]',
                  TONE_STYLES[item.tone],
                )}
              >
                <Icon name={TONE_ICONS[item.tone]} size={18} />
                <span className="flex-1">{item.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="إخفاء الإشعار"
                  className="-me-1 rounded-xs p-1 opacity-60 transition-opacity hover:opacity-100"
                >
                  <Icon name="close" size={15} />
                </button>
              </output>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Access the toast dispatcher. Must be called under a `ToastProvider`. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
