import Link from 'next/link';
import type { Metadata } from 'next';
import { ROUTES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  robots: { index: false, follow: false },
};

/**
 * صفحة ٤٠٤.
 *
 * لا تكتفي بالاعتذار — تعرض مخارج حقيقية، فأغلب من يصل إليها كتب رقم سورة
 * خارج النطاق أو تبع رابطاً قديماً، وما يريده هو الوصول لا التفسير.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <span
          aria-hidden="true"
          className="mb-6 grid size-20 place-items-center rounded-2xl bg-primary-soft text-primary"
        >
          <Icon name="mushaf" size={36} />
        </span>

        <p className="text-sm font-semibold text-ink-subtle">خطأ ٤٠٤</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">هذه الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          ربما كان الرابط قديماً، أو كان رقم السورة أو الجزء خارج النطاق. المصحف كامل بانتظارك من أي
          من هذه المداخل.
        </p>

        <nav aria-label="روابط بديلة" className="mt-8">
          <ul className="flex flex-wrap items-center justify-center gap-2.5">
            <li>
              <Link
                href={ROUTES.home}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover"
              >
                <Icon name="home" size={17} />
                الصفحة الرئيسية
              </Link>
            </li>
            <li>
              <Link
                href={ROUTES.surahIndex}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:border-border-strong"
              >
                <Icon name="book" size={17} />
                فهرس السور
              </Link>
            </li>
            <li>
              <Link
                href={ROUTES.search}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:border-border-strong"
              >
                <Icon name="search" size={17} />
                البحث
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </AppShell>
  );
}
