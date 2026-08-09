'use client';

import { useEffect, useState } from 'react';
import { fetchTafsir } from '@/services/tafsir';
import type { AsyncStatus, Tafsir } from '@/types';

export type TafsirState = {
  readonly status: AsyncStatus;
  readonly tafsir: Tafsir | null;
  readonly error: string | null;
};

/** A completed request, tagged with the identity of what it answered. */
type Snapshot = TafsirState & { readonly requestKey: string };

const IDLE: TafsirState = { status: 'idle', tafsir: null, error: null };
const LOADING: TafsirState = { status: 'loading', tafsir: null, error: null };

/**
 * Loads the tafsir for one ayah.
 *
 * Fetches directly from the upstream content API and sanitises the response in
 * the browser, so the application needs no server of its own. Passing a `null`
 * verse key (the dialog is closed) keeps the hook idle and issues no request.
 *
 * The returned state is *derived* from a tagged snapshot rather than reset
 * through effects: a result only counts once it matches the ayah and edition
 * currently being asked about, so switching ayah shows a loading state
 * immediately instead of briefly displaying the previous ayah's tafsir.
 */
export function useTafsir(verseKey: string | null, editionId: number): TafsirState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const requestKey = verseKey === null ? null : `${verseKey}|${editionId}`;

  useEffect(() => {
    if (verseKey === null || requestKey === null) return;

    const controller = new AbortController();

    const run = async (): Promise<void> => {
      const result = await fetchTafsir(verseKey, editionId, controller.signal);
      // An aborted request belongs to an ayah the reader has already left.
      if (controller.signal.aborted) return;

      setSnapshot(
        result.ok
          ? { requestKey, status: 'success', tafsir: result.data, error: null }
          : { requestKey, status: 'error', tafsir: null, error: result.error },
      );
    };

    void run();

    return () => controller.abort();
  }, [requestKey, verseKey, editionId]);

  if (requestKey === null) return IDLE;
  if (snapshot?.requestKey !== requestKey) return LOADING;

  return { status: snapshot.status, tafsir: snapshot.tafsir, error: snapshot.error };
}
