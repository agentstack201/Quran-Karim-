import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ROUTES, SITE_URL, TOTAL_HIZB } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Icon } from '@/components/ui';
import { PartNavigation } from '@/features/quran/PartNavigation';
import { ReaderBoundary } from '@/features/quran/ReaderBoundary';
import { HIZB_LIST, getChapter, getHizb } from '@/services/quran';
import { toArabicNumerals } from '@/utils';

type PageProps = { readonly params: Promise<{ id: string }> };

export function generateStaticParams(): { id: string }[] {
  return HIZB_LIST.map((hizb) => ({ id: String(hizb.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const hizb = getHizb(Number(id));

  if (!hizb) return { title: 'حزب غير موجود' };

  const start = getChapter(hizb.start.surah);
  const end = getChapter(hizb.end.surah);
  const description =
    `اقرأ ${hizb.name} من القرآن الكريم — ${toArabicNumerals(hizb.versesCount)} آية` +
    (start && end
      ? ` من ${start.name} ${toArabicNumerals(hizb.start.ayah)} إلى ${end.name} ${toArabicNumerals(hizb.end.ayah)}`
      : '') +
    `، ضمن الجزء ${toArabicNumerals(hizb.juz)}.`;

  return {
    title: hizb.name,
    description,
    alternates: { canonical: ROUTES.hizb(hizb.id) },
    openGraph: {
      title: `${hizb.name} · القرآن الكريم`,
      description,
      url: `${SITE_URL}${ROUTES.hizb(hizb.id)}`,
      type: 'article',
    },
  };
}

export default async function HizbPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const hizb = getHizb(Number(id));

  if (!hizb) notFound();

  const start = getChapter(hizb.start.surah);
  const end = getChapter(hizb.end.surah);

  return (
    <AppShell>
      <PageHeader
        centered
        crumbs={[
          { label: 'الرئيسية', href: ROUTES.home },
          { label: 'الأحزاب', href: ROUTES.hizbIndex },
          { label: hizb.name },
        ]}
        title={hizb.name}
        subtitle={
          <span className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone="primary">{toArabicNumerals(hizb.versesCount)} آية</Badge>
            <Badge>الجزء {toArabicNumerals(hizb.juz)}</Badge>
            <Badge>
              الصفحات {toArabicNumerals(hizb.startPage)}–{toArabicNumerals(hizb.endPage)}
            </Badge>
          </span>
        }
      >
        {start && end && (
          <p className="mt-4 text-sm text-ink-muted">
            من {start.name} · الآية {toArabicNumerals(hizb.start.ayah)} — إلى {end.name} · الآية{' '}
            {toArabicNumerals(hizb.end.ayah)}
          </p>
        )}
        <div className="ornamental-rule mt-6" aria-hidden="true">
          <Icon name="star" size={15} />
        </div>
      </PageHeader>

      <ReaderBoundary mode="hizb" id={hizb.id} surahName={hizb.name} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <PartNavigation kind="hizb" id={hizb.id} max={TOTAL_HIZB} />
      </div>
    </AppShell>
  );
}
