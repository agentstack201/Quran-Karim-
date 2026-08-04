import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Variants are complete, mutually exclusive class strings rather than composed
 * fragments. That keeps `cn()` free of conflict-resolution logic and makes each
 * appearance readable in one place.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-sm hover:bg-primary-hover active:bg-primary-active border border-transparent',
  secondary:
    'bg-primary-soft text-primary border border-transparent hover:bg-primary-soft-hover active:bg-primary-soft-hover',
  outline:
    'bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-sunken active:bg-surface-sunken',
  ghost:
    'bg-transparent text-ink-muted border border-transparent hover:bg-surface-sunken hover:text-ink',
  danger:
    'bg-danger-soft text-danger border border-transparent hover:brightness-95 active:brightness-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-sm px-3 text-[0.8125rem]',
  md: 'h-11 gap-2 rounded-md px-4 text-sm',
  lg: 'h-13 gap-2.5 rounded-lg px-6 text-base',
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Icon rendered before the label (right of it, in RTL). */
  readonly iconStart?: IconName;
  /** Icon rendered after the label. */
  readonly iconEnd?: IconName;
  /** Replaces the content with a spinner and disables interaction. */
  readonly loading?: boolean;
  /** Stretches the button to the width of its container. */
  readonly block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    iconStart,
    iconEnd,
    loading = false,
    block = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const iconSize = ICON_SIZES[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center font-medium select-none',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)]',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Icon name="spinner" size={iconSize} className="animate-[var(--animate-spin-slow)]" />
      ) : (
        iconStart && <Icon name={iconStart} size={iconSize} />
      )}
      {children !== undefined && children !== null && <span className="truncate">{children}</span>}
      {!loading && iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </button>
  );
});
