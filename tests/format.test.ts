import { describe, expect, it } from 'vitest';
import { clamp, formatDuration, pluralise, round } from '@/utils/format';
import { buildAyahAudioUrl, getReciter } from '@/constants/reciters';
import { getTafsirEdition } from '@/constants/tafsirs';
import { ROUTES } from '@/constants/routes';

describe('formatDuration', () => {
  it('formats minutes and seconds in Arabic-Indic digits', () => {
    expect(formatDuration(0)).toBe('٠:٠٠');
    expect(formatDuration(9)).toBe('٠:٠٩');
    expect(formatDuration(65)).toBe('١:٠٥');
    expect(formatDuration(600)).toBe('١٠:٠٠');
  });

  it('survives the values a media element actually reports before metadata loads', () => {
    expect(formatDuration(Number.NaN)).toBe('٠:٠٠');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('٠:٠٠');
    expect(formatDuration(-5)).toBe('٠:٠٠');
  });
});

describe('pluralise', () => {
  const forms = { one: 'آية', two: 'آيتان', few: 'آيات', many: 'آية' };

  it('follows Arabic singular, dual, paucal and plural rules', () => {
    expect(pluralise(1, forms)).toBe('آية');
    expect(pluralise(2, forms)).toBe('آيتان');
    expect(pluralise(3, forms)).toBe('آيات');
    expect(pluralise(10, forms)).toBe('آيات');
    expect(pluralise(11, forms)).toBe('آية');
    expect(pluralise(100, forms)).toBe('آية');
    // 103 is paucal again — the rule is on the last two digits, not the value.
    expect(pluralise(103, forms)).toBe('آيات');
  });

  it('treats zero as the plural form', () => {
    expect(pluralise(0, forms)).toBe('آية');
  });
});

describe('clamp and round', () => {
  it('clamps into an inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('rounds away floating-point drift', () => {
    expect(round(0.1 + 0.2)).toBe(0.3);
    expect(round(1.0005, 3)).toBe(1.001);
  });
});

describe('getReciter', () => {
  it('resolves a known reciter', () => {
    expect(getReciter('alafasy').id).toBe('alafasy');
  });

  it('falls back to the default rather than leaving the player unplayable', () => {
    // A stale setting from an older release must not brick playback.
    expect(getReciter('a-reciter-that-was-removed').id).toBe('alafasy');
    expect(getReciter('').id).toBe('alafasy');
  });
});

describe('buildAyahAudioUrl', () => {
  it('zero-pads surah and ayah to three digits', () => {
    const reciter = getReciter('alafasy');
    expect(buildAyahAudioUrl(reciter, 1, 1)).toBe(
      'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
    );
    expect(buildAyahAudioUrl(reciter, 2, 255)).toBe(
      'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
    );
    expect(buildAyahAudioUrl(reciter, 114, 6)).toBe(
      'https://everyayah.com/data/Alafasy_128kbps/114006.mp3',
    );
  });
});

describe('getTafsirEdition', () => {
  it('resolves a known edition', () => {
    expect(getTafsirEdition(16).name).toBe('التفسير الميسر');
  });

  it('falls back to التفسير الميسر for an unknown id', () => {
    expect(getTafsirEdition(99_999).id).toBe(16);
  });
});

describe('ROUTES', () => {
  it('builds reading routes', () => {
    expect(ROUTES.surah(2)).toBe('/surah/2');
    expect(ROUTES.juz(30)).toBe('/juz/30');
    expect(ROUTES.hizb(60)).toBe('/hizb/60');
  });

  it('puts a deep-linked ayah in both the query and the fragment', () => {
    // The query is what the reader reads during render; the fragment is what the
    // browser uses to restore scroll position on a cold load.
    expect(ROUTES.surahAyah(2, 255)).toBe('/surah/2?ayah=255#ayah-255');
  });

  it('encodes search queries', () => {
    expect(ROUTES.searchQuery('الرحمن الرحيم')).toBe(
      '/search?q=%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86%20%D8%A7%D9%84%D8%B1%D8%AD%D9%8A%D9%85',
    );
    expect(ROUTES.searchQuery('a&b=c')).toBe('/search?q=a%26b%3Dc');
  });
});
