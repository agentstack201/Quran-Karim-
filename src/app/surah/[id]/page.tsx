import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ROUTES, SITE_URL, TOTAL_CHAPTERS } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Icon } from '@/components/ui';
import { ChapterNavigation } from '@/features/quran/ChapterNavigation';
import { ReaderBoundary } from '@/features/quran/ReaderBoundary';
import { CHAPTERS, getChapter } from '@/services/quran';
import { getInitialChapterVerses } from '@/services/quran.server';
import { toArabicNumerals } from '@/utils';

type PageProps = { readonly params: Promise<{ id: string }> };

/**
 * تُصيَّر السور الـ١١٤ مسبقاً وقت البناء.
 *
 * البيانات الوصفية مضمّنة وثابتة، فالتصيير المسبق يجعل قشرة كل صفحة سورة
 * HTML ساكناً يُقدَّم من الحافة فوراً — دون أي حوسبة عند الطلب.
 */
export function generateStaticParams(): { id: string }[] {
  return CHAPTERS.map((chapter) => ({ id: String(chapter.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const chapter = getChapter(Number(id));

  if (!chapter) {
    return { title: 'سورة غير موجودة' };
  }

  const title = `سورة ${chapter.name}`;
  const description =
    `اقرأ سورة ${chapter.name} كاملة بالرسم العثماني — ${toArabicNumerals(chapter.versesCount)} آية، ` +
    `${chapter.revelation === 'meccan' ? 'مكية' : 'مدنية'}، الجزء ${toArabicNumerals(chapter.startJuz)}. ` +
    'مع التلاوة الصوتية والتفسير والترجمة.';

  return {
    title,
    description,
    alternates: { canonical: ROUTES.surah(chapter.id) },
    openGraph: {
      title: `${title} · ${chapter.transliteration}`,
      description,
      url: `${SITE_URL}${ROUTES.surah(chapter.id)}`,
      type: 'article',
    },
    twitter: { title: `${title} · ${chapter.transliteration}`, description },
  };
}

export default async function SurahPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const chapterId = Number(id);
  const chapter = getChapter(chapterId);

  if (!chapter) notFound();

  const initialVerses = await getInitialChapterVerses(chapter.id);

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'السور', item: `${SITE_URL}${ROUTES.surahIndex}` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `سورة ${chapter.name}`,
        item: `${SITE_URL}${ROUTES.surah(chapter.id)}`,
      },
    ],
  };

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <PageHeader
        centered
        crumbs={[
          { label: 'الرئيسية', href: ROUTES.home },
          { label: 'السور', href: ROUTES.surahIndex },
          { label: chapter.name },
        ]}
        title={<span className="font-quran text-4xl sm:text-5xl">{chapter.name}</span>}
        subtitle={
          <span className="flex flex-wrap items-center justify-center gap-2">
            <Badge tone={chapter.revelation === 'meccan' ? 'accent' : 'primary'}>
              {chapter.revelation === 'meccan' ? 'مكية' : 'مدنية'}
            </Badge>
            <Badge>{toArabicNumerals(chapter.versesCount)} آية</Badge>
            <Badge>
              الجزء {toArabicNumerals(chapter.startJuz)}
              {chapter.endJuz !== chapter.startJuz && `–${toArabicNumerals(chapter.endJuz)}`}
            </Badge>
            <Badge>
              الصفحة {toArabicNumerals(chapter.startPage)}
              {chapter.endPage !== chapter.startPage && `–${toArabicNumerals(chapter.endPage)}`}
            </Badge>
          </span>
        }
      >
        <p className="mt-4 text-sm text-ink-subtle">
          {chapter.transliteration} · {chapter.translation}
        </p>
        <div className="ornamental-rule mt-6" aria-hidden="true">
          <Icon name="star" size={15} />
        </div>
      </PageHeader>

      <ReaderBoundary
        mode="surah"
        id={chapter.id}
        surahName={chapter.name}
        showBasmalah={chapter.hasBasmalah}
        initialVerses={initialVerses}
        totalVerses={chapter.versesCount}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <ChapterNavigation previous={getChapter(chapterId - 1)} next={getChapter(chapterId + 1)} />
      </div>

      <p className="mx-auto mt-10 max-w-3xl px-4 text-center text-xs text-ink-subtle sm:px-6">
        سورة {toArabicNumerals(chapter.id)} من {toArabicNumerals(TOTAL_CHAPTERS)} · ترتيب النزول{' '}
        {toArabicNumerals(chapter.revelationOrder)}
      </p>
    </AppShell>
  );
}
