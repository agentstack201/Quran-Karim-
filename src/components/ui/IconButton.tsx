import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils';
import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'ghost' | 'solid' | 'outline' | 'soft';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink',
  soft: 'bg-primary-soft text-primary hover:bg-primary-soft-hover',
  solid: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover',
  outline:
    'border border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
};

const SIZES: Record<IconButtonSize, string> = {
  sm: 'size-8 rounded-sm',
  md: 'size-10 rounded-md',
  lg: 'size-12 rounded-lg',
};

const ICON_SIZES: Record<IconButtonSize, number> = { sm: 16, md: 19, lg: 22 };

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  readonly icon: IconName;
  /** Required: an icon-only control must still have an accessible name. */
  readonly label: string;
  readonly variant?: IconButtonVariant;
  readonly size?: IconButtonSize;
  /** Renders the pressed state and sets `aria-pressed`. */
  readonly active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', active, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 ease-[var(--ease-out-soft)]',
        'active:scale-90 disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        active && variant === 'ghost' && 'bg-primary-soft text-primary',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZES[size]} />
    </button>
  );
});
