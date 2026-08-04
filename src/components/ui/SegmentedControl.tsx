'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/utils';
import { Icon, type IconName } from './Icon';

export type SegmentOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
  /** Overrides the accessible name when the visible label is decorative. */
  readonly ariaLabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  /** Names the group for assistive technology. */
  readonly label: string;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
};

/**
 * A radio group styled as a segmented control.
 *
 * Implements the WAI-ARIA radiogroup keyboard contract: arrow keys move the
 * selection (wrapping at both ends, in the writing direction), Home/End jump to
 * the extremes, and only the selected option is in the tab order.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  const focusIndex = useCallback((index: number) => {
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = options.findIndex((option) => option.value === value);
      if (currentIndex < 0) return;

      // The document is RTL, so ArrowRight moves towards the *previous* item.
      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + options.length) % options.length;
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % options.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = options.length - 1;
          break;
        default:
          return;
      }

      const next = options[nextIndex];
      if (!next) return;

      event.preventDefault();
      onChange(next.value);
      focusIndex(nextIndex);
    },
    [options, value, onChange, focusIndex],
  );

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel ?? option.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap',
              'transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-out-soft)]',
              size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9.5 px-3.5 text-[0.8125rem]',
              selected
                ? 'bg-surface-raised text-ink shadow-[var(--shadow-xs)]'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.icon && <Icon name={option.icon} size={size === 'sm' ? 14 : 16} />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
