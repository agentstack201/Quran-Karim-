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
import { getChapter } from '@/services/quran';
import type { AsyncStatus } from '@/types';
import { clamp } from '@/utils';

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
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${track.surahName} — الآية ${track.ayah}`,
      artist: reciter.name,
      album: 'تلاوة',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', resume],
      ['pause', pause],
      ['nexttrack', next],
      ['previoustrack', previous],
      ['stop', stop],
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
  }, [track, playing, settings.reciterId, resume, pause, next, previous, stop]);

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
