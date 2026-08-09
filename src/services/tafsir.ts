import { QURAN_API_BASE, getTafsirEdition } from '@/constants';
import type { Result, Tafsir } from '@/types';

/**
 * Tafsir retrieval from the Quran.com content API.
 *
 * This used to be proxied through our own `/api/tafsir` route, which bought
 * sanitisation, a same-origin CSP and a shared server cache. Two of those
 * survive the move to the browser: the sanitiser below still runs before any
 * upstream text reaches the DOM, and the origin is allow-listed explicitly in
 * `connect-src` rather than trusted wholesale. What is lost is the shared
 * cache, and what is gained is that the application needs no server at all —
 * which is what makes it free to host, permanently.
 *
 * The service worker caches these responses stale-while-revalidate, so a reader
 * who has opened an ayah's tafsir once keeps it, including offline.
 *
 * ⚠ Licensing: the editions offered here are fetched live from a third party
 * and are *not* redistributed by this project. Bundling any of them for offline
 * use is a separate question with a separate answer per edition, and must not
 * be done before the terms of that specific tafsir have been checked.
 * See docs/PRODUCT_AUDIT.md § التراخيص.
 */

const REQUEST_TIMEOUT_MS = 8000;

/** Shape of the upstream payload we depend on. */
type UpstreamTafsir = {
  tafsir?: {
    text?: unknown;
  };
};

/**
 * Converts upstream HTML into plain text.
 *
 * Quran.com returns tafsir with markup, occasionally including anchors and
 * inline styling. Rendering that directly — even through `dangerouslySetInnerHTML`
 * — would be handing a third party an injection channel into our page, so the
 * markup is discarded entirely and only the text survives.
 *
 * This matters more now than it did behind the proxy, not less: the response
 * lands directly in the reader's browser, so this function is the only thing
 * between upstream markup and the DOM.
 */
export function htmlToPlainText(html: string): string {
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
export async function fetchTafsir(
  verseKey: string,
  editionId: number,
  signal?: AbortSignal,
): Promise<Result<Tafsir>> {
  if (!isValidVerseKey(verseKey)) {
    return { ok: false, error: 'مرجع الآية غير صحيح' };
  }

  const edition = getTafsirEdition(editionId);
  const url = `${QURAN_API_BASE}/tafsirs/${edition.id}/by_ayah/${verseKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // A caller that aborts (the dialog closed, or moved to another ayah) must
  // cancel the request too, not just stop listening to it.
  const onAbort = (): void => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
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
      // An abort the caller asked for is not a failure worth reporting; an
      // abort from our own timeout is.
      return signal?.aborted
        ? { ok: false, error: 'تم إلغاء الطلب' }
        : { ok: false, error: 'انتهت مهلة الاتصال بمصدر التفسير' };
    }
    return { ok: false, error: 'تعذّر الاتصال بمصدر التفسير. تحقّق من اتصالك بالإنترنت.' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
