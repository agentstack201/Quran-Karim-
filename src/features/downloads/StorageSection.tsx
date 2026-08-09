'use client';

import { Button, Icon } from '@/components/ui';
import { formatBytes, toArabicNumerals } from '@/utils';
import { useDownloads } from './DownloadsProvider';

/**
 * What this app is keeping on the device, and how to get it back.
 *
 * Shown in full rather than summarised. An app that downloads hundreds of
 * megabytes owes the reader an exact account of it and a one-tap way to undo
 * it — and stating the number plainly earns more trust than hiding it ever
 * saves in embarrassment.
 */
export function StorageSection(): React.JSX.Element {
  const { stored, storage, remove, removeAll } = useDownloads();

  const used = storage.usage;
  const quota = storage.quota;
  const share = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

  return (
    <section aria-labelledby="settings-storage">
      <h3 id="settings-storage" className="mb-1.5 text-sm font-bold text-ink">
        التخزين
      </h3>
      <p className="mb-4 text-xs text-ink-subtle">
        كل ما يحفظه التطبيق على جهازك — النص والتلاوات المنزّلة — وحذفه بضغطة.
      </p>

      <div className="rounded-md border border-border bg-surface-sunken p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-ink">{formatBytes(used)}</span>
          {quota > 0 && (
            <span className="text-xs text-ink-subtle">
              من {formatBytes(quota)} متاحة لهذا الموقع
            </span>
          )}
        </div>

        {quota > 0 && (
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share)}
            aria-label="نسبة المساحة المستخدمة"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out-soft)]"
              // A sliver keeps the bar from reading as empty when the real
              // share rounds below one pixel.
              style={{ width: `${Math.max(share, used > 0 ? 1.5 : 0)}%` }}
            />
          </div>
        )}

        <p className="mt-2.5 flex items-center gap-1.5 text-[0.6875rem] text-ink-subtle">
          <Icon name={storage.persisted ? 'checkCircle' : 'info'} size={13} />
          {storage.persisted
            ? 'المتصفح وافق على الاحتفاظ بهذه البيانات ولن يحذفها تلقائياً.'
            : 'قد يحذف المتصفح هذه البيانات عند ضيق المساحة. تنزيل أي تلاوة يطلب منه الاحتفاظ بها.'}
        </p>
      </div>

      {stored.length > 0 ? (
        <>
          <div className="mt-4 space-y-1.5">
            {stored.map((item) => {
              const partial = item.ayat < item.totalAyat;
              return (
                <div
                  key={`${item.folder}:${item.surah}`}
                  className="flex items-center gap-3 rounded-sm border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      <span className="font-quran">{item.surahName}</span>
                      <span className="text-ink-subtle"> · {item.reciterName}</span>
                    </p>
                    <p className="text-[0.6875rem] text-ink-subtle tabular-nums">
                      {toArabicNumerals(item.ayat)} من {toArabicNumerals(item.totalAyat)} آية
                      {partial && ' · غير مكتملة'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconStart="trash"
                    onClick={() => void remove(item.surah, item.folder)}
                  >
                    حذف
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            iconStart="trash"
            className="mt-3 text-danger"
            onClick={() => void removeAll()}
          >
            حذف كل التلاوات المنزّلة
          </Button>
        </>
      ) : (
        <p className="mt-4 text-xs text-ink-subtle">
          لا توجد تلاوات منزّلة بعد. افتح أي سورة واضغط «نزّل التلاوة» لتعمل دون إنترنت.
        </p>
      )}
    </section>
  );
}
