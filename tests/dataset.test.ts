import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOTAL_CHAPTERS, TOTAL_HIZB, TOTAL_JUZ, TOTAL_PAGES, TOTAL_VERSES } from '@/constants';
import {
  CHAPTERS,
  HIZB_LIST,
  JUZ_LIST,
  PAGE_LIST,
  getChapterByVerseId,
  getDailyVerseId,
  getPage,
} from '@/services/quran';

/**
 * Dataset integrity.
 *
 * These are the highest-value tests in the project. The generator asserts these
 * invariants at build time, but the generated files are committed — so if one is
 * ever hand-edited, corrupted by a bad merge, or truncated by a failed write,
 * this suite is what catches it before a reader sees a broken Mus'haf.
 */

describe('chapters', () => {
  it('contains all 114 surahs in Mus’haf order', () => {
    expect(CHAPTERS).toHaveLength(TOTAL_CHAPTERS);
    CHAPTERS.forEach((chapter, index) => {
      expect(chapter.id).toBe(index + 1);
    });
  });

  it('accounts for exactly 6236 verses', () => {
    const total = CHAPTERS.reduce((sum, chapter) => sum + chapter.versesCount, 0);
    expect(total).toBe(TOTAL_VERSES);
  });

  it('has contiguous, non-overlapping global verse ids', () => {
    let expectedFirst = 1;
    for (const chapter of CHAPTERS) {
      expect(chapter.firstVerseId).toBe(expectedFirst);
      expect(chapter.lastVerseId).toBe(expectedFirst + chapter.versesCount - 1);
      expectedFirst = chapter.lastVerseId + 1;
    }
    expect(expectedFirst - 1).toBe(TOTAL_VERSES);
  });

  it('records the Basmalah only where it belongs', () => {
    // Al-Fatihah counts it as ayah 1; At-Tawbah has none.
    for (const chapter of CHAPTERS) {
      const expected = chapter.id !== 1 && chapter.id !== 9;
      expect(chapter.hasBasmalah).toBe(expected);
    }
  });

  it('assigns each surah a unique revelation order', () => {
    const orders = new Set(CHAPTERS.map((chapter) => chapter.revelationOrder));
    expect(orders.size).toBe(TOTAL_CHAPTERS);
  });

  it('holds well-known reference values', () => {
    const baqarah = CHAPTERS.find((chapter) => chapter.id === 2);
    expect(baqarah?.versesCount).toBe(286);
    expect(baqarah?.revelation).toBe('medinan');

    const nas = CHAPTERS.find((chapter) => chapter.id === 114);
    expect(nas?.versesCount).toBe(6);
    expect(nas?.lastVerseId).toBe(TOTAL_VERSES);
  });
});

describe('juz', () => {
  it('contains 30 parts spanning the whole Mus’haf', () => {
    expect(JUZ_LIST).toHaveLength(TOTAL_JUZ);
    expect(JUZ_LIST[0]?.firstVerseId).toBe(1);
    expect(JUZ_LIST.at(-1)?.lastVerseId).toBe(TOTAL_VERSES);
  });

  it('has no gaps or overlaps', () => {
    for (let index = 1; index < JUZ_LIST.length; index += 1) {
      const previous = JUZ_LIST[index - 1];
      const current = JUZ_LIST[index];
      expect(current?.firstVerseId).toBe((previous?.lastVerseId ?? 0) + 1);
    }
  });

  it('reports a verse count matching its own boundaries', () => {
    for (const juz of JUZ_LIST) {
      expect(juz.versesCount).toBe(juz.lastVerseId - juz.firstVerseId + 1);
    }
  });

  it('starts juz 30 at An-Naba', () => {
    const last = JUZ_LIST.at(-1);
    expect(last?.start).toEqual({ surah: 78, ayah: 1 });
    expect(last?.end).toEqual({ surah: 114, ayah: 6 });
  });
});

