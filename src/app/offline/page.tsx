import type { Metadata } from 'next';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui';

export const metadata: Metadata = {
  title: 'دون اتصال',
  description: 'هذه الصفحة غير متاحة دون اتصال بالإنترنت.',
  robots: { index: false, follow: false },
};

/**
 * صفحة الاحتياط عند انقطاع الاتصال.
 *
 * يقدّمها عامل الخدمة عندما يطلب المستخدم صفحة لم تُزَر من قبل وهو غير متصل.
 * تُصيَّر ساكنة وتُخزَّن مسبقاً، فهي متاحة دائماً — وهي تقول للمستخدم ما الذي
 * *ما زال* يعمل، لا ما الذي تعطّل فقط.
 */
export default function OfflinePage(): React.JSX.Element {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <span
          aria-hidden="true"
          className="mb-6 grid size-20 place-items-center rounded-2xl bg-warning-soft text-warning"
        >
          <Icon name="offline" size={36} />
        </span>

        <h1 className="text-2xl font-bold text-ink sm:text-3xl">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          هذه الصفحة لم تُفتح من قبل، فلم تُحفظ على جهازك بعد. لكن كل ما قرأته سابقاً ما زال متاحاً
          كاملاً.
        </p>

        <ul className="mt-7 w-full space-y-2.5 text-start text-sm text-ink-muted">
          {[
            'السور التي فتحتها من قبل متاحة للقراءة',
            'فهارس السور والأجزاء والأحزاب تعمل دائماً',
            'محفوظاتك وإعداداتك محفوظة على الجهاز',
            'التلاوة الصوتية والتفسير يحتاجان اتصالاً',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Icon name="check" size={16} className="mt-0.5 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href={ROUTES.home}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover"
          >
            <Icon name="home" size={17} />
            الصفحة الرئيسية
          </Link>
          <Link
            href={ROUTES.surahIndex}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:border-border-strong"
          >
            <Icon name="book" size={17} />
            فهرس السور
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
