import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Icon } from '@/components/ui';
import type { Chapter } from '@/types';

/**
 * التنقّل بين السورة السابقة والتالية أسفل صفحة القراءة.
 *
 * يُصيَّر على الخادم ضمن HTML الساكن — فهو روابط داخلية تعتمد عليها محرّكات
 * البحث في اكتشاف المصحف كاملاً، ولا يصحّ أن ينتظر جافاسكربت العميل.
 */
export function ChapterNavigation({
  previous,
  next,
}: {
  readonly previous: Chapter | null;
  readonly next: Chapter | null;
}): React.JSX.Element {
  return (
    <nav
      aria-label="التنقّل بين السور"
      className="mt-4 flex items-stretch gap-3 border-t border-border pt-8"
    >
      {previous ? (
        <Link
          href={ROUTES.surah(previous.id)}
          rel="prev"
          className="group flex flex-1 items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 hover:border-border-strong"
        >
          <Icon
            name="chevronEnd"
            size={18}
            className="shrink-0 text-ink-subtle transition-colors group-hover:text-primary"
          />
          <span className="min-w-0 text-start">
            <span className="block text-[0.6875rem] text-ink-subtle">السورة السابقة</span>
            <span className="block truncate font-quran text-lg text-ink">{previous.name}</span>
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}

      {next ? (
        <Link
          href={ROUTES.surah(next.id)}
          rel="next"
          className="group flex flex-1 items-center justify-end gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 hover:border-border-strong"
        >
          <span className="min-w-0 text-end">
            <span className="block text-[0.6875rem] text-ink-subtle">السورة التالية</span>
            <span className="block truncate font-quran text-lg text-ink">{next.name}</span>
          </span>
          <Icon
            name="chevronStart"
            size={18}
            className="shrink-0 text-ink-subtle transition-colors group-hover:text-primary"
          />
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