describe('hizb', () => {
  it('contains 60 parts spanning the whole Mus’haf', () => {
    expect(HIZB_LIST).toHaveLength(TOTAL_HIZB);
    expect(HIZB_LIST[0]?.firstVerseId).toBe(1);
    expect(HIZB_LIST.at(-1)?.lastVerseId).toBe(TOTAL_VERSES);
  });

  it('has no gaps or overlaps', () => {
    for (let index = 1; index < HIZB_LIST.length; index += 1) {
      const previous = HIZB_LIST[index - 1];
      const current = HIZB_LIST[index];
      expect(current?.firstVerseId).toBe((previous?.lastVerseId ?? 0) + 1);
    }
  });

  it('nests exactly two hizb inside every juz', () => {
    for (const juz of JUZ_LIST) {
      const contained = HIZB_LIST.filter(
        (hizb) => hizb.firstVerseId >= juz.firstVerseId && hizb.lastVerseId <= juz.lastVerseId,
      );
      expect(contained).toHaveLength(2);
      expect(juz.hizbs).toEqual(contained.map((hizb) => hizb.id));
    }
  });

  it('assigns every hizb to the juz that actually contains it', () => {
    // The reader serves a hizb from its juz payload, so this relationship is
    // load-bearing, not merely descriptive.
    for (const hizb of HIZB_LIST) {
      const juz = JUZ_LIST.find((item) => item.id === hizb.juz);
      expect(juz).toBeDefined();
      expect(hizb.firstVerseId).toBeGreaterThanOrEqual(juz?.firstVerseId ?? 0);
      expect(hizb.lastVerseId).toBeLessThanOrEqual(juz?.lastVerseId ?? 0);
    }
  });
});

describe('getChapterByVerseId', () => {
  it('resolves the boundaries of every surah', () => {
    for (const chapter of CHAPTERS) {
      expect(getChapterByVerseId(chapter.firstVerseId)?.id).toBe(chapter.id);
      expect(getChapterByVerseId(chapter.lastVerseId)?.id).toBe(chapter.id);
    }
  });

  it('returns null outside the Mus’haf', () => {
    expect(getChapterByVerseId(0)).toBeNull();
    expect(getChapterByVerseId(TOTAL_VERSES + 1)).toBeNull();
  });
});

describe('getDailyVerseId', () => {
  it('always lands inside the Mus’haf', () => {
    // A year of days, to catch any modulo or sign error in the hash.
    for (let offset = 0; offset < 400; offset += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + offset));
      const id = getDailyVerseId(date);
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(TOTAL_VERSES);
    }
  });

  it('is stable for a given day and varies between days', () => {
    const day = new Date(Date.UTC(2026, 7, 4));
    expect(getDailyVerseId(day)).toBe(getDailyVerseId(new Date(Date.UTC(2026, 7, 4))));
    expect(getDailyVerseId(day)).not.toBe(getDailyVerseId(new Date(Date.UTC(2026, 7, 5))));
  });

  it('spreads across the Mus’haf rather than walking through it', () => {
    const ids = Array.from({ length: 60 }, (_, offset) =>
      getDailyVerseId(new Date(Date.UTC(2026, 0, 1 + offset))),
    );
    expect(new Set(ids).size).toBe(ids.length);

    // Consecutive days should not land in the same neighbourhood.
    const adjacentJumps = ids.slice(1).map((id, index) => Math.abs(id - (ids[index] ?? 0)));
    expect(Math.min(...adjacentJumps)).toBeGreaterThan(50);
  });
});

describe('generated surah payloads', () => {
  const readSurah = (id: number): { chapter: { id: number }; verses: unknown[] } =>
    JSON.parse(readFileSync(`public/data/surah/${id}.json`, 'utf8'));

  it('ships one payload per surah with the right verse count', () => {
    for (const chapter of CHAPTERS) {
      const payload = readSurah(chapter.id);
      expect(payload.chapter.id).toBe(chapter.id);
      expect(payload.verses).toHaveLength(chapter.versesCount);
    }
  });

  it('gives every verse a key, Uthmani text and a translation', () => {
    for (const id of [1, 2, 18, 55, 112, 114]) {
      const payload = readSurah(id);
      for (const verse of payload.verses as Record<string, unknown>[]) {
        expect(typeof verse.key).toBe('string');
        expect((verse.text as string).length).toBeGreaterThan(0);
        expect((verse.translation as string).length).toBeGreaterThan(0);
        expect(verse.juz).toBeGreaterThanOrEqual(1);
        expect(verse.juz).toBeLessThanOrEqual(TOTAL_JUZ);
      }
    }
  });
});

