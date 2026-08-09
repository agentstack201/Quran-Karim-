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
import { buildAyahAudioUrl, getReciter } from '@/constants';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useWakeLock } from '@/hooks';
import { fetchChapter, getChapter } from '@/services/quran';
import type { AsyncStatus } from '@/types';
import { clamp, excerpt, toArabicNumerals } from '@/utils';

/**
 * How many upcoming ayat are warmed into the HTTP cache while the current one
 * plays.
 *
 * Two is the point of diminishing returns: it covers the next transition and
 * the one after it, which is enough to absorb a brief stall without competing
 * with the audio that is actually playing for bandwidth.
 */
const PREFETCH_AHEAD = 2;

/** Upper bound on remembered prefetches, so a long recitation cannot grow unbounded. */
const PREFETCH_MEMORY = 200;

/**
 * `navigator.connection`, which no TypeScript DOM lib declares yet.
 *
 * Only `saveData` is read: a reader who has asked their browser to conserve
 * data has not asked us to speculatively download two extra ayat.
 */
type ConnectionInfo = { readonly saveData?: boolean };

function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  return connection?.saveData === true;
}

/** The verse currently loaded into the player. */
export type AudioTrack = {
  readonly surah: number;
  readonly ayah: number;
  readonly surahName: string;
  /** Ayah numbers available in the active playback queue. */
  readonly queue: readonly number[];
};

type AudioContextValue = {
  readonly track: AudioTrack | null;
  readonly status: AsyncStatus;
  readonly playing: boolean;
  /** Seconds elapsed in the current ayah. */
  readonly currentTime: number;
  /** Duration of the current ayah, or 0 while unknown. */
  readonly duration: number;
  readonly error: string | null;
  /** Starts (or restarts) playback at a specific ayah. */
  readonly play: (input: { surah: number; ayah: number; queue?: readonly number[] }) => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly toggle: () => void;
  readonly stop: () => void;
  readonly next: () => void;
  readonly previous: () => void;
  readonly seek: (seconds: number) => void;
  readonly setVolume: (volume: number) => void;
  readonly setPlaybackRate: (rate: number) => void;
};

const AudioContext = createContext<AudioContextValue | null>(null);

/**
 * The recitation engine.
 *
 * Built on a single long-lived `HTMLAudioElement` rather than one element per
 * ayah: reusing the element keeps the browser's media session, output-device
 * routing and autoplay permission intact across the whole recitation, and it is
 * what makes gapless ayah-to-ayah playback possible.
 *
 * Audio is fetched per ayah from EveryAyah, which is why next/previous can move
 * one verse at a time without a timing database.
 */
