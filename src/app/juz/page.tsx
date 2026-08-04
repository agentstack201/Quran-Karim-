import type { Metadata } from 'next';
import { ROUTES, TOTAL_JUZ } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PartCard } from '@/features/quran/PartCard';
import { JUZ_LIST } from '@/services/quran';
import { toArabicNumerals } from '@/utils';

export const metadata: Metadata = {
  title: 'الأجزاء',
  description:
    'تصفّح أجزاء القرآن الكريم الثلاثين — كل جزء بحدوده من السور والآيات والصفحات، للورد اليومي والختمة.',
  alternates: { canonical: ROUTES.juzIndex },
};

export default function JuzIndexPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title="الأجزاء"
        subtitle={`${toArabicNumerals(TOTAL_JUZ)} جزءاً — التقسيم المعتاد للمصحف`}
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'الأجزاء' }]}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JUZ_LIST.map((juz) => (
            <li key={juz.id}>
              <PartCard part={juz} kind="juz" />
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
