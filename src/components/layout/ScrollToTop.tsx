'use client';

import { scrollToTop, useScrolledPast } from '@/hooks';
import { Icon } from '@/components/ui';
import { cn } from '@/utils';

/**
 * A floating "back to top" control.
 *
 * Appears only after a meaningful scroll, and sits above the safe-area inset so
 * it clears the home indicator on iOS. Kept in the DOM and hidden with
 * `inert` + opacity rather than unmounted, so its entrance can animate without
 * a layout jump.
 */
export function ScrollToTop(): React.JSX.Element {
  const visible = useScrolledPast(600);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      inert={!visible}
      aria-hidden={!visible}
      aria-label="العودة إلى أعلى الصفحة"
      data-print="hidden"
      className={cn(
        'fixed end-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40',
        'inline-flex size-11 items-center justify-center border-border bg-surface-raised text-ink-muted',
        'rounded-full border shadow-[var(--shadow-lg)]',
        'transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]',
        'hover:border-primary/40 hover:text-primary active:scale-90',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <Icon name="arrowUp" size={19} />
    </button>
  );
}
