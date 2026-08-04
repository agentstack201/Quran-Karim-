import Link from 'next/link';
import { APP_DESCRIPTION, APP_NAME, ROUTES, SITE_URL } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui';
import { ContinueReading } from '@/features/home/ContinueReading';
import { DailyVerse } from '@/features/home/DailyVerse';
import { Hero } from '@/features/home/Hero';
import { StatsGrid } from '@/features/home/StatsGrid';
import { ChapterCard } from '@/features/quran/ChapterCard';
import { PartCard } from '@/features/quran/PartCard';
import { CHAPTERS, HIZB_LIST, JUZ_LIST } from '@/services/quran';

/**
 * بيانات منظّمة (JSON-LD) تصف الموقع والتطبيق والمصحف.
 *
 * تُصاغ من الثوابت نفسها التي تستهلكها الواجهة، حتى لا تنفصل عمّا يراه
 * المستخدم فعلاً.
 */
function StructuredData(): React.JSX.Element {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: APP_NAME,
        description: APP_DESCRIPTION,
        inLanguage: 'ar',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name: APP_NAME,
        url: SITE_URL,
        applicationCategory: 'ReferenceApplication',
        operatingSystem: 'Any',
        inLanguage: 'ar',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: [
          'قراءة القرآن الكريم بالرسم العثماني',
          'التلاوة الصوتية لكبار القراء',
          'التفسير والترجمة',
          'البحث في نص القرآن',
          'العمل بدون اتصال بالإنترنت',
        ],
      },
      {
        '@type': 'Book',
        '@id': `${SITE_URL}/#quran`,
        name: 'القرآن الكريم',
        alternateName: 'The Holy Quran',
        inLanguage: 'ar',
        numberOfPages: 604,
        bookFormat: 'https://schema.org/EBook',
        url: SITE_URL,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // البيانات المنظّمة حمولة JSON لا وسوم — يجب ألّا يهرّبها React. وهي
      // مبنية بالكامل من ثوابتنا، ولا تمرّ بها أي مدخلات من المستخدم.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** عنوان قسم مع رابط «عرض الكل». */
function SectionHeader({
  id,
  title,
  description,
  href,
  linkLabel,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly linkLabel: string;
}): React.JSX.Element {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-xl font-bold text-ink sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xs text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
      >
        {linkLabel}
        <Icon name="arrowStart" size={16} />
      </Link>
    </div>
  );
}

/** السور التي يفتحها القارئ مباشرةً عادةً بدل البحث عنها. */
const FEATURED_CHAPTER_IDS = [1, 2, 18, 36, 55, 67, 112, 114];

export default function HomePage(): React.JSX.Element {
  const featuredChapters = FEATURED_CHAPTER_IDS.map((id) =>
    CHAPTERS.find((chapter) => chapter.id === id),
  ).filter((chapter): chapter is NonNullable<typeof chapter> => chapter !== undefined);

  return (
    <AppShell>
      <StructuredData />
      <Hero />

      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        <section aria-labelledby="home-continue">
          <h2 id="home-continue" className="sr-only">
            متابعة القراءة وآية اليوم
          </h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.45fr]">
            <ContinueReading />
            <DailyVerse />
          </div>
        </section>

        <section aria-labelledby="home-stats">
          <h2 id="home-stats" className="mb-5 text-xl font-bold text-ink sm:text-2xl">
            نظرة عامة
          </h2>
          <StatsGrid />
        </section>

        <section aria-labelledby="home-surahs">
          <SectionHeader
            id="home-surahs"
            title="سور مختارة"
            description="من أكثر السور قراءةً وتلاوة"
            href={ROUTES.surahIndex}
            linkLabel="كل السور"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredChapters.map((chapter) => (
              <ChapterCard key={chapter.id} chapter={chapter} />
            ))}
          </div>
        </section>

        <section aria-labelledby="home-juz">
          <SectionHeader
            id="home-juz"
            title="الأجزاء"
            description="ثلاثون جزءاً — تقسيم المصحف المعتاد للورد اليومي"
            href={ROUTES.juzIndex}
            linkLabel="كل الأجزاء"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JUZ_LIST.slice(0, 8).map((juz) => (
              <PartCard key={juz.id} part={juz} kind="juz" headingLevel="h3" />
            ))}
          </div>
        </section>

        <section aria-labelledby="home-hizb">
          <SectionHeader
            id="home-hizb"
            title="الأحزاب"
            description="ستون حزباً — كل جزء حزبان، لتقسيمٍ أدقّ للورد"
            href={ROUTES.hizbIndex}
            linkLabel="كل الأحزاب"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HIZB_LIST.slice(0, 8).map((hizb) => (
              <PartCard key={hizb.id} part={hizb} kind="hizb" headingLevel="h3" />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
