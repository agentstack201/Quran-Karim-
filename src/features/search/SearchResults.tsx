'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ROUTES } from '@/constants';
import { Badge, EmptyState, ErrorState, Icon, Skeleton } from '@/components/ui';
import { useSearch } from '@/hooks';
import { cn, toArabicNumerals } from '@/utils';
import { ChapterCard } from '@/features/quran/ChapterCard';

/**
 * صفحة البحث الكاملة.
 *
 * الاستعلام يعيش في عنوان الصفحة، فتصبح كل نتيجة بحث قابلة للمشاركة والحفظ
 * وزر الرجوع يعمل كما يتوقّع المستخدم. يُكتب العنوان بـ `replace` لا `push`
 * حتى لا يمتلئ سجلّ التصفّح بمدخل عن كل حرف يُكتب.
 */
export function SearchResults(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const {
    query,
    setQuery,
    status,
    verses,
    chapters,
    reference,
    total,
    truncated,
    error,
    degraded,
  } = useSearch(initialQuery);

  useEffect(() => {
    const trimmed = query.trim();
    const target = trimmed.length > 0 ? ROUTES.searchQuery(trimmed) : ROUTES.search;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) router.replace(target, { scroll: false });
  }, [query, router]);

  const hasResults = verses.length > 0 || chapters.length > 0 || reference !== null;
  const searched = query.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="relative mb-6">
        <label htmlFor="search-input" className="sr-only">
          ابحث في القرآن الكريم
        </label>
        <Icon
          name="search"
          size={19}
          className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-subtle"
        />
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث في نص القرآن أو الترجمة أو أسماء السور…"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'h-14 w-full rounded-lg border border-border bg-surface ps-12 pe-4 text-ink',
            'text-[0.9375rem] shadow-[var(--shadow-sm)] transition-colors duration-200',
            'hover:border-border-strong',
          )}
        />
      </div>

      {degraded && (
        <p
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-md bg-warning-soft px-4 py-3 text-sm leading-relaxed text-warning"
        >
          <Icon name="offline" size={17} className="mt-0.5 shrink-0" />
          <span>
            أنت غير متصل بالإنترنت. البحث في نص القرآن يحتاج اتصالاً، لكن البحث بأسماء السور
            والانتقال المباشر (مثل ٢:٢٥٥) يعملان الآن.
          </span>
        </p>
      )}

      {status === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-live="polite" aria-label="جارٍ البحث">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border p-5">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && <ErrorState message={error ?? undefined} />}

      {status !== 'loading' && reference && (
        <section className="mb-8" aria-labelledby="search-reference">
          <h2 id="search-reference" className="mb-3 text-xs font-bold text-ink-subtle">
            انتقال مباشر
          </h2>
          <Link
            href={ROUTES.surahAyah(reference.surah, reference.ayah)}
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/35 bg-primary-soft p-4 transition-colors duration-200 hover:border-primary"
          >
            <span>
              <span className="block font-quran text-xl text-ink">{reference.chapter.name}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                الآية {toArabicNumerals(reference.ayah)} من{' '}
                {toArabicNumerals(reference.chapter.versesCount)}
              </span>
            </span>
            <Icon name="arrowStart" size={19} className="shrink-0 text-primary" />
          </Link>
        </section>
      )}

      {status !== 'loading' && chapters.length > 0 && (
        <section className="mb-8" aria-labelledby="search-chapters">
          <h2 id="search-chapters" className="mb-3 text-xs font-bold text-ink-subtle">
            سور مطابقة · {toArabicNumerals(chapters.length)}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <ChapterCard chapter={chapter} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {status !== 'loading' && verses.length > 0 && (
        <section aria-labelledby="search-verses">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="search-verses" className="text-xs font-bold text-ink-subtle">
              آيات مطابقة
            </h2>
            <p className="text-xs text-ink-subtle" role="status" aria-live="polite">
              {truncated ? (
                <>
                  عُرض {toArabicNumerals(verses.length)} من {toArabicNumerals(total)} نتيجة
                </>
              ) : (
                <>{toArabicNumerals(total)} نتيجة</>
              )}
            </p>
          </div>

          <ul className="space-y-3">
            {verses.map((verse) => (
              <li key={verse.verseId}>
                <Link
                  href={ROUTES.surahAyah(verse.surah, verse.ayah)}
                  className="block rounded-lg border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[var(--shadow-sm)]"
                >
                  <p className="quran-text text-ink" dir="rtl" lang="ar">
                    {verse.text}
                  </p>

                  <p className="mt-3 line-clamp-2 text-sm text-ink-muted" dir="ltr" lang="en">
                    {verse.translation}
                  </p>

                  <div className="mt-3.5 flex items-center gap-2">
                    <Badge tone="primary">
                      {verse.surahName} · {toArabicNumerals(verse.ayah)}
                    </Badge>
                    <Badge>
                      {verse.matchedIn === 'arabic' ? 'مطابقة في النص' : 'مطابقة في الترجمة'}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {truncated && (
            <p className="mt-5 text-center text-xs leading-relaxed text-ink-subtle">
              هناك نتائج أكثر. جرّب عبارة أطول أو أدقّ لتضييق البحث.
            </p>
          )}
        </section>
      )}

      {status === 'success' && searched && !hasResults && (
        <EmptyState
          icon="search"
          title="لا توجد نتائج"
          message="لم نجد ما يطابق بحثك. جرّب كلمات أقل، أو ابحث بدون تشكيل، أو اكتب رقم السورة والآية مثل ٢:٢٥٥."
        />
      )}

      {!searched && (
        <EmptyState
          icon="search"
          title="ابحث في القرآن الكريم"
          message="اكتب كلمة أو عبارة للبحث في نص المصحف وترجمته، أو اسم سورة، أو رقم السورة والآية للانتقال المباشر."
        />
      )}
    </div>
  );
}