export function AudioProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Mirrors of the latest state, read from media-element event handlers that are
  // registered once and must not be torn down on every state change. Synced in
  // effects (never during render) so React's concurrent rendering stays safe.
  const trackRef = useRef<AudioTrack | null>(null);
  const settingsRef = useRef(settings);

  /** Audio URLs already warmed this session, so a replay costs nothing. */
  const prefetchedRef = useRef<Set<string>>(new Set());

  /**
   * Uthmani text of the ayah being recited, resolved for the lock-screen card.
   *
   * Looked up here rather than passed in by callers: `fetchChapter` memoises
   * per surah, and the reader has already loaded the surah being recited, so
   * this resolves from memory without a request — and it keeps working when
   * playback advances to an ayah no component asked for.
   *
   * Stored with the verse it belongs to and matched during render, so an ayah
   * can never briefly be captioned with the previous ayah's words.
   */
  const [resolvedText, setResolvedText] = useState<{ key: string; text: string } | null>(null);
  const trackKey = track ? `${track.surah}:${track.ayah}` : null;
  const trackText = resolvedText?.key === trackKey ? resolvedText.text : null;

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /** Lazily creates the shared audio element. */
  const getAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = 'auto';
    // The audio host is CORS-enabled; anonymous mode keeps the response
    // cacheable by the service worker and usable by the Media Session API.
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    return audio;
  }, []);

  /** Loads one ayah into the element and begins playback. */
  const load = useCallback(
    (surah: number, ayah: number, queue: readonly number[]) => {
      const chapter = getChapter(surah);
      if (!chapter) {
        setError('السورة غير موجودة');
        setStatus('error');
        return;
      }

      const audio = getAudio();
      const reciter = getReciter(settingsRef.current.reciterId);

      setTrack({ surah, ayah, surahName: chapter.name, queue });
      setStatus('loading');
      setError(null);
      setCurrentTime(0);
      setDuration(0);

      audio.src = buildAyahAudioUrl(reciter, surah, ayah);
      audio.volume = settingsRef.current.volume;
      audio.playbackRate = settingsRef.current.playbackRate;
      audio.load();

      void audio.play().catch((cause: unknown) => {
        // A rejected play() is almost always the autoplay policy, which is a
        // recoverable state — the user just needs to press play once.
        if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
          setPlaying(false);
          setStatus('success');
          return;
        }
        setError('تعذّر تشغيل التلاوة. تحقّق من اتصالك بالإنترنت.');
        setStatus('error');
        setPlaying(false);
      });
    },
    [getAudio],
  );

  const play = useCallback(
    (input: { surah: number; ayah: number; queue?: readonly number[] }) => {
      const chapter = getChapter(input.surah);
      const queue =
        input.queue ??
        (chapter
          ? Array.from({ length: chapter.versesCount }, (_, index) => index + 1)
          : [input.ayah]);
      load(input.surah, input.ayah, queue);
    },
    [load],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    void audio.play().catch(() => {
      setError('تعذّر استئناف التلاوة.');
      setStatus('error');
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    if (audio.paused) resume();
    else audio.pause();
  }, [resume]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setTrack(null);
    setPlaying(false);
    setStatus('idle');
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  /** Moves within the queue by a signed offset, respecting its bounds. */
  const step = useCallback(
    (offset: number) => {
      const current = trackRef.current;
      if (!current) return;

      const index = current.queue.indexOf(current.ayah);
      const nextAyah = current.queue[index + offset];
      if (nextAyah === undefined) return;

      load(current.surah, nextAyah, current.queue);
    },
    [load],
  );

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = clamp(seconds, 0, audio.duration);
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = clamp(volume, 0, 1);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = clamp(rate, 0.5, 2);
  }, []);

  /** Wire up the element's lifecycle events exactly once. */
  useEffect(() => {
    const audio = getAudio();

    const onPlay = (): void => {
      setPlaying(true);
      setStatus('success');
    };
    const onPause = (): void => setPlaying(false);
    const onTimeUpdate = (): void => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = (): void => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setStatus('success');
    };
    const onWaiting = (): void => setStatus('loading');
    const onCanPlay = (): void => setStatus('success');

    const onEnded = (): void => {
      const current = trackRef.current;
      if (!current) return;

      const index = current.queue.indexOf(current.ayah);
      const nextAyah = current.queue[index + 1];

      if (nextAyah !== undefined && settingsRef.current.continuousPlayback) {
        load(current.surah, nextAyah, current.queue);
        return;
      }

      setPlaying(false);
      setCurrentTime(0);
    };

    const onError = (): void => {
      // MEDIA_ERR_ABORTED fires whenever we swap `src` mid-playback, which is
      // normal operation rather than a failure worth surfacing.
      if (audio.error?.code === MediaError.MEDIA_ERR_ABORTED) return;
      setError('تعذّر تحميل ملف التلاوة. قد يكون القارئ غير متاح لهذه الآية.');
      setStatus('error');
      setPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, [getAudio, load]);

  /**
   * Warms the next few ayat into the browser's HTTP cache.
   *
   * The gap between ayat was never decode time — it was a cold network request
   * issued at the exact moment the previous ayah fell silent. Fetching ahead
   * moves that request into the seconds where the reader is still listening, so
   * the swap to the next `src` is served from cache and the recitation runs on.
   *
   * The response body is consumed rather than cancelled: an abandoned stream
   * may never finish, and a partially downloaded file is not a cache entry.
   */
  useEffect(() => {
    if (!track || status !== 'success' || prefersReducedData()) return;

    const reciter = getReciter(settings.reciterId);
    const index = track.queue.indexOf(track.ayah);
    if (index === -1) return;

    const upcoming = track.queue
      .slice(index + 1, index + 1 + PREFETCH_AHEAD)
      .map((ayah) => buildAyahAudioUrl(reciter, track.surah, ayah))
      .filter((url) => !prefetchedRef.current.has(url));

    if (upcoming.length === 0) return;

    const controller = new AbortController();

    void (async () => {
      for (const url of upcoming) {
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            credentials: 'omit',
            mode: 'cors',
          });
          if (!response.ok) continue;
          await response.arrayBuffer();

          const seen = prefetchedRef.current;
          if (seen.size >= PREFETCH_MEMORY) seen.clear();
          seen.add(url);
        } catch {
          // Aborted, offline, or the file is missing for this reciter. Playback
          // will discover the same thing and report it properly; a failed
          // speculative fetch is not itself an error.
          return;
        }
      }
    })();

    return () => controller.abort();
  }, [track, status, settings.reciterId]);

  /** Resolves the text of the ayah being recited, for the lock-screen card. */
  useEffect(() => {
    if (!track || !trackKey) return;

    let cancelled = false;

    void (async () => {
      const result = await fetchChapter(track.surah);
      if (cancelled || !result.ok) return;
      const verse = result.data.verses.find((item) => item.ayah === track.ayah);
      if (verse) setResolvedText({ key: trackKey, text: verse.text });
    })();

    return () => {
      cancelled = true;
    };
  }, [track, trackKey]);

  /** Keep the screen awake while a recitation is actually running. */
  useWakeLock(playing);

  // Keep the element in sync with the persisted volume and rate.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = clamp(settings.volume, 0, 1);
    audio.playbackRate = clamp(settings.playbackRate, 0.5, 2);
  }, [settings.volume, settings.playbackRate]);

  // Changing reciter mid-recitation reloads the same ayah in the new voice.
  useEffect(() => {
    const current = trackRef.current;
    if (!current || status === 'idle') return;
    load(current.surah, current.ayah, current.queue);
    // Intentionally keyed on the reciter alone: this must fire when — and only
    // when — the user picks a different voice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.reciterId]);

  /**
   * Publish to the OS media session, so lock-screen and headset controls work
   * on Android, iOS and desktop.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;

    const reciter = getReciter(settings.reciterId);
    const reference = `${track.surahName} — الآية ${toArabicNumerals(track.ayah)}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      // The ayah itself leads, with the reference beneath it: a reader who
      // glances at a locked phone mid-recitation should see the words being
      // recited, not a catalogue number.
      title: trackText ? excerpt(trackText, 90) : reference,
      artist: reciter.name,
      album: trackText ? reference : 'تلاوة',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

    /** Nudges the position by a signed offset, defaulting to the platform's ask. */
    const seekBy =
      (direction: 1 | -1): MediaSessionActionHandler =>
      (details) => {
        const audio = audioRef.current;
        if (!audio) return;
        seek(audio.currentTime + direction * (details.seekOffset ?? 10));
      };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', resume],
      ['pause', pause],
      ['nexttrack', next],
      ['previoustrack', previous],
      ['stop', stop],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') seek(details.seekTime);
        },
      ],
      ['seekbackward', seekBy(-1)],
      ['seekforward', seekBy(1)],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every browser supports every action; skipping one is harmless.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore — teardown of an unsupported action.
        }
      }
    };
  }, [track, trackText, playing, settings.reciterId, resume, pause, next, previous, stop, seek]);

  /**
   * Publish playback position, so the lock screen draws a real progress bar and
   * its scrubber has something to scrub.
   *
   * Kept apart from the metadata effect because it updates several times a
   * second, and rebuilding `MediaMetadata` at that rate makes some platforms
   * flicker the notification. The guards are not defensive padding:
   * `setPositionState` throws a `TypeError` on a non-finite duration or a
   * position past its end, both of which occur normally while a new ayah loads.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;

    if (!track || !Number.isFinite(duration) || duration <= 0) {
      navigator.mediaSession.setPositionState();
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: clamp(currentTime, 0, duration),
        playbackRate: settings.playbackRate > 0 ? settings.playbackRate : 1,
      });
    } catch {
      // A racing `src` swap can invalidate the values between the check and the
      // call; the next tick publishes a consistent pair.
    }
  }, [track, currentTime, duration, settings.playbackRate]);

  const value = useMemo<AudioContextValue>(
    () => ({
      track,
      status,
      playing,
      currentTime,
      duration,
      error,
      play,
      pause,
      resume,
      toggle,
      stop,
      next,
      previous,
      seek,
      setVolume,
      setPlaybackRate,
    }),
    [
      track,
      status,
      playing,
      currentTime,
      duration,
      error,
      play,
      pause,
      resume,
      toggle,
      stop,
      next,
      previous,
      seek,
      setVolume,
      setPlaybackRate,
    ],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

/** Access the recitation engine. Must be used under an `AudioProvider`. */
export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
