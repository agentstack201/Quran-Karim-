/**
 * Arabic text utilities.
 *
 * Search in Arabic is only usable if the query and the corpus are normalised the
 * same way: users type without diacritics, with a plain alef, and often with a
 * final ha instead of ta marbuta. The normaliser here is the runtime twin of the
 * one in `scripts/generate-quran-data.mjs` — the two must stay identical or the
 * pre-built search index will stop matching.
 */

/** Arabic-Indic digits, indexed by their Western equivalent. */
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

/**
 * Combining marks to strip:
 *  U+0610–U+061A  Quranic annotation signs
 *  U+064B–U+065F  tanwin, harakat, sukun, superscript alef
 *  U+0670         superscript alef
 *  U+06D6–U+06ED  small high/low Quranic marks and pause signs
 *  U+08D3–U+08FF  extended Arabic marks
 */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g;

const TATWEEL = /ـ/g;

/** Converts Western digits in a string to Arabic-Indic digits. */
export function toArabicNumerals(value: number | string): string {
  return String(value)
    .split('')
    .map((char) => {
      const digit = Number(char);
      return Number.isNaN(digit) ? char : (ARABIC_DIGITS[digit] ?? char);
    })
    .join('');
}

/**
 * Normalises Arabic text for comparison: removes diacritics and tatweel, then
 * unifies the letter forms users type inconsistently.
 */
export function normaliseArabic(text: string): string {
  return text
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(/[آأإٱٲٳ]/g, 'ا') // alef forms → ا
    .replace(/ى/g, 'ي') // alef maqsura → ي
    .replace(/ة/g, 'ه') // ta marbuta → ه
    .replace(/ؤ/g, 'و') // waw hamza → و
    .replace(/ئ/g, 'ي') // ya hamza → ي
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strips diacritics without unifying letter forms — for display, not matching. */
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, '').replace(TATWEEL, '');
}

/** True when the string contains at least one Arabic letter. */
export function containsArabic(text: string): boolean {
  return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text);
}

/**
 * Parses a verse reference typed by the user.
 * Accepts "2:255", "2 255", "٢:٢٥٥" and "2-255".
 * Returns `null` when the input is not a reference.
 */
export function parseVerseReference(input: string): { surah: number; ayah: number } | null {
  const western = input.replace(/[٠-٩]/g, (char) => String(ARABIC_DIGITS.indexOf(char as never)));
  const match = /^\s*(\d{1,3})\s*[:\-\s]\s*(\d{1,3})\s*$/.exec(western);
  if (!match) return null;

  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if (surah < 1 || surah > 114 || ayah < 1) return null;

  return { surah, ayah };
}

/**
 * Builds a short excerpt from an ayah, cutting on a word boundary so the text
 * never breaks mid-word.
 */
export function excerpt(text: string, maxLength = 90): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
