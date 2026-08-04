'use client';

import { useCallback, useEffect, useState } from 'react';
import { APP_NAME, STORAGE_KEYS } from '@/constants';
import { Button, Icon, IconButton } from '@/components/ui';
import { readStorage, writeStorage } from '@/services/storage';
import { Logo } from '@/components/layout/Logo';

/**
 * The `beforeinstallprompt` event, which is not yet in the DOM lib.
 * Chromium-only; Safari and Firefox install through their own browser UI.
 */
type BeforeInstallPromptEvent = Event & {
  readonly platforms: readonly string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Wait this long before offering — an install prompt on arrival is an ad. */
const DELAY_MS = 25_000;

/** A dismissal is respected for two months. */
const DISMISSAL_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * A custom install invitation.
 *
 * The browser's own mini-infobar is suppressed so the invitation can be shown
 * at a moment that makes sense — after the user has actually read something —
 * and in the app's own language and design.
 *
 * Dismissal is durable: saying no once must not mean being asked again
 * tomorrow.
 */
export function InstallPrompt(): React.JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed — nothing to offer.
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const dismissedAt = readStorage<number>(STORAGE_KEYS.installPromptDismissed, (raw) =>
      typeof raw === 'number' ? raw : null,
    );
    if (dismissedAt !== null && Date.now() - dismissedAt < DISMISSAL_TTL_MS) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      timer = setTimeout(() => setVisible(true), DELAY_MS);
    };

    const onInstalled = (): void => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    writeStorage(STORAGE_KEYS.installPromptDismissed, Date.now());
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    setVisible(false);

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    // A dismissal at the native prompt is still a "no" worth remembering.
    if (choice.outcome === 'dismissed') {
      writeStorage(STORAGE_KEYS.installPromptDismissed, Date.now());
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="تثبيت التطبيق"
      data-print="hidden"
      className={[
        'fixed start-4 end-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-45 mx-auto max-w-sm',
        'animate-[var(--animate-slide-up)] rounded-lg border border-border bg-surface-raised',
        'p-4 shadow-[var(--shadow-xl)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <Logo className="mt-0.5 size-10 shrink-0" />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-ink">ثبّت {APP_NAME} على جهازك</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            اقرأ المصحف كاملاً دون اتصال، بفتحٍ أسرع وشاشة بلا مشتّتات.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <Button size="sm" iconStart="install" onClick={install}>
              تثبيت
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              ليس الآن
            </Button>
          </div>
        </div>

        <IconButton
          icon="close"
          label="إغلاق"
          size="sm"
          onClick={dismiss}
          className="-me-1 -mt-1"
        />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-ink-subtle">
        <Icon name="offline" size={13} />
        يعمل بالكامل بدون إنترنت بعد التثبيت
      </p>
    </div>
  );
}
