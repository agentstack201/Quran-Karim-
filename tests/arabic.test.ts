import { describe, expect, it } from 'vitest';
import {
  containsArabic,
  excerpt,
  normaliseArabic,
  parseVerseReference,
  stripDiacritics,
  toArabicNumerals,
} from '@/utils/arabic';

describe('toArabicNumerals', () => {
  it('converts Western digits to Arabic-Indic', () => {
    expect(toArabicNumerals(0)).toBe('٠');
    expect(toArabicNumerals(255)).toBe('٢٥٥');
    expect(toArabicNumerals(6236)).toBe('٦٢٣٦');
  });

  it('leaves non-digit characters untouched', () => {
    expect(toArabicNumerals('2:255')).toBe('٢:٢٥٥');
    expect(toArabicNumerals('1.5')).toBe('١.٥');
  });
});

describe('normaliseArabic', () => {
  it('strips every diacritic form', () => {
    // The Basmalah, fully vocalised, reduces to its bare consonantal skeleton.
    expect(normaliseArabic('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ')).toBe(
      'بسم الله الرحمن الرحيم',
    );
  });

  it('unifies the alef forms users type inconsistently', () => {
    const expected = 'ا';
    for (const variant of ['آ', 'أ', 'إ', 'ٱ']) {
      expect(normaliseArabic(variant)).toBe(expected);
    }
  });

  it('unifies alef maqsura, ta marbuta and hamza carriers', () => {
    expect(normaliseArabic('على')).toBe('علي');
    expect(normaliseArabic('رحمة')).toBe('رحمه');
    expect(normaliseArabic('مؤمن')).toBe('مومن');
    expect(normaliseArabic('قائم')).toBe('قايم');
  });

  it('removes tatweel and collapses whitespace', () => {
    expect(normaliseArabic('الرحـــمن')).toBe('الرحمن');
    expect(normaliseArabic('  الله   أكبر  ')).toBe('الله اكبر');
  });

  it('makes a vocalised query match its unvocalised form — the whole point', () => {
    expect(normaliseArabic('ٱلرَّحۡمَٰنِ')).toBe(normaliseArabic('الرحمن'));
  });

  it('folds Uthmani orthography onto its modern spelling', () => {
    // The Uthmani script writes a family of words with a waw or an alef maqsura
    // carrying a superscript alef, where modern orthography has a plain alef.
    // Without folding, a reader searching for "الصلاة" finds nothing at all.
    expect(normaliseArabic('ٱلصَّلَوٰةَ')).toBe(normaliseArabic('الصلاة'));
    expect(normaliseArabic('ٱلزَّكَوٰةَ')).toBe(normaliseArabic('الزكاة'));
    expect(normaliseArabic('ٱلۡحَيَوٰةِ')).toBe(normaliseArabic('الحياة'));
    expect(normaliseArabic('ٱلتَّوۡرَىٰةَ')).toBe(normaliseArabic('التوراة'));
    expect(normaliseArabic('مِشۡكَىٰةٍ')).toBe(normaliseArabic('مشكاة'));
  });

  it('leaves a word-final alef maqsura alone', () => {
    // عَلَىٰ, مُوسَىٰ and their kind keep ى in modern spelling, so the folding
    // rule must not reach them — it is gated on a following ta marbuta.
    expect(normaliseArabic('عَلَىٰ')).toBe(normaliseArabic('على'));
    expect(normaliseArabic('مُوسَىٰ')).toBe(normaliseArabic('موسى'));
    expect(normaliseArabic('عَلَىٰ')).not.toContain('ا');
  });

  it('still deletes a bare superscript alef', () => {
    // ٱلرَّحۡمَٰن is written الرحمن, not الرحمان.
    expect(normaliseArabic('ٱلرَّحۡمَٰنِ')).toBe('الرحمن');
  });

  it('is idempotent', () => {
    const once = normaliseArabic('ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
    expect(normaliseArabic(once)).toBe(once);
  });
});

describe('stripDiacritics', () => {
  it('removes marks without unifying letter forms', () => {
    // Unlike normaliseArabic, the alef wasla survives — this is for display.
    expect(stripDiacritics('ٱلرَّحۡمَٰنِ')).toBe('ٱلرحمن');
  });
});

describe('containsArabic', () => {
  it('detects Arabic script', () => {
    expect(containsArabic('الرحمن')).toBe(true);
    expect(containsArabic('mercy الرحمن')).toBe(true);
  });

  it('rejects Latin-only input', () => {
    expect(containsArabic('mercy')).toBe(false);
    expect(containsArabic('2:255')).toBe(false);
  });
});

describe('parseVerseReference', () => {
  it('accepts the separators users actually type', () => {
    const expected = { surah: 2, ayah: 255 };
    expect(parseVerseReference('2:255')).toEqual(expected);
    expect(parseVerseReference('2 255')).toEqual(expected);
    expect(parseVerseReference('2-255')).toEqual(expected);
    expect(parseVerseReference('  2 : 255  ')).toEqual(expected);
  });

  it('accepts Arabic-Indic digits', () => {
    expect(parseVerseReference('٢:٢٥٥')).toEqual({ surah: 2, ayah: 255 });
  });

  it('rejects out-of-range surah numbers', () => {
    expect(parseVerseReference('0:1')).toBeNull();
    expect(parseVerseReference('115:1')).toBeNull();
  });

  it('rejects anything that is not a reference', () => {
    expect(parseVerseReference('الرحمن')).toBeNull();
    expect(parseVerseReference('2')).toBeNull();
    expect(parseVerseReference('2:255:3')).toBeNull();
    expect(parseVerseReference('')).toBeNull();
  });
});

describe('excerpt', () => {
  it('returns short text unchanged', () => {
    expect(excerpt('قل هو الله أحد', 90)).toBe('قل هو الله أحد');
  });

  it('cuts on a word boundary and appends an ellipsis', () => {
    const result = excerpt('الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين', 20);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    // Never cuts mid-word.
    expect(result.slice(0, -1).trimEnd().split(' ').at(-1)).not.toBe('العالمي');
  });

  it('falls back to a hard cut when there is no usable space', () => {
    const result = excerpt('ا'.repeat(50), 10);
    expect(result).toBe(`${'ا'.repeat(10)}…`);
  });
});
