'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants';
import { Icon } from '@/components/ui';
import { useSearch } from '@/hooks';
import { cn, toArabicNumerals } from '@/utils';

/**
 * البحث السريع في الصفحة الرئيسية.
 *
 * يعرض أفضل أربع نتائج مباشرةً تحت الحقل أثناء الكتابة، ويقود Enter إلى صفحة
 * البحث الكاملة. الغرض منه الوصول السريع لا استعراض النتائج — لذلك تُعرض
 * أسماء السور والمراجع فقط، وهي البيانات المتاحة محلياً وفوراً حتى دون اتصال.
 */
export function HeroSearch(): React.JSX.Element {
  const router = useRouter();
  const { query, setQuery, chapters, reference, status } = useSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // إغلاق قائمة الاقتراحات عند النقر خارجها.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const suggestions = reference
    ? [
        {
          href: ROUTES.surahAyah(reference.surah, reference.ayah),
          primary: `${reference.chapter.name} — الآية ${toArabicNumerals(reference.ayah)}`,
          secondary: 'انتقال مباشر',
        },
        ...chapters.slice(0, 3).map((chapter) => ({
          href: ROUTES.surah(chapter.id),
          primary: chapter.name,
          secondary: `${toArabicNumerals(chapter.versesCount)} آية`,
        })),
      ]
    : chapters.slice(0, 4).map((chapter) => ({
        href: ROUTES.surah(chapter.id),
        primary: chapter.name,
        secondary: `${chapter.transliteration} · ${toArabicNumerals(chapter.versesCount)} آية`,
      }));

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    router.push(ROUTES.searchQuery(trimmed));
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={onSubmit} role="search">
        <label htmlFor="hero-search" className="sr-only">
          ابحث في القرآن الكريم
        </label>

        <div className="relative">
          <Icon
            name="search"
            size={19}
            className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-subtle"
          />

          <input
            id="hero-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="ابحث عن سورة أو آية…"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-14 w-full rounded-lg border border-border bg-surface ps-12 pe-28 text-ink',
              'text-[0.9375rem] shadow-[var(--shadow-sm)]',
              'transition-[border-color,box-shadow] duration-200',
              'hover:border-border-strong focus:shadow-[var(--shadow-md)]',
            )}
          />

          <button
            type="submit"
            className="absolute inset-y-2 end-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary-hover active:scale-95"
          >
            بحث
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          className={cn(
            'absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-border bg-surface-raised',
            'animate-[var(--animate-scale-in)] shadow-[var(--shadow-lg)]',
          )}
        >
          {suggestions.map((item) => (
            <li key={item.href} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => router.push(item.href)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors duration-150 hover:bg-surface-sunken"
              >
                <span className="truncate font-quran text-lg text-ink">{item.primary}</span>
                <span className="shrink-0 text-xs text-ink-subtle">{item.secondary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && status === 'idle' && query.trim().length > 0 && suggestions.length === 0 && (
        <p className="absolute inset-x-0 top-full z-20 mt-2 rounded-lg border border-border bg-surface-raised px-4 py-3 text-center text-sm text-ink-subtle shadow-[var(--shadow-lg)]">
          اضغط Enter للبحث في نص القرآن كاملاً
        </p>
      )}
    </div>
  );
}
