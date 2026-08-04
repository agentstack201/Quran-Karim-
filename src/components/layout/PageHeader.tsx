import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/utils';

export type Crumb = {
  readonly label: string;
  readonly href?: string;
};

/**
 * ترويسة الصفحة مع مسار التنقّل.
 *
 * مسار التنقّل عنصر `<nav>` حقيقي بعلامة `aria-current` على الصفحة الحالية،
 * وليس مجرد نصٍّ مفصول بشرطات — فالقارئات الشاشية تحتاج أن تعرف أنه تنقّل.
 */
export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
  centered = false,
  children,
}: {
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly crumbs?: readonly Crumb[];
  readonly actions?: ReactNode;
  readonly centered?: boolean;
  readonly children?: ReactNode;
}): React.JSX.Element {
  return (
    <header
      className={cn(
        'mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10',
        centered && 'max-w-3xl text-center',
      )}
    >
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="مسار التنقّل" className={cn('mb-4', centered && 'flex justify-center')}>
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <Icon name="chevronStart" size={13} className="opacity-50" aria-hidden="true" />
                  )}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="rounded-xs transition-colors duration-200 hover:text-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? 'page' : undefined} className="text-ink-muted">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div
        className={cn(
          'flex gap-4',
          centered ? 'flex-col items-center' : 'flex-wrap items-end justify-between',
        )}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm text-ink-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}
    </header>
  );
}
