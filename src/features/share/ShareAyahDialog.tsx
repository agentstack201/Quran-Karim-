'use client';

import { useCallback, useEffect, useState } from 'react';
import { ROUTES, SITE_URL } from '@/constants';
import { Button, Modal, Skeleton, useToast } from '@/components/ui';
import type { Verse } from '@/types';
import {
  canShare,
  canShareFiles,
  copyToClipboard,
  downloadBlob,
  formatAyahForSharing,
  shareContent,
  toArabicNumerals,
} from '@/utils';
import { IMAGE_THEMES, imageFileName, renderAyahImage, type ImageTheme } from './ayah-image';

/**
 * Sharing an ayah.
 *
 * One entry point with two honest choices, rather than a second icon crowding
 * the verse row: a link for somewhere a link belongs, and an image for
 * everywhere a link does not — statuses, group chats, camera rolls, which is
 * how Quranic content actually travels.
 */
export function ShareAyahDialog({
  verse,
  surahName,
  onClose,
}: {
  readonly verse: Verse | null;
  readonly surahName: string;
  readonly onClose: () => void;
}): React.JSX.Element {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ImageTheme>('paper');
  const [rendered, setRendered] = useState<{
    key: string;
    url: string;
    blob: Blob;
  } | null>(null);

  /**
   * The render is tagged with the verse and ground it belongs to and matched
   * during render, so a stale picture is never shown for a new request — no
   * previous verse flashing as the sheet opens, and no old ground lingering
   * for a frame after switching. A mismatch falls through to the skeleton.
   */
  const renderKey = verse ? `${verse.key}:${theme}` : null;
  const current = renderKey && rendered?.key === renderKey ? rendered : null;

  useEffect(() => {
    if (!verse || !renderKey) return;

    let stale = false;
    let objectUrl: string | null = null;

    void (async () => {
      const image = await renderAyahImage({
        text: verse.text,
        surahName,
        surah: verse.surah,
        ayah: verse.ayah,
        reference: toArabicNumerals(`${verse.surah}:${verse.ayah}`),
        theme,
      });

      if (stale || !image) return;
      objectUrl = URL.createObjectURL(image);
      setRendered({ key: renderKey, url: objectUrl, blob: image });
    })();

    return () => {
      stale = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [verse, renderKey, surahName, theme]);

  const shareLink = useCallback(async () => {
    if (!verse) return;

    const url = `${SITE_URL}${ROUTES.surahAyah(verse.surah, verse.ayah)}`;
    const text = formatAyahForSharing({
      text: verse.text,
      surahName,
      surah: verse.surah,
      ayah: verse.ayah,
    });

    if (canShare()) {
      const outcome = await shareContent({
        title: `${surahName} — الآية ${verse.ayah}`,
        text,
        url,
      });
      if (outcome === 'failed') toast('تعذّرت المشاركة', { tone: 'error' });
      if (outcome !== 'unsupported') {
        onClose();
        return;
      }
    }

    const copied = await copyToClipboard(`${text}\n${url}`);
    toast(copied ? 'تم نسخ الآية ورابطها' : 'تعذّرت المشاركة', {
      tone: copied ? 'success' : 'error',
    });
    if (copied) onClose();
  }, [verse, surahName, toast, onClose]);

  const shareImage = useCallback(async () => {
    if (!verse || !current) return;

    const file = new File([current.blob], imageFileName(verse.surah, verse.ayah), {
      type: 'image/png',
    });

    if (canShareFiles([file])) {
      const outcome = await shareContent({
        files: [file],
        title: `${surahName} — الآية ${verse.ayah}`,
      });
      if (outcome === 'failed') toast('تعذّرت المشاركة', { tone: 'error' });
      if (outcome !== 'unsupported') {
        if (outcome === 'shared') onClose();
        return;
      }
    }

    // No file sharing here — saving it is the same outcome by a different road.
    downloadBlob(current.blob, imageFileName(verse.surah, verse.ayah));
    toast('تم حفظ الصورة', { tone: 'success' });
    onClose();
  }, [verse, current, surahName, toast, onClose]);

  return (
    <Modal
      open={verse !== null}
      onClose={onClose}
      title="مشاركة الآية"
      description={verse ? `${surahName} — الآية ${toArabicNumerals(verse.ayah)}` : undefined}
      size="sm"
    >
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-sm font-medium text-ink">الخلفية</span>
          <div className="flex gap-2" role="radiogroup" aria-label="خلفية الصورة">
            {IMAGE_THEMES.map((option) => {
              const selected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(option.id)}
                  className={`flex-1 rounded-sm border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    selected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border text-ink-muted hover:border-border-strong'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          {current ? (
            /* eslint-disable-next-line @next/next/no-img-element -- a canvas
               object URL has no intrinsic remote source for next/image to
               optimise, and its dimensions are fixed and known. */
            <img
              src={current.url}
              alt={`معاينة صورة الآية ${verse?.ayah ?? ''} من ${surahName}`}
              width={1080}
              height={1080}
              className="block w-full"
            />
          ) : (
            <Skeleton className="aspect-square w-full" />
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button iconStart="share" onClick={() => void shareImage()} disabled={!current}>
            مشاركة الصورة
          </Button>
          <Button variant="ghost" iconStart="copy" onClick={() => void shareLink()}>
            النص والرابط
          </Button>
        </div>
      </div>
    </Modal>
  );
}
