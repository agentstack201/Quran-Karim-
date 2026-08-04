import { describe, expect, it } from 'vitest';
import { searchVerses } from '@/services/search.server';
import { normaliseArabic } from '@/utils/arabic';
import { searchChapters } from '@/services/quran';

describe('searchVerses', () => {
  it('finds a phrase regardless of the diacritics the user typed', () => {
    const bare = searchVerses('الرحمن الرحيم');
    const vocalised = searchVerses('ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');

    expect(bare.total).toBeGreaterThan(0);
    expect(vocalised.total).toBe(bare.total);
    expect(vocalised.results[0]?.key).toBe(bare.results[0]?.key);
  });

  it('tolerates the letter variants users get wrong', () => {
    // Alef maqsura vs ya, ta marbuta vs ha, bare alef vs alef wasla.
    expect(searchVerses('الصلاة').total).toBe(searchVerses('الصلاه').total);
    expect(searchVerses('موسى').total).toBe(searchVerses('موسي').total);
  });

  it('returns verses with fully vocalised display text', () => {
    const response = searchVerses('الرحمن');
    const first = response.results[0];
    expect(first).toBeDefined();
    // The stored display text must be the Uthmani original, not the normalised
    // form used for matching — otherwise results render stripped of tashkeel.
    expect(first?.text).not.toBe(normaliseArabic(first?.text ?? ''));
  });

  it('ranks Surah Ar-Rahman first for its own name', () => {
    const response = searchVerses('الرحمن');
    expect(response.results[0]?.key).toBe('55:1');
  });

  it('searches the English translation for Latin queries', () => {
    const response = searchVerses('Merciful');
    expect(response.total).toBeGreaterThan(0);
    expect(response.results.every((result) => result.matchedIn === 'translation')).toBe(true);
  });

  it('ignores queries shorter than the minimum', () => {
    expect(searchVerses('ا').total).toBe(0);
    expect(searchVerses('').total).toBe(0);
    expect(searchVerses('   ').total).toBe(0);
  });

  it('caps the result set and reports truncation honestly', () => {
    const response = searchVerses('الله', 10);
    expect(response.results).toHaveLength(10);
    expect(response.total).toBeGreaterThan(10);
    expect(response.truncated).toBe(true);
  });

  it('does not report truncation when everything fits', () => {
    const response = searchVerses('ٱلۡقَارِعَةُ');
    expect(response.truncated).toBe(false);
    expect(response.results).toHaveLength(response.total);
  });

  it('breaks score ties in Mus’haf order', () => {
    const response = searchVerses('الحمد لله');
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

  it('attaches a surah name to every hit', () => {
    for (const result of searchVerses('الرحمن').results) {
      expect(result.surahName.length).toBeGreaterThan(0);
      expect(result.key).toBe(`${result.surah}:${result.ayah}`);
    }
  });

  it('returns nothing for a phrase that is not in the Quran', () => {
    expect(searchVerses('زقاقيبمكس').total).toBe(0);
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
