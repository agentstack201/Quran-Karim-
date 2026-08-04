import 'server-only';

import { QURAN_API_BASE, getTafsirEdition } from '@/constants';
import type { Result, Tafsir } from '@/types';

/**
 * Tafsir retrieval from the Quran.com content API.
 *
 * Fetched server-side and proxied through our own `/api/tafsir` route, which
 * buys three things: the browser never talks to a third-party origin (so the
 * CSP stays tight), upstream HTML is sanitised before it can reach a client,
 * and Next's data cache absorbs repeat requests for the same ayah across all
 * visitors instead of hitting the upstream every time.
 */

const REQUEST_TIMEOUT_MS = 8000;

/** Revalidation window. Tafsir text is effectively immutable, so this is long. */
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

/** Shape of the upstream payload we depend on. */
type UpstreamTafsir = {
  tafsir?: {
    text?: unknown;
    resource_id?: unknown;
    resource_name?: unknown;
    language_name?: unknown;
  };
};

/**
 * Converts upstream HTML into plain text.
 *
 * Quran.com returns tafsir with markup, occasionally including anchors and
 * inline styling. Rendering that directly — even through `dangerouslySetInnerHTML`
 * — would be handing a third party an injection channel into our page, so the
 * markup is discarded entirely and only the text survives.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3(?:9|4);/g, "'")
    .replace(/&[a-z]+;/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** True for a well-formed `surah:ayah` reference within the Mus'haf. */
export function isValidVerseKey(key: string): boolean {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(key);
  if (!match) return false;
  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  return surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 286;
}

/**
 * Fetches the tafsir for one ayah.
 *
 * Never throws: the caller receives a `Result` and the UI shows a graceful
 * fallback. An unavailable tafsir must never break the ayah dialog, which also
 * carries the translation and verse metadata the reader can still use.
 */
export async function fetchTafsir(verseKey: string, editionId: number): Promise<Result<Tafsir>> {
  if (!isValidVerseKey(verseKey)) {
    return { ok: false, error: 'مرجع الآية غير صحيح' };
  }

  const edition = getTafsirEdition(editionId);
  const url = `${QURAN_API_BASE}/tafsirs/${edition.id}/by_ayah/${verseKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return {
        ok: false,
        error:
          response.status === 404
            ? 'لا يتوفر تفسير لهذه الآية في هذه النسخة'
            : 'تعذّر جلب التفسير من المصدر',
      };
    }

    const payload = (await response.json()) as UpstreamTafsir;
    const rawText = payload.tafsir?.text;

    if (typeof rawText !== 'string' || rawText.trim().length === 0) {
      return { ok: false, error: 'لا يتوفر تفسير لهذه الآية في هذه النسخة' };
    }

    const text = htmlToPlainText(rawText);
    if (text.length === 0) {
      return { ok: false, error: 'لا يتوفر تفسير لهذه الآية في هذه النسخة' };
    }

    return {
      ok: true,
      data: {
        verseKey,
        resourceId: edition.id,
        resourceName: edition.name,
        text,
        languageName: edition.language === 'ar' ? 'العربية' : 'English',
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'انتهت مهلة الاتصال بمصدر التفسير' };
    }
    return { ok: false, error: 'تعذّر الاتصال بمصدر التفسير' };
  } finally {
    clearTimeout(timeout);
  }
}
