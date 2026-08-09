/**
 * Offline recitation storage.
 * -----------------------------------------------------------------------------
 * Audio used to be excluded from every cache on purpose: recitations were
 * streamed through an `HTMLAudioElement`, which range-requests them, and a full
 * Mus'haf runs to hundreds of megabytes that would have been consumed silently.
 *
 * Both halves of that objection are gone. The playback engine now fetches whole
 * files with `fetch` and decodes them itself, so there are no range requests
 * left to break, and downloads here happen only when a reader asks for them, to
 * a budget they can see and reverse. What is left is the most valuable thing a
 * Quran app can offer: recitation that works on a plane, in a tunnel, in the
 * Haram, on a dead connection.
 */

/**
 * The download cache.
 *
 * Deliberately **not** version-suffixed, unlike every other cache in the app.
 * Those are keyed by build so a deploy can discard them; this one holds content
 * the reader chose to download and waited for, and wiping hundreds of megabytes
 * because a stylesheet changed would be indefensible. Its contents are immutable
 * audio files, so there is nothing a new version could invalidate.
 */
export const AUDIO_CACHE = 'tilawa-audio';

/** Files fetched at once. Enough to saturate a link, few enough to stay polite. */
const CONCURRENCY = 6;

/** Attempts per file before it is given up on. */
const MAX_ATTEMPTS = 3;

/** Base of the exponential backoff between attempts, in milliseconds. */
const RETRY_BASE_MS = 400;

/** One ayah's location in the archive, recovered from a cached URL. */
export type AudioRef = {
  readonly folder: string;
  readonly surah: number;
  readonly ayah: number;
};

/**
 * Recovers which ayah a cached URL holds.
 *
 * The cache itself is the source of truth for what has been downloaded — a
 * parallel record in LocalStorage would drift the first time the browser
 * evicted an entry, and then confidently offer offline audio that is not there.
 *
 * @returns `null` for any URL that is not a recitation file.
 */
export function parseAudioUrl(url: string): AudioRef | null {
  let pathname: string;
  try {
    // Parsed as a URL rather than pattern-matched as a string: on a bare
    // `https://host/002001.mp3` a plain regex reads the *hostname* as the
    // reciter folder, and would then file another origin's audio under a
    // reciter who never recorded it.
    pathname = new URL(url, 'https://tilawa.invalid').pathname;
  } catch {
    return null;
  }

  const match = /^\/(?:.*\/)?([^/]+)\/(\d{3})(\d{3})\.mp3$/.exec(pathname);
  if (!match) return null;

  const [, folder, surahDigits, ayahDigits] = match;
  if (!folder || !surahDigits || !ayahDigits) return null;

  const surah = Number(surahDigits);
  const ayah = Number(ayahDigits);
  if (surah < 1 || surah > 114 || ayah < 1) return null;

  return { folder, surah, ayah };
}

/** True when a URL is a recitation file the download cache may answer for. */
export function isRecitationUrl(url: string): boolean {
  return parseAudioUrl(url) !== null;
}

/** How much of a surah is on the device, per reciter folder. */
export type DownloadIndex = ReadonlyMap<string, ReadonlySet<number>>;

/** Key used to address one surah of one reciter. */
export function downloadKey(folder: string, surah: number): string {
  return `${folder}:${surah}`;
}

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * Reads the whole cache once and reports what it holds.
 *
 * One pass rather than a lookup per surah: 114 separate cache queries to draw
 * an index page would be slower than reading every key a single time.
 */
export async function readDownloadIndex(): Promise<DownloadIndex> {
  const index = new Map<string, Set<number>>();
  if (!cachesAvailable()) return index;

  try {
    const cache = await caches.open(AUDIO_CACHE);
    for (const request of await cache.keys()) {
      const ref = parseAudioUrl(request.url);
      if (!ref) continue;

      const key = downloadKey(ref.folder, ref.surah);
      const ayat = index.get(key);
      if (ayat) ayat.add(ref.ayah);
      else index.set(key, new Set([ref.ayah]));
    }
  } catch {
    // Storage disabled or unavailable — the app simply has no downloads.
  }

  return index;
}

export type DownloadProgress = {
  readonly completed: number;
  readonly total: number;
  /** Bytes fetched in this run; already-cached ayat contribute nothing. */
  readonly bytes: number;
};

