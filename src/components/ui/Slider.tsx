'use client';

import { useId } from 'react';
import { cn } from '@/utils';

export type SliderProps = {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  /** Human-readable current value, announced instead of the raw number. */
  readonly valueText?: string;
  /** Rendered at the end of the label row. */
  readonly hint?: string;
  /** Hides the visible label but keeps it accessible. */
  readonly hideLabel?: boolean;
  readonly className?: string;
};

/**
 * A range input styled to match the design system.
 *
 * Built on the native `<input type="range">` rather than a custom widget: it
 * arrives with correct keyboard behaviour, touch targets, screen-reader
 * announcements and platform conventions for free. The fill is painted with a
 * gradient whose stop is driven by the current value.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  hint,
  hideLabel = false,
  className,
}: SliderProps): React.JSX.Element {
  const id = useId();
  const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('mb-2 flex items-baseline justify-between gap-2', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && <span className="text-xs text-ink-subtle tabular-nums">{hint}</span>}
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={hideLabel ? label : undefined}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        // The track fill is the one genuinely dynamic value in the component,
        // so it is passed as a custom property rather than a class.
        style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent',
          'bg-[linear-gradient(to_left,var(--primary)_0,var(--primary)_var(--slider-fill),var(--border)_var(--slider-fill),var(--border)_100%)]',
          '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--surface-raised)]',
          '[&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)]',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
          'hover:[&::-webkit-slider-thumb]:scale-115 active:[&::-webkit-slider-thumb]:scale-95',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-[var(--surface-raised)] [&::-moz-range-thumb]:bg-[var(--primary)]',
          '[&::-moz-range-track]:bg-transparent',
        )}
      />
    </div>
  );
}
