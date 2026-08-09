'use client';

import { Button, Icon } from '@/components/ui';
import { getReciter } from '@/constants';
import { useSettings } from '@/features/settings/SettingsProvider';
import { getChapter } from '@/services/quran';
import { formatBytes, toArabicNumerals } from '@/utils';
import { useDownloads } from './DownloadsProvider';

/**
 * Average bytes per ayah, measured across the archive's 128 kbps recitations.
 *
 * Used only to preview a download before it starts, and labelled as an estimate
 * wherever it is shown. Once files are on the device the real total comes from
 * the browser, never from this number.
 */
const ESTIMATED_BYTES_PER_AYAH = 110_000;

/**
 * Downloads one surah's recitation for offline listening.
 *
 * The size is stated before the tap, not after: asking someone to spend tens of
 * megabytes without telling them how many is how apps end up quietly filling a
 * phone. Everything downloaded is listed and removable in Settings.
 */
export function DownloadButton({ surah }: { readonly surah: number }): React.JSX.Element | null {
  const { settings } = useSettings();
  const { ready, downloadedAyat, active, start, cancel, remove } = useDownloads();

  const chapter = getChapter(surah);
  if (!chapter) return null;

  const reciter = getReciter(settings.reciterId);
  const running = active(surah);
  const stored = downloadedAyat(surah);
  const complete = stored >= chapter.versesCount;

  if (running) {
    const percent = running.total > 0 ? Math.round((running.completed / running.total) * 100) : 0;

    return (
      <div className="flex flex-col items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          iconStart={running.stalled ? 'offline' : 'close'}
          onClick={() => (running.stalled ? start(surah) : cancel(surah))}
        >
          {running.stalled ? 'أعد المحاولة' : `إيقاف التنزيل · ${toArabicNumerals(percent)}٪`}
        </Button>
        <div
          className="h-1 w-40 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={running.total}
          aria-valuenow={running.completed}
          aria-label={`تنزيل تلاوة ${chapter.name}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-soft)]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[0.6875rem] text-ink-subtle">
          {running.stalled
            ? 'توقّف التنزيل — سيُستأنف تلقائياً عند عودة الاتصال'
            : `${toArabicNumerals(running.completed)} من ${toArabicNumerals(running.total)} آية · ${formatBytes(running.bytes)}`}
        </p>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-xs bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          <Icon name="checkCircle" size={14} />
          متاحة دون إنترنت
        </span>
        <button
          type="button"
          onClick={() => void remove(surah)}
          className="rounded-xs text-[0.6875rem] text-ink-subtle underline-offset-2 transition-colors duration-200 hover:text-danger hover:underline"
        >
          حذف التلاوة المنزّلة
        </button>
      </div>
    );
  }

  // A partial download resumes rather than restarting; the cache already holds
  // whatever arrived, so only the remainder is fetched.
  const remaining = chapter.versesCount - stored;
  const estimate = formatBytes(remaining * ESTIMATED_BYTES_PER_AYAH);

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        iconStart="download"
        onClick={() => start(surah)}
        disabled={!ready}
      >
        {stored > 0 ? 'أكمل تنزيل التلاوة' : 'نزّل التلاوة للاستماع دون إنترنت'}
      </Button>
      <p className="text-[0.6875rem] text-ink-subtle">
        {reciter.name} · {toArabicNumerals(remaining)} آية · نحو {estimate}
      </p>
    </div>
  );
}
