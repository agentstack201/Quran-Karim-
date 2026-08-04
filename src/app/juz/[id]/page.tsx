import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ROUTES, SITE_URL, TOTAL_JUZ } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Icon } from '@/components/ui';
import { PartNavigation } from '@/features/quran/PartNavigation';
import { ReaderBoundary } from '@/features/quran/ReaderBoundary';
import { JUZ_LIST, getChapter, getJuz } from '@/services/quran';
import { toArabicNumerals } from '@/utils';

type PageProps = { readonly params: Promise<{ id: string }> };

export function generateStaticParams(): { id: string }[] {
  return JUZ_LIST.map((juz) => ({ id: String(juz.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const juz = getJuz(Number(id));

  if (!juz) return { title: 'جزء غير موجود' };

  const start = getChapter(juz.start.surah);
  const end = getChapter(juz.end.surah);
  const description =
    `اقرأ ${juz.name} من القرآن الكريم — ${toArabicNumerals(juz.versesCount)} آية` +
    (start && end
      ? ` من ${start.name} ${toArabicNumerals(juz.start.ayah)} إلى ${end.name} ${toArabicNumerals(juz.end.ayah)}`
      : '') +
    '، مع التلاوة والتفسير.';

  return {
    title: juz.name,
    description,
    alternates: { canonical: ROUTES.juz(juz.id) },
    openGraph: {
      title: `${juz.name} · القرآن الكريم`,
      description,
      url: `${SITE_URL}${ROUTES.juz(juz.id)}`,
      type: 'article',
    },
  };
}

export default async function JuzPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const juz = getJuz(Number(id));

  if (!juz) notFound();

  const start = getChapter(juz.start.surah);
  const end = getChapter(juz.end.surah);

  return (
    <AppShell>
      <PageHeader
        centered
        crumbs={[
          { label: 'الرئيسية', href: ROUTES.home },
          { label: 'الأجزاء', href: ROUTES.juzIndex },
          { label: juz.name },
        ]}
        title={juz.name}
        subtitle={
          <span className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone="primary">{toArabicNumerals(juz.versesCount)} آية</Badge>
            <Badge>
              الصفحات {toArabicNumerals(juz.startPage)}–{toArabicNumerals(juz.endPage)}
            </Badge>
            <Badge>الحزبان {juz.hizbs.map((hizb) => toArabicNumerals(hizb)).join(' و')}</Badge>
          </span>
        }
      >
        {start && end && (
          <p className="mt-4 text-sm text-ink-muted">
            من {start.name} · الآية {toArabicNumerals(juz.start.ayah)} — إلى {end.name} · الآية{' '}
            {toArabicNumerals(juz.end.ayah)}
          </p>
        )}
        <div className="ornamental-rule mt-6" aria-hidden="true">
          <Icon name="star" size={15} />
        </div>
      </PageHeader>

      <ReaderBoundary mode="juz" id={juz.id} surahName={juz.name} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <PartNavigation kind="juz" id={juz.id} max={TOTAL_JUZ} />
      </div>
    </AppShell>
  );
}
