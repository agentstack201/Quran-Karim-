import type { Metadata } from 'next';
import { ROUTES, TOTAL_CHAPTERS } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChapterIndex } from '@/features/quran/ChapterIndex';
import { toArabicNumerals } from '@/utils';

export const metadata: Metadata = {
  title: 'فهرس السور',
  description:
    'تصفّح سور القرآن الكريم الـ١١٤ كاملة — بحث فوري بالاسم أو الرقم، وترتيب حسب المصحف أو النزول أو عدد الآيات.',
  alternates: { canonical: ROUTES.surahIndex },
};

export default function SurahIndexPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title="فهرس السور"
        subtitle={`${toArabicNumerals(TOTAL_CHAPTERS)} سورة — ابحث بالاسم أو الرقم، ورتّبها كما تشاء`}
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'السور' }]}
      />
      <ChapterIndex />
    </AppShell>
  );
}
