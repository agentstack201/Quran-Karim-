import type { Reciter } from '@/types';

/**
 * Curated reciters, served from the EveryAyah archive.
 *
 * EveryAyah exposes one MP3 per ayah at a stable, predictable path:
 *
 *   https://everyayah.com/data/{folder}/{surah:3}{ayah:3}.mp3
 *
 * Per-ayah files — rather than one file per surah — are what make ayah-level
 * next/previous, precise seeking and verse highlighting possible without
 * shipping a timing database.
 *
 * The list is intentionally short and well-known rather than exhaustive: every
 * entry here is a complete, verified Hafs recitation.
 */
export const RECITERS: readonly Reciter[] = [
  {
    id: 'alafasy',
    name: 'مشاري راشد العفاسي',
    nameLatin: 'Mishary Rashid Alafasy',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Alafasy_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'husary',
    name: 'محمود خليل الحصري',
    nameLatin: 'Mahmoud Khalil Al-Husary',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Husary_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'husary-mujawwad',
    name: 'محمود خليل الحصري',
    nameLatin: 'Mahmoud Khalil Al-Husary',
    style: 'مجوّد',
    folder: 'Husary_Mujawwad_64kbps',
    bitrate: '64 kbps',
  },
  {
    id: 'minshawi',
    name: 'محمد صديق المنشاوي',
    nameLatin: 'Mohamed Siddiq Al-Minshawi',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Minshawy_Murattal_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'minshawi-mujawwad',
    name: 'محمد صديق المنشاوي',
    nameLatin: 'Mohamed Siddiq Al-Minshawi',
    style: 'مجوّد',
    folder: 'Minshawy_Mujawwad_192kbps',
    bitrate: '192 kbps',
  },
  {
    id: 'sudais',
    name: 'عبد الرحمن السديس',
    nameLatin: 'Abdurrahmaan As-Sudais',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    bitrate: '192 kbps',
  },
  {
    id: 'shuraim',
    name: 'سعود الشريم',
    nameLatin: 'Saood Ash-Shuraim',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Saood_ash-Shuraym_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'abdulbasit',
    name: 'عبد الباسط عبد الصمد',
    nameLatin: 'Abdul Basit Abdus-Samad',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Abdul_Basit_Murattal_192kbps',
    bitrate: '192 kbps',
  },
  {
    id: 'abdulbasit-mujawwad',
    name: 'عبد الباسط عبد الصمد',
    nameLatin: 'Abdul Basit Abdus-Samad',
    style: 'مجوّد',
    folder: 'Abdul_Basit_Mujawwad_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'ajamy',
    name: 'أحمد بن علي العجمي',
    nameLatin: 'Ahmed ibn Ali Al-Ajamy',
    style: 'مرتل — حفص عن عاصم',
    folder: 'ahmed_ibn_ali_al_ajamy_128kbps',
    bitrate: '128 kbps',
  },
  {
    id: 'ghamdi',
    name: 'سعد الغامدي',
    nameLatin: 'Saad Al-Ghamdi',
    style: 'مرتل — حفص عن عاصم',
    folder: 'Ghamadi_40kbps',
    bitrate: '40 kbps',
  },
  {
    id: 'muaiqly',
    name: 'ماهر المعيقلي',
    nameLatin: 'Maher Al-Muaiqly',
    style: 'مرتل — حفص عن عاصم',
    folder: 'MaherAlMuaiqly128kbps',
    bitrate: '128 kbps',
  },
] as const;

/** Base URL of the per-ayah audio archive. */
export const AUDIO_BASE_URL = 'https://everyayah.com/data';

export const DEFAULT_RECITER_ID = 'alafasy';

/** Playback speeds offered in the player. */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/**
 * Resolves a reciter by id, falling back to the default so the player can never
 * end up in an unplayable state after a stale setting is restored.
 */
export function getReciter(id: string): Reciter {
  const found = RECITERS.find((reciter) => reciter.id === id);
  if (found) return found;
  const fallback = RECITERS.find((reciter) => reciter.id === DEFAULT_RECITER_ID);
  if (!fallback) {
    throw new Error('Reciter list is empty — this is a build-time configuration error');
  }
  return fallback;
}

/** Builds the audio URL for a single ayah. */
export function buildAyahAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  const paddedSurah = String(surah).padStart(3, '0');
  const paddedAyah = String(ayah).padStart(3, '0');
  return `${AUDIO_BASE_URL}/${reciter.folder}/${paddedSurah}${paddedAyah}.mp3`;
}