export type DownloadOutcome = 'complete' | 'cancelled' | 'offline' | 'failed';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Downloads every ayah of a surah into the cache.
 *
 * Resumable by construction: anything already cached is skipped, so a run that
 * was cancelled, lost the network, or was cut short by a closed tab picks up
 * exactly where it stopped when started again. No progress record is kept
 * anywhere, because the cache already is one.
 */
export async function downloadSurah(input: {
  readonly urls: readonly string[];
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: DownloadProgress) => void;
}): Promise<DownloadOutcome> {
  if (!cachesAvailable()) return 'failed';

  const { urls, signal, onProgress } = input;
  const total = urls.length;

  let cache: Cache;
  try {
    cache = await caches.open(AUDIO_CACHE);
  } catch {
    return 'failed';
  }

  let completed = 0;
  let bytes = 0;
  let outcome: DownloadOutcome = 'complete';
  let cursor = 0;

  const report = (): void => onProgress?.({ completed, total, bytes });

  const fetchOne = async (url: string): Promise<boolean> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) return false;

      try {
        const response = await fetch(url, {
          signal,
          credentials: 'omit',
          mode: 'cors',
          cache: 'no-store',
        });
        if (!response.ok) return false;

        // Measured from the body rather than trusted from a header, so the size
        // shown to the reader is the size actually stored.
        const blob = await response.blob();
        await cache.put(url, new Response(blob, { headers: response.headers }));
        bytes += blob.size;
        return true;
      } catch (error) {
        if (signal?.aborted) return false;
        if (error instanceof DOMException && error.name === 'QuotaExceededError') throw error;
        if (attempt === MAX_ATTEMPTS) return false;
        // Backing off rather than hammering: a link that just failed is the
        // last one that should receive an immediate retry.
        await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
      }
    }
    return false;
  };

  const worker = async (): Promise<void> => {
    while (cursor < urls.length) {
      if (signal?.aborted) return;

      const url = urls[cursor];
      cursor += 1;
      if (!url) continue;

      if (await cache.match(url)) {
        completed += 1;
        report();
        continue;
      }

      const stored = await fetchOne(url);
      if (stored) {
        completed += 1;
      } else if (!signal?.aborted) {
        // A file that failed every attempt is treated as a connectivity
        // problem rather than a missing file: the surah stays resumable, and
        // trying again when the network returns is the right next step.
        outcome = 'offline';
      }
      report();
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'failed';
    return 'failed';
  }

  if (signal?.aborted) return 'cancelled';
  return completed === total ? 'complete' : outcome;
}

/** Removes one surah's audio for one reciter. Returns how many files went. */
export async function deleteSurahAudio(folder: string, surah: number): Promise<number> {
  if (!cachesAvailable()) return 0;

  try {
    const cache = await caches.open(AUDIO_CACHE);
    const doomed = (await cache.keys()).filter((request) => {
      const ref = parseAudioUrl(request.url);
      return ref?.folder === folder && ref.surah === surah;
    });
    await Promise.all(doomed.map((request) => cache.delete(request)));
    return doomed.length;
  } catch {
    return 0;
  }
}

/** Removes every downloaded recitation. */
export async function deleteAllAudio(): Promise<void> {
  if (!cachesAvailable()) return;
  try {
    await caches.delete(AUDIO_CACHE);
  } catch {
    // Nothing to do; the caller re-reads the index either way.
  }
}

export type StorageEstimate = {
  /** Bytes used by everything this origin stores, not only audio. */
  readonly usage: number;
  /** Bytes the browser is willing to grant, or 0 when it will not say. */
  readonly quota: number;
  /** True once the browser has agreed not to evict this origin's data. */
  readonly persisted: boolean;
};

/**
 * Reports real storage use.
 *
 * Read from the browser rather than accumulated by the app: a running total
 * kept in LocalStorage would ignore compression, per-entry overhead and the
 * browser's own evictions, and the number a reader is shown before committing
 * hundreds of megabytes has to be the true one.
 */
export async function readStorageEstimate(): Promise<StorageEstimate> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, persisted: false };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
  } catch {
    return { usage: 0, quota: 0, persisted: false };
  }
}

/**
 * Asks the browser to stop treating this origin's data as disposable.
 *
 * Without it, a downloaded Mus'haf is "best effort" storage that the browser
 * may reclaim under pressure — which would delete exactly the thing the reader
 * downloaded so it would be there when the network was not.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
