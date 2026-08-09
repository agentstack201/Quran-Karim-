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
import { GaplessEngine, type EngineSnapshot } from './GaplessEngine';

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

/** How often the progress readout is refreshed while playing, in milliseconds. */
const POSITION_REFRESH_MS = 120;

function toAsyncStatus(status: EngineSnapshot['status']): AsyncStatus {
  if (status === 'ready') return 'success';
  if (status === 'loading') return 'loading';
  if (status === 'error') return 'error';
  return 'idle';
}

/**
 * The recitation engine's React binding.
 *
 * All timing and audio work lives in `GaplessEngine`, which schedules ayat
 * directly on the `AudioContext` clock so a transition is committed to the audio
 * thread seconds before it happens. This component only mirrors the engine's
 * state into React and publishes it to the OS media session — deliberately, so
 * that no render, effect or state update can ever sit between two ayat.
 */
export function AudioProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const { settings } = useSettings();
  const engineRef = useRef<GaplessEngine | null>(null);

  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedText, setResolvedText] = useState<{ key: string; text: string } | null>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /**
   * The engine instance, created on demand.
   *
   * The reciter is read through a ref at call time rather than captured, so
   * changing voice never means rebuilding the engine and losing its decoded
   * buffers.
   */
  const getEngine = useCallback((): GaplessEngine => {
    if (engineRef.current) return engineRef.current;

    const engine = new GaplessEngine((surah, ayah) =>
      buildAyahAudioUrl(getReciter(settingsRef.current.reciterId), surah, ayah),
    );
    engine.setVolume(settingsRef.current.volume);
    void engine.setRate(settingsRef.current.playbackRate);

    engineRef.current = engine;
    return engine;
  }, []);

  /** Mirror engine state into React. */
  useEffect(() => {
    const engine = getEngine();
    const unsubscribe = engine.subscribe(setSnapshot);
    return unsubscribe;
  }, [getEngine]);

  useEffect(() => {
    return () => {
      void engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const playing = snapshot?.playing ?? false;
  const status = toAsyncStatus(snapshot?.status ?? 'idle');
  const error = snapshot?.error ?? null;

  const track = useMemo<AudioTrack | null>(() => {
    if (!snapshot || snapshot.ayah === 0) return null;
    const chapter = getChapter(snapshot.surah);
    return {
      surah: snapshot.surah,
      ayah: snapshot.ayah,
      surahName: chapter?.name ?? '',
      queue: snapshot.queue,
    };
  }, [snapshot]);

  /**
   * Reads the playback position off the audio clock.
   *
   * A polling loop rather than an event stream because the position now lives
   * on the audio thread, which emits nothing as it advances. `requestAnimationFrame`
   * drives it so the readout stops when the page is hidden — where there is no
   * progress bar to update — and the value is committed at a fraction of the
   * frame rate, since re-rendering every consumer sixty times a second to move a
   * seek bar by a pixel would be pure waste.
   */
  useEffect(() => {
    if (!playing) return;

    const engine = getEngine();
    let frame = 0;
    let lastCommit = 0;

    const tick = (now: number): void => {
      if (now - lastCommit >= POSITION_REFRESH_MS) {
        lastCommit = now;
        setCurrentTime(engine.position);
        setDuration(engine.duration);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, getEngine]);

  /** Settle the readout whenever the ayah changes or playback stops. */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setCurrentTime(engine.position);
    setDuration(engine.duration);
  }, [snapshot]);

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  const play = useCallback(
    (input: { surah: number; ayah: number; queue?: readonly number[] }) => {
      const chapter = getChapter(input.surah);
      const full =
        input.queue ??
        (chapter
          ? Array.from({ length: chapter.versesCount }, (_, index) => index + 1)
          : [input.ayah]);

      // With continuous playback off, the queue is the single ayah asked for —
      // which is exactly what "play this verse and stop" means, and it keeps the
      // engine from scheduling a successor it must then discard.
      const queue = settingsRef.current.continuousPlayback ? full : [input.ayah];

      void getEngine().play({ surah: input.surah, ayah: input.ayah, queue });
    },
    [getEngine],
  );

  const pause = useCallback(() => void engineRef.current?.pause(), []);
  const resume = useCallback(() => void engineRef.current?.resume(), []);
  const toggle = useCallback(() => void engineRef.current?.toggle(), []);
  const stop = useCallback(() => engineRef.current?.stop(), []);
  const next = useCallback(() => void engineRef.current?.step(1), []);
  const previous = useCallback(() => void engineRef.current?.step(-1), []);
  const seek = useCallback((seconds: number) => void engineRef.current?.seek(seconds), []);

  const setVolume = useCallback((volume: number) => {
    engineRef.current?.setVolume(clamp(volume, 0, 1));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    void engineRef.current?.setRate(clamp(rate, 0.5, 2));
  }, []);

  // Keep the engine in step with persisted preferences.
  useEffect(() => {
    engineRef.current?.setVolume(clamp(settings.volume, 0, 1));
  }, [settings.volume]);

  useEffect(() => {
    void engineRef.current?.setRate(clamp(settings.playbackRate, 0.5, 2));
  }, [settings.playbackRate]);

  /** Changing reciter mid-recitation restarts the same ayah in the new voice. */
  const reciterId = settings.reciterId;
  const firstReciterRun = useRef(true);
  useEffect(() => {
    if (firstReciterRun.current) {
      firstReciterRun.current = false;
      return;
    }
    const engine = engineRef.current;
    const current = engine?.snapshot();
    if (!engine || !current || current.ayah === 0) return;
    void engine.play({ surah: current.surah, ayah: current.ayah, queue: current.queue });
  }, [reciterId]);

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

  /**
   * Uthmani text of the ayah being recited, resolved for the lock-screen card.
   *
   * Looked up here rather than passed in by callers: `fetchChapter` memoises per
   * surah, and the reader has already loaded the surah being recited, so this
   * resolves from memory — and it keeps working when playback advances to an
   * ayah no component asked for.
   *
   * Stored with the verse it belongs to and matched during render, so an ayah is
   * never briefly captioned with the previous ayah's words.
   */
  const trackKey = track ? `${track.surah}:${track.ayah}` : null;
  const trackText = resolvedText?.key === trackKey ? resolvedText.text : null;

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

  /**
   * Publish to the OS media session, so lock-screen and headset controls work
   * on Android, iOS and desktop.
   */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;

    const reciter = getReciter(reciterId);
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
        const engine = engineRef.current;
        if (!engine) return;
        void engine.seek(engine.position + direction * (details.seekOffset ?? 10));
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
  }, [track, trackText, playing, reciterId, resume, pause, next, previous, stop, seek]);

  /**
   * Publish playback position, so the lock screen draws a real progress bar and
   * its scrubber has something to scrub.
   *
   * Kept apart from the metadata effect because it updates several times a
   * second, and rebuilding `MediaMetadata` at that rate makes some platforms
   * flicker the notification. The guards are not defensive padding:
   * `setPositionState` throws a `TypeError` on a non-finite duration or a
   * position past its end, both of which occur normally while an ayah loads.
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
      // A racing restart can invalidate the values between the check and the
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
