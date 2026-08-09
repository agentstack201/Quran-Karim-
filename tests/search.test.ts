import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSearchIndexResident, resetSearchIndex, searchVerses } from '@/services/search';
import { normaliseArabic } from '@/utils/arabic';
import { searchChapters } from '@/services/quran';
import type { SearchResponse } from '@/types';

const PUBLIC_SEARCH_DIR = join(process.cwd(), 'public', 'data', 'search');

/**
 * Serves the real index files over a stubbed `fetch`.
 *
 * The point of these tests is the search itself, so they run against the actual
 * 6236-verse payloads the browser will download rather than a fixture — a
 * fixture would let the index and the code that reads it drift apart, which is
 * precisely the failure the positional scheme is most exposed to.
 */
function stubFetchFromDisk(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const file = url.endsWith('/ar.json')
        ? 'ar.json'
        : url.endsWith('/en.json')
          ? 'en.json'
          : null;

      if (!file) return new Response('not found', { status: 404 });

      return new Response(await readFile(join(PUBLIC_SEARCH_DIR, file), 'utf8'), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

/** Unwraps a successful search, failing the test when it errored. */
async function search(query: string, limit?: number): Promise<SearchResponse> {
  const result = await searchVerses(query, limit);
  if (!result.ok) throw new Error(`search failed: ${result.error}`);
  return result.data;
}

describe('searchVerses', () => {
  beforeEach(() => {
    resetSearchIndex();
    stubFetchFromDisk();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds a phrase regardless of the diacritics the user typed', async () => {
    const bare = await search('الرحمن الرحيم');
    const vocalised = await search('ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');

    expect(bare.total).toBeGreaterThan(0);
    expect(vocalised.total).toBe(bare.total);
    expect(vocalised.results[0]?.key).toBe(bare.results[0]?.key);
  });

  it('tolerates the letter variants users get wrong', async () => {
    // Alef maqsura vs ya, ta marbuta vs ha, bare alef vs alef wasla.
    expect((await search('الصلاة')).total).toBe((await search('الصلاه')).total);
    expect((await search('موسى')).total).toBe((await search('موسي')).total);
  });

  it('returns verses with fully vocalised display text', async () => {
    const first = (await search('الرحمن')).results[0];
    expect(first).toBeDefined();
    // The stored display text must be the Uthmani original, not the normalised
    // form used for matching — otherwise results render stripped of tashkeel.
    expect(first?.text).not.toBe(normaliseArabic(first?.text ?? ''));
  });

  it('ranks Surah Ar-Rahman first for its own name', async () => {
    expect((await search('الرحمن')).results[0]?.key).toBe('55:1');
  });

  it('searches the English translation for Latin queries', async () => {
    const response = await search('Merciful');
    expect(response.total).toBeGreaterThan(0);
    expect(response.results.every((result) => result.matchedIn === 'translation')).toBe(true);
  });

  it('ignores queries shorter than the minimum', async () => {
    expect((await search('ا')).total).toBe(0);
    expect((await search('')).total).toBe(0);
    expect((await search('   ')).total).toBe(0);
  });

  it('caps the result set and reports truncation honestly', async () => {
    const response = await search('الله', 10);
    expect(response.results).toHaveLength(10);
    expect(response.total).toBeGreaterThan(10);
    expect(response.truncated).toBe(true);
  });

  it('does not report truncation when everything fits', async () => {
    const response = await search('ٱلۡقَارِعَةُ');
    expect(response.truncated).toBe(false);
    expect(response.results).toHaveLength(response.total);
  });

  it('breaks score ties in Mus’haf order', async () => {
    const response = await search('الحمد لله');
    const scores = response.results.map((result) => result.score);
    for (let index = 1; index < scores.length; index += 1) {
      const previous = scores[index - 1] ?? 0;
      const current = scores[index] ?? 0;
      expect(previous).toBeGreaterThanOrEqual(current);
      if (previous === current) {
        const before = response.results[index - 1]?.verseId ?? 0;
        const after = response.results[index]?.verseId ?? 0;
        expect(after).toBeGreaterThan(before);
      }
    }
  });

  it('attaches a surah name to every hit', async () => {
    for (const result of (await search('الرحمن')).results) {
      expect(result.surahName.length).toBeGreaterThan(0);
      expect(result.key).toBe(`${result.surah}:${result.ayah}`);
    }
  });

  it('returns nothing for a phrase that is not in the Quran', async () => {
    expect((await search('زقاقيبمكس')).total).toBe(0);
  });

  /**
   * The index identifies a verse by its position alone, so an off-by-one
   * anywhere in the pipeline would silently attribute every ayah to its
   * neighbour. Anchoring on known references catches that immediately.
   */
  it('resolves positional entries to the right surah and ayah', async () => {
    // This phrase opens both Ayat al-Kursi and Al-Imran 2 — a genuine
    // mutashabih pair, and a useful anchor precisely because the two sit
    // hundreds of verses apart. An off-by-one would move one of them.
    const shared = await search('الله لا اله الا هو الحي القيوم');
    const keys = shared.results.map((result) => result.key);
    expect(keys).toContain('2:255');
    expect(keys).toContain('3:2');

    // The very last ayah of the Mus'haf: the end of the positional range,
    // where an off-by-one would either drop it or spill past the index.
    const last = await search('من الجنه والناس');
    expect(last.results.some((result) => result.key === '114:6')).toBe(true);
  });

  it('gives every hit the verse id its position encodes', async () => {
    for (const result of (await search('الرحمن')).results) {
      const [surah, ayah] = result.key.split(':').map(Number);
      expect(result.surah).toBe(surah);
      expect(result.ayah).toBe(ayah);
      expect(result.verseId).toBeGreaterThan(0);
      expect(result.verseId).toBeLessThanOrEqual(6236);
    }
  });

  it('does not download the English column for an Arabic query', async () => {
    await search('الرحمن');

    const requested = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(requested.some((url) => url.endsWith('/ar.json'))).toBe(true);
    expect(requested.some((url) => url.endsWith('/en.json'))).toBe(false);
  });

  it('fetches the index once however many searches run', async () => {
    await Promise.all([search('الرحمن'), search('الحمد'), search('الناس')]);
    await search('الملك');

    const arabicRequests = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) => String(input).endsWith('/ar.json'));

    expect(arabicRequests).toHaveLength(1);
  });

  it('reports an error instead of empty results when the index will not load', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));

    const result = await searchVerses('الرحمن');
    expect(result.ok).toBe(false);
  });

  it('retries a failed index load rather than caching the failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
    expect((await searchVerses('الرحمن')).ok).toBe(false);

    stubFetchFromDisk();
    expect((await searchVerses('الرحمن')).ok).toBe(true);
  });

  it('rejects an index whose schema version it does not understand', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(JSON.stringify({ version: 99, count: 1, n: ['x'], o: ['x'] })),
    );

    const result = await searchVerses('الرحمن');
    expect(result.ok).toBe(false);
  });
});

