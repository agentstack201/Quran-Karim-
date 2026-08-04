'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ROUTES } from '@/constants';
import { EmptyState, Icon, Modal, Skeleton } from '@/components/ui';
import { useSearch } from '@/hooks';
import { toArabicNumerals } from '@/utils';
import { cn } from '@/utils';

type PaletteItem = {
  readonly id: string;
  readonly href: string;
  readonly primary: string;
  readonly secondary: string;
  readonly badge: string;
  readonly kind: 'reference' | 'chapter' | 'verse';
};

/**
 * The global search dialog.
 *
 * A single input answers three different questions — "go to 2:255", "open
 * Al-Baqarah", "find آية about patience" — and the results are presented as one
 * flat, arrow-navigable list, because the user does not care which subsystem
 * answered.
 *
 * Implements the WAI-ARIA combobox pattern: the input owns the listbox, arrow
 * keys move `aria-activedescendant` without ever removing focus from the input,
 * and Enter opens the highlighted result.
 */
export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onNavigate: (href: string) => void;
}): React.JSX.Element {
  const { query, setQuery, status, verses, chapters, reference, total, degraded, error, clear } =
    useSearch();
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];

    if (reference) {
      result.push({
        id: `ref-${reference.surah}-${reference.ayah}`,
        href: ROUTES.surahAyah(reference.surah, reference.ayah),
        primary: `${reference.chapter.name} — الآية ${toArabicNumerals(reference.ayah)}`,
        secondary: 'الانتقال المباشر إلى الآية',
        badge: 'مرجع',
        kind: 'reference',
      });
    }

    for (const chapter of chapters) {
      result.push({
        id: `chapter-${chapter.id}`,
        href: ROUTES.surah(chapter.id),
        primary: chapter.name,
        secondary: `${chapter.transliteration} · ${toArabicNumerals(chapter.versesCount)} آية`,
        badge: `سورة ${toArabicNumerals(chapter.id)}`,
        kind: 'chapter',
      });
    }

    for (const verse of verses.slice(0, 20)) {
      result.push({
        id: `verse-${verse.verseId}`,
        href: ROUTES.surahAyah(verse.surah, verse.ayah),
        primary: verse.text,
        secondary: verse.translation,
        badge: `${verse.surahName} ${toArabicNumerals(verse.ayah)}`,
        kind: 'verse',
      });
    }

    return result;
  }, [reference, chapters, verses]);

  /**
   * A new result set invalidates the old highlight position.
   *
   * Adjusted during render against the previous result count — React's
   * documented pattern for derived state — rather than in an effect, which
   * would paint one frame with a stale highlight before correcting it.
   */
  const [lastItemCount, setLastItemCount] = useState(items.length);
  if (lastItemCount !== items.length) {
    setLastItemCount(items.length);
    setActiveIndex(0);
  }

  // Focus the input when the dialog opens, and clear it when it closes so the
  // next invocation starts fresh rather than showing stale results.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) clear();
  }, [open, clear]);

  // Keep the highlighted row in view during arrow-key navigation.
  useEffect(() => {
    const active = listRef.current?.children[activeIndex];
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      const item = items[activeIndex];
      if (item) {
        event.preventDefault();
        onNavigate(item.href);
      }
    }
  };

  const showEmpty = status === 'success' && items.length === 0 && query.trim().length >= 2;

  return (
    <Modal open={open} onClose={onClose} title="البحث في القرآن" size="md" className="sm:max-w-xl">
      <div className="space-y-4">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-ink-subtle"
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              items[activeIndex] ? `option-${items[activeIndex].id}` : undefined
            }
            aria-label="ابحث في القرآن الكريم"
            placeholder="اكتب آية أو اسم سورة أو ٢:٢٥٥…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-12 w-full rounded-md border border-border bg-surface ps-11 pe-4 text-[0.9375rem] text-ink',
              'transition-colors duration-200 hover:border-border-strong',
            )}
          />
        </div>

        {degraded && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-warning-soft px-3.5 py-2.5 text-xs leading-relaxed text-warning"
          >
            <Icon name="offline" size={16} />
            أنت غير متصل — البحث في نص القرآن غير متاح، لكن البحث بأسماء السور يعمل.
          </p>
        )}

        {status === 'loading' && (
          <div className="space-y-2" aria-busy="true" aria-label="جارٍ البحث">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-2 rounded-md border border-border p-3.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        )}

        {items.length > 0 && (
          <>
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="نتائج البحث"
              className="-mx-1 max-h-[46vh] space-y-1 overflow-y-auto px-1"
            >
              {items.map((item, index) => {
                const active = index === activeIndex;
                return (
                  <li key={item.id} role="none">
                    <button
                      type="button"
                      id={`option-${item.id}`}
                      role="option"
                      aria-selected={active}
                      tabIndex={-1}
                      onClick={() => onNavigate(item.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'w-full rounded-md border px-3.5 py-3 text-start transition-colors duration-150',
                        active
                          ? 'border-primary/40 bg-primary-soft'
                          : 'border-transparent hover:bg-surface-sunken',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            'min-w-0 flex-1',
                            item.kind === 'verse'
                              ? 'line-clamp-2 font-quran text-lg leading-loose text-ink'
                              : 'truncate text-[0.9375rem] font-semibold text-ink',
                          )}
                        >
                          {item.primary}
                        </span>
                        <span className="shrink-0 text-[0.6875rem] font-semibold text-ink-subtle">
                          {item.badge}
                        </span>
                      </div>
                      {item.secondary && (
                        <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{item.secondary}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {total > verses.length && (
              <p className="text-center text-xs text-ink-subtle">
                عُرض {toArabicNumerals(Math.min(verses.length, 20))} من {toArabicNumerals(total)}{' '}
                نتيجة
              </p>
            )}
          </>
        )}

        {showEmpty && (
          <EmptyState
            icon="search"
            title="لا توجد نتائج"
            message="جرّب كلمات أقل، أو ابحث باسم السورة، أو اكتب رقم السورة والآية مثل ٢:٢٥٥"
            className="py-8"
          />
        )}

        {status === 'idle' && (
          <p className="px-1 py-4 text-center text-xs leading-relaxed text-ink-subtle">
            ابحث في نص القرآن الكريم وترجمته، أو انتقل مباشرة بكتابة رقم السورة والآية.
          </p>
        )}
      </div>
    </Modal>
  );
}
