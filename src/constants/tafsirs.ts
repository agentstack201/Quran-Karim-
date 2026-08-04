import type { TafsirEdition } from '@/types';

/**
 * Tafsir editions exposed in the ayah dialog.
 *
 * The identifiers are Quran.com API v4 `tafsir` resource ids, resolved through
 * our own `/api/tafsir` route handler so the browser never talks to a
 * third-party origin directly.
 */
export const TAFSIR_EDITIONS: readonly TafsirEdition[] = [
  {
    id: 16,
    name: 'التفسير الميسر',
    author: 'مجمع الملك فهد لطباعة المصحف الشريف',
    language: 'ar',
  },
  {
    id: 14,
    name: 'تفسير الجلالين',
    author: 'جلال الدين المحلي وجلال الدين السيوطي',
    language: 'ar',
  },
  {
    id: 15,
    name: 'تفسير ابن كثير (مختصر)',
    author: 'إسماعيل بن كثير',
    language: 'ar',
  },
  {
    id: 93,
    name: 'التفسير الوسيط',
    author: 'مجمع البحوث الإسلامية بالأزهر',
    language: 'ar',
  },
  {
    id: 169,
    name: 'Tafsir Ibn Kathir (abridged)',
    author: 'Ismail ibn Kathir',
    language: 'en',
  },
] as const;

export const DEFAULT_TAFSIR_ID = 16;

/** Resolves a tafsir edition by id, falling back to التفسير الميسر. */
export function getTafsirEdition(id: number): TafsirEdition {
  const found = TAFSIR_EDITIONS.find((edition) => edition.id === id);
  if (found) return found;
  const fallback = TAFSIR_EDITIONS.find((edition) => edition.id === DEFAULT_TAFSIR_ID);
  if (!fallback) {
    throw new Error('Tafsir edition list is empty — this is a build-time configuration error');
  }
  return fallback;
}

/** Base URL of the upstream Quran content API. */
export const QURAN_API_BASE = 'https://api.quran.com/api/v4';
