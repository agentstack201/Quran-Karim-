'use client';

import { useId } from 'react';
import { cn } from '@/utils';
import { Icon } from './Icon';

export type SelectOption = {
  readonly value: string;
  readonly label: string;
  /** Secondary text appended after an em dash. */
  readonly hint?: string;
  readonly disabled?: boolean;
};

export type SelectOptionGroup = {
  readonly label: string;
  readonly options: readonly SelectOption[];
};

export type SelectProps = {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options?: readonly SelectOption[];
  readonly groups?: readonly SelectOptionGroup[];
  readonly hideLabel?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
};

function renderOption(option: SelectOption): React.JSX.Element {
  return (
    <option key={option.value} value={option.value} disabled={option.disabled}>
      {option.hint ? `${option.label} — ${option.hint}` : option.label}
    </option>
  );
}

/**
 * A styled native `<select>`.
 *
 * Deliberately native: on mobile it opens the platform picker, which is faster
 * and more accessible than any custom listbox, and it needs no JavaScript to
 * behave correctly.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  groups,
  hideLabel = false,
  disabled = false,
  className,
}: SelectProps): React.JSX.Element {
  const id = useId();

  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={id}
        className={cn('mb-2 block text-sm font-medium text-ink', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-11 w-full appearance-none rounded-md border border-border bg-surface text-ink',
            'ps-3.5 pe-10 text-sm font-medium',
            'transition-colors duration-200 hover:border-border-strong',
            'disabled:cursor-not-allowed disabled:opacity-55',
          )}
        >
          {options?.map(renderOption)}
          {groups?.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map(renderOption)}
            </optgroup>
          ))}
        </select>

        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute inset-y-0 end-3.5 my-auto text-ink-subtle"
        />
      </div>
    </div>
  );
}
