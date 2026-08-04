'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES } from '@/constants';
import type { AsyncStatus, Result, Tafsir } from '@/types';

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
 * Fetches through our own `/api/tafsir` route rather than the upstream API, so
 * the response is sanitised, cached and same-origin. Passing a `null` verse key
 * (the dialog is closed) keeps the hook idle and issues no request.
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
      try {
        const response = await fetch(API_ROUTES.tafsir(verseKey, editionId), {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Tafsir request failed: ${response.status}`);

        const payload = (await response.json()) as Result<Tafsir>;

        setSnapshot(
          payload.ok
            ? { requestKey, status: 'success', tafsir: payload.data, error: null }
            : { requestKey, status: 'error', tafsir: null, error: payload.error },
        );
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setSnapshot({
          requestKey,
          status: 'error',
          tafsir: null,
          error: 'تعذّر تحميل التفسير. تحقّق من اتصالك بالإنترنت.',
        });
      }
    };

    void run();

    return () => controller.abort();
  }, [requestKey, verseKey, editionId]);

  if (requestKey === null) return IDLE;
  if (snapshot?.requestKey !== requestKey) return LOADING;

  return { status: snapshot.status, tafsir: snapshot.tafsir, error: snapshot.error };
}
