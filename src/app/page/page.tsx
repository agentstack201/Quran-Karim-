import type { Metadata } from 'next';
import Link from 'next/link';
import { ROUTES, TOTAL_PAGES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { JUZ_LIST, PAGE_LIST, getChapter } from '@/services/quran';
import { toArabicNumerals } from '@/utils';

export const metadata: Metadata = {
  title: 'الصفحات',
  description:
    'تصفّح المصحف بالصفحة — ٦٠٤ صفحات بترتيب المصحف المدني، لمن يقرأ ويحفظ بالصفحة لا بالسورة.',
  alternates: { canonical: ROUTES.pageIndex },
};

/**
 * The Mus'haf by page.
 *
 * Grouped under the juz each page belongs to rather than listed as 604 numbers
 * in a row: nobody scans a flat list that long, and the juz is the landmark
 * people already navigate by. The surah opening each page is named, because a
 * bare number tells a reader nothing about where they would land.
 */
export default function PageIndexPage(): React.JSX.Element {
  const byJuz = JUZ_LIST.map((juz) => ({
    juz,
    pages: PAGE_LIST.filter((page) => page.juz[0] === juz.id),
  })).filter((group) => group.pages.length > 0);

  return (
    <AppShell>
      <PageHeader
        title="الصفحات"
        subtitle={`${toArabicNumerals(TOTAL_PAGES)} صفحة بترتيب المصحف المدني`}
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'الصفحات' }]}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
        {byJuz.map(({ juz, pages }) => (
          <section key={juz.id} aria-labelledby={`juz-${juz.id}-pages`}>
            <h2
              id={`juz-${juz.id}-pages`}
              className="mb-3 flex items-baseline gap-2 text-sm font-bold text-ink"
            >
              {juz.name}
              <span className="text-xs font-normal text-ink-subtle">
                الصفحات {toArabicNumerals(pages[0]?.id ?? 0)}–
                {toArabicNumerals(pages[pages.length - 1]?.id ?? 0)}
              </span>
            </h2>

            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((page) => {
                const opening = getChapter(page.start.surah);
                return (
                  <li key={page.id}>
                    <Link
                      href={ROUTES.page(page.id)}
                      className="flex items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2.5 transition-colors duration-200 hover:border-border-strong hover:bg-surface-sunken"
                    >
                      <span className="min-w-8 text-base font-bold text-primary tabular-nums">
                        {toArabicNumerals(page.id)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-quran text-sm text-ink">
                          {opening?.name}
                        </span>
                        <span className="block text-[0.6875rem] text-ink-subtle">
                          الآية {toArabicNumerals(page.start.ayah)} ·{' '}
                          {toArabicNumerals(page.versesCount)} آية
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
