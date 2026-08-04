'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { APP_NAME, NAV_ITEMS, ROUTES } from '@/constants';
import { Icon, IconButton, type IconName } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsProvider';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { CommandPalette } from '@/features/search/CommandPalette';
import { ShortcutsDialog } from '@/features/settings/ShortcutsDialog';
import { useKeyboardShortcuts, useScrolledPast, scrollToTop } from '@/hooks';
import { cn } from '@/utils';
import { Logo } from './Logo';

/**
 * The application header.
 *
 * Sticky, and it earns its border and shadow only once the page has scrolled —
 * so the reading surface looks uninterrupted at rest. Owns the three global
 * dialogs (search, settings, shortcuts) because they are reachable from every
 * page and from the keyboard.
 */
export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const scrolled = useScrolledPast(8);
  const { toggleTheme, resolvedTheme, increaseFont, decreaseFont, resetFont } = useSettings();

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  useKeyboardShortcuts({
    search: openSearch,
    settings: () => setSettingsOpen(true),
    help: () => setShortcutsOpen(true),
    toggleTheme,
    fontIncrease: increaseFont,
    fontDecrease: decreaseFont,
    fontReset: resetFont,
    top: scrollToTop,
  });

  const isActive = useCallback(
    (href: string): boolean =>
      href === ROUTES.home ? pathname === href : pathname.startsWith(href),
    [pathname],
  );

  return (
    <>
      {/* WCAG 2.2 · 2.4.1 — the first tab stop skips the navigation. */}
      <a
        href="#main"
        className="sr-only-focusable fixed start-4 top-4 z-100 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-[var(--shadow-lg)]"
      >
        تخطَّ إلى المحتوى
      </a>

      <header
        data-print="hidden"
        className={cn(
          'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)]',
          scrolled
            ? 'border-b border-border bg-background/85 shadow-[var(--shadow-sm)] backdrop-blur-xl backdrop-saturate-150'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            href={ROUTES.home}
            className="group flex shrink-0 items-center gap-2.5 rounded-md"
            aria-label={`${APP_NAME} — الصفحة الرئيسية`}
          >
            <Logo className="size-9 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-105" />
            <span className="hidden font-quran text-2xl leading-none text-ink sm:block">
              {APP_NAME}
            </span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="mx-auto hidden md:block">
            <ul className="flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-9.5 items-center gap-2 rounded-md px-3.5 text-sm font-medium',
                        'transition-colors duration-200 ease-[var(--ease-out-soft)]',
                        active
                          ? 'bg-primary-soft text-primary'
                          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      <Icon name={item.icon as IconName} size={17} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-0.5 md:ms-0">
            <button
              type="button"
              onClick={openSearch}
              className={cn(
                'hidden h-9.5 items-center gap-2.5 rounded-md border border-border bg-surface text-ink-subtle',
                'ps-3 pe-2.5 text-sm transition-colors duration-200 hover:border-border-strong hover:text-ink-muted lg:flex',
              )}
            >
              <Icon name="search" size={16} />
              <span className="min-w-28 text-start">ابحث في القرآن…</span>
              <kbd className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-ink-subtle">
                /
              </kbd>
            </button>

            <IconButton icon="search" label="بحث" onClick={openSearch} className="lg:hidden" />

            <IconButton
              icon={resolvedTheme === 'dark' ? 'sun' : 'moon'}
              label={resolvedTheme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              onClick={toggleTheme}
            />

            <IconButton icon="settings" label="الإعدادات" onClick={() => setSettingsOpen(true)} />

            <IconButton
              icon={menuOpen ? 'close' : 'menu'}
              label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="md:hidden"
            />
          </div>
        </div>

        {/* Mobile navigation. Rendered conditionally so its links stay out of
            the tab order while collapsed. */}
        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="التنقل الرئيسي"
            className="animate-[var(--animate-fade-in)] border-t border-border bg-background md:hidden"
          >
            <ul className="mx-auto grid max-w-6xl gap-0.5 px-4 py-3 sm:px-6">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-12 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-medium',
                        active
                          ? 'bg-primary-soft text-primary'
                          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      <Icon name={item.icon as IconName} size={19} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(href) => {
          setSearchOpen(false);
          router.push(href);
        }}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
