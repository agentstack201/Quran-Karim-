'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildAyahAudioUrl, getReciter, getReciterByFolder } from '@/constants';
import { useSettings } from '@/features/settings/SettingsProvider';
import { getChapter } from '@/services/quran';
import {
  deleteAllAudio,
  deleteSurahAudio,
  downloadKey,
  downloadSurah,
  readDownloadIndex,
  readStorageEstimate,
  requestPersistentStorage,
  type DownloadIndex,
  type StorageEstimate,
} from '@/services/audio-cache';

/** A download in flight, or one waiting for the network to return. */
export type ActiveDownload = {
  readonly surah: number;
  readonly completed: number;
  readonly total: number;
  readonly bytes: number;
  /** Set when the run stopped short and is waiting to be resumed. */
  readonly stalled: boolean;
};

/** One reciter's copy of one surah, as stored. */
export type StoredSurah = {
  readonly surah: number;
  readonly folder: string;
  readonly reciterName: string;
  readonly surahName: string;
  readonly ayat: number;
  readonly totalAyat: number;
};

type DownloadsContextValue = {
  readonly ready: boolean;
  /** Ayat stored for the active reciter, keyed by surah. */
  readonly downloadedAyat: (surah: number) => number;
  readonly active: (surah: number) => ActiveDownload | null;
  readonly stored: readonly StoredSurah[];
  readonly storage: StorageEstimate;
  readonly start: (surah: number) => void;
  readonly cancel: (surah: number) => void;
  readonly remove: (surah: number, folder?: string) => Promise<void>;
  readonly removeAll: () => Promise<void>;
  readonly refresh: () => Promise<void>;
};

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

/**
 * Downloaded recitations.
 *
 * The cache is the single source of truth — this provider reads it, never
 * duplicates it. A parallel ledger in LocalStorage would drift the first time
 * the browser evicted an entry and then promise offline audio that had already
 * been reclaimed.
 */
export function DownloadsProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const { settings } = useSettings();
  const folder = getReciter(settings.reciterId).folder;

  const [index, setIndex] = useState<DownloadIndex>(() => new Map());
  const [storage, setStorage] = useState<StorageEstimate>({
    usage: 0,
    quota: 0,
    persisted: false,
  });
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<ReadonlyMap<number, ActiveDownload>>(() => new Map());

  const controllers = useRef(new Map<number, AbortController>());
  /** Surahs whose run ended early, retried once the network returns. */
  const stalled = useRef(new Set<number>());

  const refresh = useCallback(async (): Promise<void> => {
    const [nextIndex, nextStorage] = await Promise.all([
      readDownloadIndex(),
      readStorageEstimate(),
    ]);
    setIndex(nextIndex);
    setStorage(nextStorage);
    setReady(true);
  }, []);

  // Read once on mount, and again whenever the tab is returned to: a download
  // started in another tab, or storage reclaimed by the browser while this one
  // sat in the background, would otherwise be reported as still present.
  useEffect(() => {
    const sync = (): void => {
      void (async () => {
        await refresh();
      })();
    };

    sync();
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [refresh]);

  const downloadedAyat = useCallback(
    (surah: number): number => index.get(downloadKey(folder, surah))?.size ?? 0,
    [index, folder],
  );

  const start = useCallback(
    (surah: number) => {
      const chapter = getChapter(surah);
      if (!chapter || controllers.current.has(surah)) return;

      const reciter = getReciter(settings.reciterId);
      const urls = Array.from({ length: chapter.versesCount }, (_, position) =>
        buildAyahAudioUrl(reciter, surah, position + 1),
      );

      const controller = new AbortController();
      controllers.current.set(surah, controller);
      stalled.current.delete(surah);

      setActive((current) =>
        new Map(current).set(surah, {
          surah,
          completed: 0,
          total: urls.length,
          bytes: 0,
          stalled: false,
        }),
      );

      void (async () => {
        // Asked for before the first byte lands, while the reader's intent is
        // unambiguous: they just chose to spend storage, which is exactly the
        // moment a browser will grant a persistence request.
        void requestPersistentStorage();

        const outcome = await downloadSurah({
          urls,
          signal: controller.signal,
          onProgress: (progress) => {
            setActive((current) =>
              new Map(current).set(surah, {
                surah,
                completed: progress.completed,
                total: progress.total,
                bytes: progress.bytes,
                stalled: false,
              }),
            );
          },
        });

        controllers.current.delete(surah);
        if (outcome === 'offline' || outcome === 'failed') stalled.current.add(surah);

        if (outcome === 'offline' || outcome === 'failed') {
          setActive((current) => {
            const next = new Map(current);
            const entry = next.get(surah);
            if (entry) next.set(surah, { ...entry, stalled: true });
            return next;
          });
        } else {
          setActive((current) => {
            const next = new Map(current);
            next.delete(surah);
            return next;
          });
        }

        await refresh();
      })();
    },
    [settings.reciterId, refresh],
  );

  const cancel = useCallback((surah: number) => {
    controllers.current.get(surah)?.abort();
    controllers.current.delete(surah);
    stalled.current.delete(surah);
    setActive((current) => {
      const next = new Map(current);
      next.delete(surah);
      return next;
    });
  }, []);

  /**
   * Resumes anything the network interrupted.
   *
   * Resuming is free: the download skips whatever is already cached, so this
   * picks up precisely where the connection dropped.
   */
  useEffect(() => {
    const onOnline = (): void => {
      for (const surah of [...stalled.current]) start(surah);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [start]);

  // Abandoning the page must not leave fetches running against a dead tree.
  useEffect(() => {
    const running = controllers.current;
    return () => {
      for (const controller of running.values()) controller.abort();
      running.clear();
    };
  }, []);

  const remove = useCallback(
    async (surah: number, from?: string): Promise<void> => {
      cancel(surah);
      await deleteSurahAudio(from ?? folder, surah);
      await refresh();
    },
    [cancel, folder, refresh],
  );

  const removeAll = useCallback(async (): Promise<void> => {
    for (const controller of controllers.current.values()) controller.abort();
    controllers.current.clear();
    stalled.current.clear();
    setActive(new Map());
    await deleteAllAudio();
    await refresh();
  }, [refresh]);

  /** Everything on the device, across every reciter — not just the active one. */
  const stored = useMemo<readonly StoredSurah[]>(() => {
    const rows: StoredSurah[] = [];

    for (const [key, ayat] of index) {
      const separator = key.lastIndexOf(':');
      const storedFolder = key.slice(0, separator);
      const surah = Number(key.slice(separator + 1));
      const chapter = getChapter(surah);
      if (!chapter) continue;

      const reciter = getReciterByFolder(storedFolder);
      rows.push({
        surah,
        folder: storedFolder,
        reciterName: reciter?.name ?? storedFolder,
        surahName: chapter.name,
        ayat: ayat.size,
        totalAyat: chapter.versesCount,
      });
    }

    return rows.sort((a, b) => a.surah - b.surah || a.folder.localeCompare(b.folder));
  }, [index]);

  const value = useMemo<DownloadsContextValue>(
    () => ({
      ready,
      downloadedAyat,
      active: (surah: number) => active.get(surah) ?? null,
      stored,
      storage,
      start,
      cancel,
      remove,
      removeAll,
      refresh,
    }),
    [ready, downloadedAyat, active, stored, storage, start, cancel, remove, removeAll, refresh],
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

/** Access downloaded recitations. Must be used under a `DownloadsProvider`. */
export function useDownloads(): DownloadsContextValue {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
}
