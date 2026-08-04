'use client';

import { useId } from 'react';
import { cn } from '@/utils';

export type SwitchProps = {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * A labelled on/off control following the WAI-ARIA switch pattern.
 *
 * The whole row is the label, so the touch target comfortably exceeds the
 * WCAG 2.2 target-size minimum on mobile.
 */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
}: SwitchProps): React.JSX.Element {
  const descriptionId = useId();

  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-4 py-1',
        disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span id={descriptionId} className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
            {description}
          </span>
        )}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent',
          'transition-colors duration-250 ease-[var(--ease-out-soft)] disabled:pointer-events-none',
          checked ? 'bg-primary' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'pointer-events-none absolute size-4.5 rounded-full bg-white shadow-[var(--shadow-xs)]',
            'transition-[inset-inline-start] duration-250 ease-[var(--ease-out-soft)]',
            checked ? 'start-[1.5rem]' : 'start-[0.1875rem]',
          )}
        />
      </button>
    </label>
  );
}