describe('generated juz payloads', () => {
  it('ships one payload per juz carrying exactly its own verses', () => {
    for (const juz of JUZ_LIST) {
      const payload = JSON.parse(readFileSync(`public/data/juz/${juz.id}.json`, 'utf8')) as {
        verses: { id: number }[];
      };
      expect(payload.verses).toHaveLength(juz.versesCount);
      expect(payload.verses[0]?.id).toBe(juz.firstVerseId);
      expect(payload.verses.at(-1)?.id).toBe(juz.lastVerseId);
    }
  });
});

describe('pages', () => {
  it('contains all 604 pages of the Madani Mus’haf in order', () => {
    expect(PAGE_LIST).toHaveLength(TOTAL_PAGES);
    PAGE_LIST.forEach((page, index) => {
      expect(page.id).toBe(index + 1);
    });
  });

  /**
   * Pages partition the Mus'haf: every verse sits on exactly one, with no gap
   * and no overlap. A single off-by-one here would silently drop an ayah from
   * the reader, which is the one failure this project cannot ship.
   */
  it('partitions all 6236 verses with no gap or overlap', () => {
    let expectedFirst = 1;
    let covered = 0;

    for (const page of PAGE_LIST) {
      expect(page.firstVerseId).toBe(expectedFirst);
      expect(page.lastVerseId).toBe(expectedFirst + page.versesCount - 1);
      expectedFirst = page.lastVerseId + 1;
      covered += page.versesCount;
    }

    expect(covered).toBe(TOTAL_VERSES);
    expect(PAGE_LIST[TOTAL_PAGES - 1]?.lastVerseId).toBe(TOTAL_VERSES);
  });

  it('agrees with each surah’s recorded page span', () => {
    for (const chapter of CHAPTERS) {
      const opening = PAGE_LIST.find(
        (page) =>
          page.firstVerseId <= chapter.firstVerseId && page.lastVerseId >= chapter.firstVerseId,
      );
      const closing = PAGE_LIST.find(
        (page) =>
          page.firstVerseId <= chapter.lastVerseId && page.lastVerseId >= chapter.lastVerseId,
      );

      expect(opening?.id, `surah ${chapter.id} opening page`).toBe(chapter.startPage);
      expect(closing?.id, `surah ${chapter.id} closing page`).toBe(chapter.endPage);
    }
  });

  it('lists every surah that actually appears on the page', () => {
    for (const page of PAGE_LIST) {
      expect(page.surahs.length).toBeGreaterThan(0);
      expect(page.surahs[0]).toBe(page.start.surah);
      expect(page.surahs[page.surahs.length - 1]).toBe(page.end.surah);

      // Recorded in reading order, never repeated.
      expect([...page.surahs].sort((a, b) => a - b)).toEqual([...page.surahs]);
      expect(new Set(page.surahs).size).toBe(page.surahs.length);
    }
  });

  /**
   * A page is read by filtering the juz payload it lives in, so the payloads it
   * names have to be the ones that actually hold its verses — otherwise the
   * page renders short, and only for the four pages that straddle a boundary.
   */
  it('names every juz payload needed to assemble the page', () => {
    for (const page of PAGE_LIST) {
      expect(page.juz.length).toBeGreaterThan(0);

      const spanned = JUZ_LIST.filter(
        (juz) => juz.firstVerseId <= page.lastVerseId && juz.lastVerseId >= page.firstVerseId,
      ).map((juz) => juz.id);

      expect(page.juz, `page ${page.id}`).toEqual(spanned);
    }
  });

  it('resolves a page by number and rejects one outside the Mus’haf', () => {
    expect(getPage(1)?.firstVerseId).toBe(1);
    expect(getPage(TOTAL_PAGES)?.lastVerseId).toBe(TOTAL_VERSES);
    expect(getPage(0)).toBeNull();
    expect(getPage(TOTAL_PAGES + 1)).toBeNull();
  });

  it('opens on Al-Fatihah and closes on An-Nas', () => {
    expect(PAGE_LIST[0]?.start).toEqual({ surah: 1, ayah: 1 });
    expect(PAGE_LIST[TOTAL_PAGES - 1]?.end).toEqual({ surah: 114, ayah: 6 });
  });
});
