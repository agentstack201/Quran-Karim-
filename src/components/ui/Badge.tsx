import type { ReactNode } from 'react';
import { cn } from '@/utils';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted border-border',
  primary: 'bg-primary-soft text-primary border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  info: 'bg-info-soft text-info border-transparent',
};

export type BadgeProps = {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  readonly className?: string;
};

/** A small, non-interactive label. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
