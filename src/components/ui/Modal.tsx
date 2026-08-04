'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useIsClient } from '@/hooks/useIsClient';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/utils';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
};

export type ModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  /** Optional line under the title. */
  readonly description?: string;
  readonly size?: ModalSize;
  /** Rendered in the header, next to the close button. */
  readonly headerActions?: ReactNode;
  /** Rendered in a sticky footer. */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * An accessible dialog.
 *
 * Rendered into a portal on `document.body` so it escapes any transformed or
 * overflow-hidden ancestor. Implements the WAI-ARIA dialog pattern: modal
 * semantics, a labelled and described region, focus trapped inside for as long
 * as it is open, focus restored on close, Escape to dismiss, and a scroll lock
 * on the page behind.
 *
 * On small screens it presents as a bottom sheet, which is the reachable
 * position for a thumb; from `sm` upwards it becomes a centred dialog.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  headerActions,
  footer,
  children,
  className,
}: ModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerDownTarget = useRef<EventTarget | null>(null);
  const mounted = useIsClient();
  const titleId = useId();
  const descriptionId = useId();

  useFocusTrap(panelRef, open);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  /**
   * Dismiss only when the gesture both started and ended on the backdrop.
   * Without this, selecting text inside the dialog and releasing outside it
   * would close the dialog — a genuinely irritating bug.
   */
  const onBackdropPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerDownTarget.current = event.target;
  }, []);

  const onBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget &&
        pointerDownTarget.current === event.currentTarget
      ) {
        onClose();
      }
      pointerDownTarget.current = null;
    },
    [onClose],
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:p-6"
      onPointerDown={onBackdropPointerDown}
      onClick={onBackdropClick}
      data-print="hidden"
    >
      <div
        className="fixed inset-0 animate-[var(--animate-fade-in)] bg-[var(--overlay)] backdrop-blur-[3px]"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface-raised shadow-[var(--shadow-xl)] outline-none',
          'animate-[var(--animate-slide-up)] rounded-t-2xl sm:animate-[var(--animate-scale-in)] sm:rounded-2xl',
          'border border-border',
          SIZES[size],
          className,
        )}
      >
        {/* Grab handle — a visual affordance for the mobile sheet only. */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>

        <header className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 truncate text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <IconButton icon="close" label="إغلاق" onClick={onClose} size="sm" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3.5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
