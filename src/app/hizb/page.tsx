import type { Metadata } from 'next';
import { ROUTES, TOTAL_HIZB } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PartCard } from '@/features/quran/PartCard';
import { HIZB_LIST } from '@/services/quran';
import { toArabicNumerals } from '@/utils';

export const metadata: Metadata = {
  title: 'الأحزاب',
  description:
    'تصفّح أحزاب القرآن الكريم الستين — كل جزء حزبان، بحدود دقيقة من السور والآيات والصفحات.',
  alternates: { canonical: ROUTES.hizbIndex },
};

export default function HizbIndexPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title="الأحزاب"
        subtitle={`${toArabicNumerals(TOTAL_HIZB)} حزباً — كل جزء حزبان، لتقسيمٍ أدقّ للورد`}
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'الأحزاب' }]}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HIZB_LIST.map((hizb) => (
            <li key={hizb.id}>
              <PartCard part={hizb} kind="hizb" />
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
