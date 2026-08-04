/**
 * LocalStorage access layer.
 *
 * Every read is validated and every call is guarded. Storage throws in more
 * situations than people expect — Safari private browsing, a full quota, or a
 * user who has disabled site data entirely — and none of those should be able
 * to take the reader down. Failures degrade to in-memory behaviour.
 */

/** True when LocalStorage is present and writable. */
let availability: boolean | null = null;

export function isStorageAvailable(): boolean {
  if (availability !== null) return availability;
  if (typeof window === 'undefined') return false;

  try {
    const probe = '__tilawa_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    availability = true;
  } catch {
    availability = false;
  }

  return availability;
}

/**
 * Reads and parses a JSON value.
 *
 * @param validate Optional narrowing function. It receives the parsed JSON as
 *   `unknown` and returns the typed value, or `null` if the stored data is not
 *   usable — corrupted or written by an older version of the app. Returning
 *   `null` makes the caller fall back to its default rather than crash.
 */
export function readStorage<T>(key: string, validate?: (raw: unknown) => T | null): T | null {
  if (!isStorageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (validate) return validate(parsed);
    return parsed as T;
  } catch {
    // Malformed JSON left behind by an interrupted write — clear it so the
    // failure does not repeat on every read.
    removeStorage(key);
    return null;
  }
}

/** Serialises and stores a value. Returns false when the write did not happen. */
export function writeStorage(key: string, value: unknown): boolean {
  if (!isStorageAvailable()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // QuotaExceededError is the realistic failure here. The app keeps working
    // with in-memory state; only persistence is lost.
    console.warn(`[tilawa] Could not persist "${key}"`, error);
    return false;
  }
}

/** Removes a key, ignoring any failure. */
export function removeStorage(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing useful to do — the value simply stays.
  }
}
