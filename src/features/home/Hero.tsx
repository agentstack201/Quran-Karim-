import Link from 'next/link';
import { APP_NAME, APP_TAGLINE, ROUTES, TOTAL_CHAPTERS, TOTAL_VERSES } from '@/constants';
import { Icon } from '@/components/ui';
import { toArabicNumerals } from '@/utils';
import { HeroSearch } from './HeroSearch';

/**
 * The landing hero.
 *
 * A Server Component apart from the search field, so the headline, the ayah and
 * the quick links are in the initial HTML — good for the largest contentful
 * paint and good for crawlers.
 */
export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Ambient wash. Purely decorative and pointer-transparent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,var(--primary-soft),transparent_70%)]"
      />

      <div className="mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-20">
        <p className="inline-flex animate-[var(--animate-fade-in)] items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-ink-muted backdrop-blur-sm">
          <Icon name="sparkle" size={14} className="text-accent" />
          مصحف كامل يعمل بدون إنترنت
        </p>

        <h1
          id="hero-heading"
          className="mt-6 animate-[var(--animate-rise)] font-quran text-5xl leading-[1.15] font-bold text-ink sm:text-6xl"
        >
          {APP_NAME}
        </h1>

        <p className="mx-auto mt-4 max-w-lg animate-[var(--animate-rise)] text-base leading-relaxed text-ink-muted sm:text-lg">
          {APP_TAGLINE}
        </p>

        <div className="mx-auto mt-8 max-w-xl animate-[var(--animate-rise)]">
          <HeroSearch />
        </div>

        <nav aria-label="روابط سريعة" className="mt-7">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {[
              { href: ROUTES.surahIndex, label: 'السور', icon: 'book' as const },
              { href: ROUTES.juzIndex, label: 'الأجزاء', icon: 'layers' as const },
              { href: ROUTES.hizbIndex, label: 'الأحزاب', icon: 'grid' as const },
              { href: ROUTES.bookmarks, label: 'المحفوظات', icon: 'bookmark' as const },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface/70 px-4 text-sm font-medium text-ink-muted backdrop-blur-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 text-xs text-ink-subtle">
          {toArabicNumerals(TOTAL_CHAPTERS)} سورة · {toArabicNumerals(TOTAL_VERSES)} آية · بالرسم
          العثماني برواية حفص عن عاصم
        </p>
      </div>
    </section>
  );
}
