import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Verse } from '@/types';
import { getHizb, getJuz } from './quran';

/**
 * Build-time verse loading.
 *
 * The reader fetches its verses from the browser so the service worker can keep
 * them permanently offline — but that leaves the first paint with nothing to
 * show, which cost a 0.19 cumulative layout shift and pushed largest contentful
 * paint past 3.5 s as the skeleton was replaced.
 *
 * The fix is to serve the *first screenful* from the server, inside the same
 * static HTML as the page shell. The client fetch still happens and still
 * populates the cache; it simply replaces an already-correct opening with the
 * complete surah, so nothing visible moves.
 *
 * These reads run at build time — every reading route is prerendered — so they
 * never touch the disk in response to a request.
 */

/**
 * How many verses to inline.
 *
 * Chosen to cover the tallest first screen the app can produce: a large phone at
 * the maximum Quranic text size. Ten verses of Al-Baqarah is roughly 6 kB of
 * HTML, which is a fair price for eliminating the shift.
 */
export const INITIAL_VERSE_COUNT = 10;

/** Reads a generated payload from `public/data`. */
async function readPayload<T>(...segments: string[]): Promise<T | null> {
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'data', ...segments), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    // A missing payload must not fail the build; the client fetch will surface
    // a proper error state instead.
    return null;
  }
}

/** The opening verses of a surah. */
export async function getInitialChapterVerses(id: number): Promise<readonly Verse[]> {
  const payload = await readPayload<{ verses: Verse[] }>('surah', `${id}.json`);
  return payload?.verses.slice(0, INITIAL_VERSE_COUNT) ?? [];
}

/** The opening verses of a juz. */
export async function getInitialJuzVerses(id: number): Promise<readonly Verse[]> {
  const payload = await readPayload<{ verses: Verse[] }>('juz', `${id}.json`);
  return payload?.verses.slice(0, INITIAL_VERSE_COUNT) ?? [];
}

/**
 * The opening verses of a hizb, sliced out of its juz payload — the same source
 * the client uses, so the server and client openings are identical.
 */
export async function getInitialHizbVerses(id: number): Promise<readonly Verse[]> {
  const hizb = getHizb(id);
  if (!hizb) return [];

  const payload = await readPayload<{ verses: Verse[] }>('juz', `${hizb.juz}.json`);
  if (!payload) return [];

  return payload.verses
    .filter((verse) => verse.id >= hizb.firstVerseId && verse.id <= hizb.lastVerseId)
    .slice(0, INITIAL_VERSE_COUNT);
}

/** Total verses in a reading range, used to reserve scroll height. */
export function getRangeVerseCount(mode: 'juz' | 'hizb', id: number): number {
  const part = mode === 'juz' ? getJuz(id) : getHizb(id);
  return part?.versesCount ?? 0;
}
