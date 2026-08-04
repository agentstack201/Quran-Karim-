import { cn } from '@/utils';

export type SkeletonProps = {
  readonly className?: string;
};

/**
 * A shimmering placeholder.
 *
 * Skeletons are `aria-hidden`; the surrounding container carries the
 * `aria-busy` / live-region semantics so assistive technology hears one
 * "جارٍ التحميل" rather than a stream of empty boxes.
 */
export function Skeleton({ className }: SkeletonProps): React.JSX.Element {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/** Placeholder matching the shape of a surah card in the index grid. */
export function SkeletonCard(): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <Skeleton className="size-11 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

/** Placeholder matching the shape of one verse block in the reader. */
export function SkeletonVerse(): React.JSX.Element {
  return (
    <div className="space-y-4 border-b border-border py-7 last:border-b-0">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-[88%]" />
        <Skeleton className="h-7 w-[64%]" />
      </div>
    </div>
  );
}

/** A run of verse placeholders, wrapped with the right busy semantics. */
export function SkeletonReader({ count = 5 }: { readonly count?: number }): React.JSX.Element {
  return (
    <div aria-busy="true" aria-live="polite" aria-label="جارٍ تحميل الآيات">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonVerse key={index} />
      ))}
    </div>
  );
}
