'use client';

import { DATA_ATTRIBUTION, TAFSIR_EDITIONS, getTafsirEdition } from '@/constants';
import { Badge, Icon, Modal, Select, Skeleton } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useTafsir } from '@/hooks';
import { getChapter } from '@/services/quran';
import type { Verse } from '@/types';
import { toArabicNumerals } from '@/utils';

/**
 * The ayah detail dialog.
 *
 * Deliberately layered so it is never empty: the ayah text, translation,
 * transliteration and structural metadata are already on the device and render
 * instantly, while the tafsir — the one part that needs the network — loads
 * into its own section. If it fails, the rest of the dialog is still worth
 * having open.
 */
export function TafsirDialog({
  verse,
  onClose,
}: {
  readonly verse: Verse | null;
  readonly onClose: () => void;
}): React.JSX.Element {
  const { settings, update } = useSettings();
  const { status, tafsir, error } = useTafsir(verse?.key ?? null, settings.tafsirId);

  const chapter = verse ? getChapter(verse.surah) : null;
  const edition = getTafsirEdition(settings.tafsirId);

  return (
    <Modal
      open={verse !== null}
      onClose={onClose}
      title={chapter ? `${chapter.name} — الآية ${toArabicNumerals(verse?.ayah ?? 0)}` : 'الآية'}
      description={chapter ? `${chapter.transliteration} · ${chapter.translation}` : undefined}
      size="md"
    >
      {verse && (
        <div className="space-y-7">
          <section aria-label="نص الآية">
            <p className="quran-text text-ink" dir="rtl" lang="ar">
              {verse.text}
              <span className="ayah-medallion" aria-hidden="true">
                {verse.numberInSurah}
              </span>
            </p>
          </section>

          <section aria-labelledby="tafsir-meta">
            <h3 id="tafsir-meta" className="sr-only">
              معلومات الآية
            </h3>
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: 'الجزء', value: toArabicNumerals(verse.juz) },
                { label: 'الحزب', value: toArabicNumerals(verse.hizb) },
                { label: 'الصفحة', value: toArabicNumerals(verse.page) },
                { label: 'الركوع', value: toArabicNumerals(verse.ruku) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-center"
                >
                  <dt className="text-[0.6875rem] font-medium text-ink-subtle">{item.label}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>

            {verse.sajdah && (
              <p className="mt-3">
                <Badge tone="accent">
                  <Icon name="star" size={12} />
                  في هذه الآية سجدة تلاوة
                </Badge>
              </p>
            )}
          </section>

          <section aria-labelledby="tafsir-translation">
            <h3
              id="tafsir-translation"
              className="mb-2.5 flex items-center gap-2 text-sm font-bold text-ink"
            >
              <Icon name="translate" size={16} className="text-primary" />
              الترجمة الإنجليزية
            </h3>
            <p className="text-[0.9375rem] leading-relaxed text-ink-muted" dir="ltr" lang="en">
              {verse.translation}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-subtle italic" dir="ltr" lang="en">
              {verse.transliteration}
            </p>
          </section>

          <section aria-labelledby="tafsir-body">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 id="tafsir-body" className="flex items-center gap-2 text-sm font-bold text-ink">
                <Icon name="book" size={16} className="text-primary" />
                التفسير
              </h3>

              <Select
                label="نسخة التفسير"
                hideLabel
                value={String(settings.tafsirId)}
                onChange={(value) => update('tafsirId', Number(value))}
                options={TAFSIR_EDITIONS.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                }))}
                className="w-auto min-w-52"
              />
            </div>

            {status === 'loading' && (
              <div
                className="space-y-2.5"
                aria-busy="true"
                aria-live="polite"
                aria-label="جارٍ تحميل التفسير"
              >
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[94%]" />
                <Skeleton className="h-4 w-[97%]" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {status === 'error' && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md border border-border bg-surface-sunken px-3.5 py-3 text-sm text-ink-muted"
              >
                <Icon name="info" size={17} className="mt-0.5 shrink-0" />
                <span>
                  {error}
                  <span className="mt-1 block text-xs text-ink-subtle">
                    الترجمة ومعلومات الآية أعلاه متاحة دائماً دون اتصال.
                  </span>
                </span>
              </div>
            )}

            {status === 'success' && tafsir && (
              <>
                <div className="space-y-3 text-[0.9375rem] leading-loose text-ink" dir="rtl">
                  {tafsir.text.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-subtle">
                  المصدر: {tafsir.resourceName} —{' '}
                  <a
                    href={DATA_ATTRIBUTION.tafsir.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xs underline underline-offset-2 transition-colors hover:text-primary"
                  >
                    {DATA_ATTRIBUTION.tafsir.source}
                  </a>
                </p>
              </>
            )}

            {status === 'idle' && <p className="text-sm text-ink-subtle">{edition.name}</p>}
          </section>
        </div>
      )}
    </Modal>
  );
}
