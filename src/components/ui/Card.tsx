import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/utils';

const BASE =
  'group relative block rounded-lg border border-border bg-surface transition-[border-color,box-shadow,transform] duration-250 ease-[var(--ease-out-soft)]';

const INTERACTIVE =
  'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-md)] active:translate-y-0 active:shadow-[var(--shadow-sm)] motion-reduce:hover:translate-y-0';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly interactive?: boolean;
};

/** A surface panel. Non-interactive by default. */
export function Card({ interactive, className, ...rest }: CardProps): React.JSX.Element {
  return <div className={cn(BASE, interactive && INTERACTIVE, className)} {...rest} />;
}

export type CardLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  readonly href: string;
  readonly children: ReactNode;
};

/**
 * A card that is itself a link.
 *
 * Uses a real anchor rather than a click handler on a div, so it is keyboard
 * reachable, announced as a link, and supports open-in-new-tab.
 */
export function CardLink({ href, className, children, ...rest }: CardLinkProps): React.JSX.Element {
  return (
    <Link href={href} className={cn(BASE, INTERACTIVE, className)} {...rest}>
      {children}
    </Link>
  );
}
