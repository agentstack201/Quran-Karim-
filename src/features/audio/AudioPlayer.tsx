'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLAYBACK_RATES, RECITERS, REPEAT_CHOICES, ROUTES, getReciter } from '@/constants';
import { Icon, IconButton, Select } from '@/components/ui';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useKeyboardShortcuts } from '@/hooks';
import { cn, clamp, formatDuration, toArabicNumerals } from '@/utils';
import { useAudio } from './AudioProvider';

/**
 * The recitation player.
 *
 * Docked to the bottom of the viewport whenever something is loaded, and absent
 * entirely otherwise — a persistent empty player bar would be dead chrome
 * stealing reading space on a phone.
 *
 * The progress bar is a real `<input type="range">`: it arrives with correct
 * keyboard behaviour, drag handling and screen-reader announcements, which a
 * div-with-listeners implementation would have to rebuild badly.
 */
export function AudioPlayer(): React.JSX.Element | null {
  const {
    track,
    status,
    playing,
    currentTime,
    duration,
    error,
    toggle,
    next,
    previous,
    stop,
    seek,
  } = useAudio();
  const { settings, update } = useSettings();
  const [expanded, setExpanded] = useState(false);

  useKeyboardShortcuts(
    {
      playPause: toggle,
      nextAyah: next,
      previousAyah: previous,
    },
    track !== null,
  );

  if (!track) return null;

  const reciter = getReciter(settings.reciterId);
  const queueIndex = track.index;
  const atStart = queueIndex <= 0;
  const atEnd = queueIndex === -1 || queueIndex >= track.queue.length - 1;
  const repeating = settings.repeatEach > 1 || settings.repeatRange > 1;

  /**
   * Which pass of the current ayah is being heard.
   *
   * Counted from the queue rather than tracked separately: repeats are
   * contiguous, so the run containing the cursor is the answer.
   */
  const repeatPass = (() => {
    if (settings.repeatEach <= 1 || queueIndex < 0) return null;
    let start = queueIndex;
    while (start > 0 && track.queue[start - 1] === track.ayah) start -= 1;
    return { current: queueIndex - start + 1, total: settings.repeatEach };
  })();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const muted = settings.volume === 0;

  return (
    <div
      data-print="hidden"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'border-t border-border bg-surface-raised/92 backdrop-blur-xl backdrop-saturate-150',
        'animate-[var(--animate-slide-up)] shadow-[var(--shadow-xl)]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
      role="region"
      aria-label="مشغّل التلاوة"
    >
      {/* Seek bar, flush with the top edge so it reads as the player's own
          progress rather than a separate control. */}
      <div className="relative h-1">
        <div
          className="pointer-events-none absolute inset-y-0 start-0 bg-primary/70"
          style={{ width: `${clamp(progress, 0, 100)}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          disabled={duration === 0}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="موضع التلاوة"
          aria-valuetext={`${formatDuration(currentTime)} من ${formatDuration(duration)}`}
          className={cn(
            'absolute inset-x-0 -top-2 h-5 w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)]',
            '[&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100',
            '[&::-webkit-slider-thumb]:transition-opacity',
            '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--primary)]',
          )}
        />
      </div>

      <div className="mx-auto max-w-6xl px-3 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-0.5">
            <IconButton
              icon="previous"
              label="الآية السابقة"
              onClick={previous}
              disabled={atStart}
              size="sm"
            />
            <IconButton
              icon={playing ? 'pause' : 'play'}
              label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
              onClick={toggle}
              variant="solid"
              size="md"
              className={cn(status === 'loading' && 'animate-pulse')}
            />
            <IconButton
              icon="next"
              label="الآية التالية"
              onClick={next}
              disabled={atEnd}
              size="sm"
            />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={ROUTES.surahAyah(track.surah, track.ayah)}
              className="block truncate rounded-xs text-sm font-semibold text-ink hover:underline"
            >
              {track.surahName}
              <span className="font-normal text-ink-muted">
                {' '}
                — الآية {toArabicNumerals(track.ayah)}
              </span>
              {repeatPass && (
                <span className="ms-2 rounded-xs bg-accent-soft px-1.5 py-0.5 align-middle text-[0.6875rem] font-semibold text-accent tabular-nums">
                  {toArabicNumerals(repeatPass.current)}/{toArabicNumerals(repeatPass.total)}
                </span>
              )}
            </Link>
            <p className="truncate text-xs text-ink-subtle">
              {error ? (
                <span className="text-danger">{error}</span>
              ) : (
                <>
                  {reciter.name}
                  <span className="hidden sm:inline">
                    {' · '}
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <IconButton
              icon={muted ? 'volumeMute' : 'volume'}
              label={muted ? 'إلغاء الكتم' : 'كتم الصوت'}
              onClick={() => update('volume', muted ? 1 : 0)}
              size="sm"
              className="hidden sm:inline-flex"
            />
            <IconButton
              icon="reset"
              label={repeating ? 'إيقاف التكرار' : 'تكرار الآية للحفظ'}
              onClick={() => {
                update('repeatEach', repeating ? 1 : 3);
                if (repeating) update('repeatRange', 1);
              }}
              size="sm"
              active={repeating}
              className={cn(repeating && 'text-accent')}
            />
            <IconButton
              icon={expanded ? 'chevronDown' : 'chevronUp'}
              label={expanded ? 'إخفاء خيارات التلاوة' : 'خيارات التلاوة'}
              aria-expanded={expanded}
              aria-controls="audio-options"
              onClick={() => setExpanded((open) => !open)}
              size="sm"
            />
            <IconButton
              icon="close"
              label="إيقاف التلاوة وإغلاق المشغّل"
              onClick={stop}
              size="sm"
            />
          </div>
        </div>

        {expanded && (
          <div
            id="audio-options"
            className="mt-3 grid animate-[var(--animate-fade-in)] gap-3 border-t border-border pt-3 sm:grid-cols-3"
          >
            <Select
              label="تكرار الآية"
              value={String(settings.repeatEach)}
              onChange={(value) => update('repeatEach', Number(value))}
              options={REPEAT_CHOICES.map((count) => ({
                value: String(count),
                label: count === 1 ? 'بدون تكرار' : `${toArabicNumerals(count)} مرات`,
              }))}
            />
            <Select
              label="تكرار المقطع"
              value={String(settings.repeatRange)}
              onChange={(value) => update('repeatRange', Number(value))}
              options={REPEAT_CHOICES.map((count) => ({
                value: String(count),
                label: count === 1 ? 'مرة واحدة' : `${toArabicNumerals(count)} مرات`,
              }))}
            />
            <Select
              label="القارئ"
              value={settings.reciterId}
              onChange={(value) => update('reciterId', value)}
              options={RECITERS.map((item) => ({
                value: item.id,
                label: item.name,
                hint: item.style,
              }))}
            />
            <Select
              label="السرعة"
              value={String(settings.playbackRate)}
              onChange={(value) => update('playbackRate', Number(value))}
              options={PLAYBACK_RATES.map((rate) => ({
                value: String(rate),
                label: `${toArabicNumerals(rate)}×`,
              }))}
            />
            <div>
              <label
                htmlFor="audio-volume"
                className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"
              >
                <Icon name="volume" size={15} />
                مستوى الصوت
              </label>
              <input
                id="audio-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(event) => update('volume', Number(event.target.value))}
                aria-valuetext={`${Math.round(settings.volume * 100)} بالمئة`}
                className={cn(
                  'h-1.5 w-full cursor-pointer appearance-none rounded-full',
                  'bg-[linear-gradient(to_left,var(--primary)_0,var(--primary)_var(--fill),var(--border)_var(--fill))]',
                  '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none',
                  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2',
                  '[&::-webkit-slider-thumb]:border-[var(--surface-raised)] [&::-webkit-slider-thumb]:bg-[var(--primary)]',
                  '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full',
                  '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--primary)]',
                )}
                style={{ '--fill': `${settings.volume * 100}%` } as React.CSSProperties}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
