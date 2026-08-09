import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ROUTES, SITE_URL, TOTAL_PAGES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Icon } from '@/components/ui';
import { PartNavigation } from '@/features/quran/PartNavigation';
import { ReaderBoundary } from '@/features/quran/ReaderBoundary';
import { PAGE_LIST, getChapter, getPage } from '@/services/quran';
import { getInitialPageVerses } from '@/services/quran.server';
import { toArabicNumerals } from '@/utils';

type PageProps = { readonly params: Promise<{ id: string }> };

/**
 * All 604 pages are prerendered.
 *
 * Their boundaries are bundled and their verses come from the juz payloads the
 * app already ships, so this adds 604 static shells and not one byte of new
 * data.
 */
export function generateStaticParams(): { id: string }[] {
  return PAGE_LIST.map((page) => ({ id: String(page.id) }));
}

/** Names the surahs a page covers, for headings and metadata. */
function describeSurahs(surahs: readonly number[]): string {
  const names = surahs.map((id) => getChapter(id)?.name).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] as string;
  if (names.length === 2) return `${names[0]} و${names[1]}`;
  return `${names.slice(0, -1).join('، ')} و${names[names.length - 1]}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const page = getPage(Number(id));

  if (!page) return { title: 'صفحة غير موجودة' };

  const title = `صفحة ${toArabicNumerals(page.id)}`;
  const surahs = describeSurahs(page.surahs);
  const description =
    `اقرأ الصفحة ${toArabicNumerals(page.id)} من المصحف — ${surahs}، ` +
    `${toArabicNumerals(page.versesCount)} آية، الجزء ${toArabicNumerals(page.juz[0] ?? 1)}. ` +
    'بالرسم العثماني مع التلاوة والتفسير.';

  return {
    title,
    description,
    alternates: { canonical: ROUTES.page(page.id) },
    openGraph: {
      title: `${title} · القرآن الكريم`,
      description,
      url: `${SITE_URL}${ROUTES.page(page.id)}`,
      type: 'article',
    },
  };
}

export default async function MushafPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const page = getPage(Number(id));

  if (!page) notFound();

  const initialVerses = await getInitialPageVerses(page.id);
  const surahs = describeSurahs(page.surahs);

  return (
    <AppShell>
      <PageHeader
        centered
        crumbs={[
          { label: 'الرئيسية', href: ROUTES.home },
          { label: 'الصفحات', href: ROUTES.pageIndex },
          { label: `صفحة ${toArabicNumerals(page.id)}` },
        ]}
        title={`صفحة ${toArabicNumerals(page.id)}`}
        subtitle={
          <span className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone="primary">{toArabicNumerals(page.versesCount)} آية</Badge>
            <Badge>
              {page.juz.length > 1 ? 'الجزءان' : 'الجزء'}{' '}
              {page.juz.map((juz) => toArabicNumerals(juz)).join(' و')}
            </Badge>
            {page.surahs.length > 0 && (
              <Badge tone="accent">
                <span className="font-quran">{surahs}</span>
              </Badge>
            )}
          </span>
        }
      >
        <p className="mt-4 text-sm text-ink-muted">
          من {getChapter(page.start.surah)?.name} · الآية {toArabicNumerals(page.start.ayah)} — إلى{' '}
          {getChapter(page.end.surah)?.name} · الآية {toArabicNumerals(page.end.ayah)}
        </p>
        <div className="ornamental-rule mt-6" aria-hidden="true">
          <Icon name="star" size={15} />
        </div>
      </PageHeader>

      <ReaderBoundary
        mode="page"
        id={page.id}
        surahName={`صفحة ${toArabicNumerals(page.id)}`}
        initialVerses={initialVerses}
        totalVerses={page.versesCount}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <PartNavigation kind="page" id={page.id} max={TOTAL_PAGES} />
      </div>
    </AppShell>
  );
}