describe('isSearchIndexResident', () => {
  beforeEach(() => {
    resetSearchIndex();
    stubFetchFromDisk();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false before the first search and true afterwards', async () => {
    expect(isSearchIndexResident()).toBe(false);
    await search('الرحمن');
    expect(isSearchIndexResident()).toBe(true);
  });
});

describe('searchChapters', () => {
  it('matches a surah name without diacritics', () => {
    const results = searchChapters('البقرة', normaliseArabic);
    expect(results[0]?.id).toBe(2);
  });

  it('matches the Latin transliteration and the English meaning', () => {
    expect(searchChapters('Baqarah', normaliseArabic)[0]?.id).toBe(2);
    expect(searchChapters('The Cow', normaliseArabic)[0]?.id).toBe(2);
  });

  it('resolves a bare surah number to exactly that surah', () => {
    const results = searchChapters('36', normaliseArabic);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(36);
  });

  it('ignores out-of-range numbers rather than guessing', () => {
    expect(searchChapters('115', normaliseArabic)).toHaveLength(0);
    expect(searchChapters('0', normaliseArabic)).toHaveLength(0);
  });

  it('returns nothing for an empty query', () => {
    expect(searchChapters('', normaliseArabic)).toHaveLength(0);
    expect(searchChapters('   ', normaliseArabic)).toHaveLength(0);
  });
});
