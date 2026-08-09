import { describe, expect, it } from 'vitest';
import { AUDIO_BASE_URL, RECITERS, buildAyahAudioUrl, getReciterByFolder } from '@/constants';
import { downloadKey, isRecitationUrl, parseAudioUrl } from '@/services/audio-cache';
import { formatBytes } from '@/utils';

const ALAFASY = RECITERS[0]!;

describe('parseAudioUrl', () => {
  /**
   * The cache is the record of what has been downloaded, so reading an entry
   * back has to agree exactly with how it was written. Round-tripping through
   * the real URL builder is what keeps the two from drifting apart.
   */
  it('round-trips every reciter with the URL builder', () => {
    for (const reciter of RECITERS) {
      const url = buildAyahAudioUrl(reciter, 18, 110);
      expect(parseAudioUrl(url)).toEqual({ folder: reciter.folder, surah: 18, ayah: 110 });
    }
  });

  it('reads the zero-padded surah and ayah correctly', () => {
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/001001.mp3`)).toEqual({
      folder: ALAFASY.folder,
      surah: 1,
      ayah: 1,
    });
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/114006.mp3`)).toEqual({
      folder: ALAFASY.folder,
      surah: 114,
      ayah: 6,
    });
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/002286.mp3`)).toEqual({
      folder: ALAFASY.folder,
      surah: 2,
      ayah: 286,
    });
  });

  /**
   * The service worker decides whether to answer a request from the download
   * cache using this shape, so anything that is not a recitation must be
   * rejected — a false positive would route an unrelated request into an
   * audio-only cache and break it.
   */
  it('rejects anything that is not a recitation file', () => {
    const rejected = [
      '/data/surah/2.json',
      '/icons/icon-512.png',
      'https://everyayah.com/data/Alafasy_128kbps/002.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/00201.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/0020011.mp3',
      'https://everyayah.com/data/Alafasy_128kbps/002001.ogg',
      'https://example.com/002001.mp3',
    ];

    for (const url of rejected) {
      expect(parseAudioUrl(url), url).toBeNull();
      expect(isRecitationUrl(url), url).toBe(false);
    }
  });

  it('rejects surah numbers outside the Mus’haf', () => {
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/000001.mp3`)).toBeNull();
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/115001.mp3`)).toBeNull();
    expect(parseAudioUrl(`${AUDIO_BASE_URL}/${ALAFASY.folder}/001000.mp3`)).toBeNull();
  });

  it('keeps reciters apart when they share a surah', () => {
    const first = parseAudioUrl(buildAyahAudioUrl(RECITERS[0]!, 1, 1));
    const second = parseAudioUrl(buildAyahAudioUrl(RECITERS[1]!, 1, 1));

    expect(first?.folder).not.toBe(second?.folder);
    expect(downloadKey(first!.folder, first!.surah)).not.toBe(
      downloadKey(second!.folder, second!.surah),
    );
  });
});

describe('getReciterByFolder', () => {
  it('resolves every catalogued folder', () => {
    for (const reciter of RECITERS) {
      expect(getReciterByFolder(reciter.folder)?.id).toBe(reciter.id);
    }
  });

  /**
   * No fallback: naming the wrong reciter over someone else's downloaded files
   * is worse than showing the raw folder.
   */
  it('returns null for an unknown folder rather than guessing', () => {
    expect(getReciterByFolder('Someone_Else_128kbps')).toBeNull();
  });
});

describe('formatBytes', () => {
  it('scales through the binary units', () => {
    expect(formatBytes(512)).toBe('٥١٢ ب');
    expect(formatBytes(1024)).toBe('١٫٠ ك.ب');
    expect(formatBytes(1024 * 1024)).toBe('١٫٠ م.ب');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('١٫٠٠ ج.ب');
  });

  it('keeps two decimals at gigabyte scale, where the difference matters', () => {
    expect(formatBytes(1.25 * 1024 * 1024 * 1024)).toBe('١٫٢٥ ج.ب');
  });

  it('handles nothing and nonsense without producing NaN', () => {
    expect(formatBytes(0)).toBe('٠ ب');
    expect(formatBytes(-1)).toBe('٠ ب');
    expect(formatBytes(Number.NaN)).toBe('٠ ب');
  });
});
