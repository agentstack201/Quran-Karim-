import Link from 'next/link';
import { APP_NAME, APP_TAGLINE, DATA_ATTRIBUTION, NAV_ITEMS, ROUTES } from '@/constants';
import { Logo } from './Logo';

/**
 * The site footer.
 *
 * Carries the data attributions the bundled sources require (CC BY-SA 4.0 for
 * the Quranic text) — this is a licence obligation, not decoration.
 */
export function Footer(): React.JSX.Element {
  return (
    <footer
      data-print="hidden"
      className="mt-20 border-t border-border bg-background-subtle/60"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        تذييل الصفحة
      </h2>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo className="size-9" />
              <span className="font-quran text-2xl leading-none text-ink">{APP_NAME}</span>
            </div>
            <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-ink-muted">{APP_TAGLINE}</p>
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
              يعمل بالكامل دون اتصال بالإنترنت — لا حسابات، ولا تتبّع، ولا إعلانات.
            </p>
          </div>

          <nav aria-label="روابط التذييل">
            <h3 className="mb-3.5 text-sm font-bold text-ink">التصفّح</h3>
            <ul className="space-y-2.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-xs text-sm text-ink-muted transition-colors duration-200 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={ROUTES.about}
                  className="rounded-xs text-sm text-ink-muted transition-colors duration-200 hover:text-primary"
                >
                  عن التطبيق
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="mb-3.5 text-sm font-bold text-ink">المصادر</h3>
            <ul className="space-y-2.5">
              {Object.entries(DATA_ATTRIBUTION).map(([key, entry]) => (
                <li key={key} className="text-sm">
                  <span className="text-ink-subtle">{entry.label}: </span>
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xs text-ink-muted transition-colors duration-200 hover:text-primary"
                  >
                    {entry.source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-7 sm:flex-row sm:justify-between">
          <p className="text-xs text-ink-subtle">
            نص المصحف والترجمات منشورة برخصة{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer license"
              className="rounded-xs underline underline-offset-2 transition-colors hover:text-primary"
            >
              CC BY-SA 4.0
            </a>
          </p>
          <p className="font-quran text-base text-ink-subtle">
            ﴿ وَرَتِّلِ ٱلۡقُرۡءَانَ تَرۡتِيلًا ﴾
          </p>
        </div>
      </div>
    </footer>
  );
}
