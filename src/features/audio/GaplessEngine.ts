import { findAudibleRange } from './silence';

/**
 * Gapless recitation engine.
 * -----------------------------------------------------------------------------
 * A surah is distributed as one MP3 per ayah, but it must *sound* like one
 * continuous recording. An `HTMLAudioElement` cannot do that, and the reason is
 * structural rather than a matter of tuning:
 *
 *   1. The transition is requested by the main thread. `ended` fires, JavaScript
 *      assigns a new `src`, and `play()` asks the element to begin "now" — by
 *      which time the audio thread has already run dry. Nothing ever tells the
 *      hardware clock *when* the next sample should land.
 *   2. Decoding happens at playback time. Even a fully cached file must be
 *      demuxed and decoded before its first sample is audible.
 *   3. MP3 files carry encoder padding at both ends (see `silence.ts`), so two
 *      consecutive files are separated by digital silence that no scheduling can
 *      remove.
 *
 * This engine removes all three. Audio is decoded into `AudioBuffer`s ahead of
 * time, padding is trimmed, and each ayah is scheduled with
 * `AudioBufferSourceNode.start(when)` at an exact time on the `AudioContext`
 * clock — computed as the previous ayah's start plus its duration. The boundary
 * is therefore sample-accurate and is committed to the audio thread seconds
 * before it happens, so nothing on the main thread — React rendering, layout,
 * garbage collection — can be late for it.
 *
 * The reciter's own pauses are untouched; only exact-zero codec padding is
 * removed. Consecutive buffers meet with no inserted sample.
 *
 * Timing never depends on `setTimeout`. The audio thread schedules itself; the
 * only main-thread signal is each source's `ended` event, which arrives *after*
 * its successor is already sounding and is used solely to extend the schedule
 * and update the UI.
 */

/** Ayat kept scheduled on the audio clock ahead of the one being heard. */
const LOOKAHEAD_SLOTS = 2;

/** Ayat decoded and held in memory beyond those already scheduled. */
const DECODE_AHEAD = 1;

/**
 * Decoded buffers retained.
 *
 * A decoded minute of 44.1 kHz stereo is roughly 21 MB, so this cache is capped
 * tightly and deliberately: it exists to make the next transition instant, not
 * to hold a surah. The compressed originals stay in the HTTP cache, where they
 * cost a fraction as much and survive far longer.
 */
const MAX_DECODED_BUFFERS = 8;

/** Lead-in used when playback starts or resumes after a seek. */
const START_LEAD_SECONDS = 0.06;

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export type EngineSnapshot = {
  readonly surah: number;
  readonly ayah: number;
  readonly queue: readonly number[];
  readonly status: EngineStatus;
  readonly playing: boolean;
  readonly error: string | null;
};

export type EngineListener = (snapshot: EngineSnapshot) => void;

/** Resolves the audio URL for one ayah. Injected so the engine owns no config. */
export type UrlResolver = (surah: number, ayah: number) => string;

/** One ayah committed to the audio clock. */
type Slot = {
  readonly index: number;
  readonly ayah: number;
  readonly source: AudioBufferSourceNode;
  /** `AudioContext` time at which this ayah begins. */
  readonly startTime: number;
  /** Audible seconds, already adjusted for playback rate. */
  readonly duration: number;
  /** Seconds skipped from the head of the buffer, for seek reporting. */
  readonly offset: number;
  /** Set when the slot is torn down deliberately, so `ended` can ignore it. */
  disposed: boolean;
};

export class GaplessEngine {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  /** Element that owns the OS media session, fed from the graph when possible. */
  private anchor: HTMLAudioElement | null = null;

  private readonly decoded = new Map<string, AudioBuffer>();
  private readonly decoding = new Map<string, Promise<AudioBuffer | null>>();

  private slots: Slot[] = [];
  private queue: readonly number[] = [];
  private surah = 0;
  private cursor = -1;
  /** Index of the last ayah placed on the clock. */
  private scheduledThrough = -1;
  /** `AudioContext` time at which the scheduled run ends. */
  private scheduleEnd = 0;

  private status: EngineStatus = 'idle';
  private playing = false;
  private error: string | null = null;
  private rate = 1;
  private volume = 1;

  /** Guards against a slow decode resolving into a queue that has moved on. */
  private generation = 0;

  private readonly listeners = new Set<EngineListener>();

  constructor(private readonly resolveUrl: UrlResolver) {}

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  snapshot(): EngineSnapshot {
    return {
      surah: this.surah,
      ayah: this.cursor >= 0 ? (this.queue[this.cursor] ?? 0) : 0,
      queue: this.queue,
      status: this.status,
      playing: this.playing,
      error: this.error,
    };
  }

  /**
   * Seconds elapsed within the ayah being heard.
   *
   * Derived from the audio clock rather than tracked by a timer, so it stays
   * exact regardless of main-thread load.
   */
  get position(): number {
    const context = this.context;
    const slot = this.currentSlot();
    if (!context || !slot) return 0;
    const elapsed = (context.currentTime - slot.startTime) * this.rate + slot.offset;
    return Math.max(0, Math.min(elapsed, slot.duration * this.rate + slot.offset));
  }

  /** Audible length of the ayah being heard, at normal rate. */
  get duration(): number {
    const slot = this.currentSlot();
    if (!slot) return 0;
    return slot.duration * this.rate + slot.offset;
  }

  private currentSlot(): Slot | null {
    return this.slots.find((slot) => slot.index === this.cursor) ?? null;
  }

  // -------------------------------------------------------------------------
  // Graph
  // -------------------------------------------------------------------------

  /**
   * Builds the audio graph on first use.
   *
   * Created lazily because a context constructed outside a user gesture starts
   * suspended on every mobile browser, and one created inside the gesture that
   * began playback does not.
   */
  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = this.volume;

    // The graph is routed through a media stream into a real <audio> element so
    // the OS still sees a media session: lock-screen controls, headset buttons,
    // audio focus and background playback all belong to the element, not to the
    // context. Where that route is unavailable, the context's own destination
    // keeps playback audible — a missing lock-screen card is a far smaller
    // failure than silence.
    let anchored = false;
    if (typeof context.createMediaStreamDestination === 'function') {
      try {
        const streamNode = context.createMediaStreamDestination();
        gain.connect(streamNode);

        const anchor = new Audio();
        anchor.srcObject = streamNode.stream;
        anchor.preload = 'auto';
        // Volume is applied in the graph; the element must not attenuate twice.
        anchor.volume = 1;
        this.anchor = anchor;
        anchored = true;
      } catch {
        this.anchor = null;
      }
    }

    if (!anchored) gain.connect(context.destination);

    this.context = context;
    this.gain = gain;
    return context;
  }

  /**
   * Starts the anchor element.
   *
   * Its failure is recoverable: if the element refuses the stream, the graph is
   * re-pointed at the context destination and playback continues without a
   * media session.
   */
  private async startAnchor(): Promise<void> {
    const anchor = this.anchor;
    const context = this.context;
    const gain = this.gain;
    if (!anchor || !context || !gain || !anchor.paused) return;

    try {
      await anchor.play();
    } catch {
      try {
        gain.connect(context.destination);
      } catch {
        // Already connected; nothing to repair.
      }
      this.anchor = null;
    }
  }

  // -------------------------------------------------------------------------
  // Decoding
  // -------------------------------------------------------------------------

  /**
   * Fetches and decodes one ayah, with codec padding removed.
   *
   * Results are memoised per URL, including the in-flight promise, so a slot
   * being scheduled and the decode-ahead pass never fetch the same file twice.
   */
  private async decode(surah: number, ayah: number): Promise<AudioBuffer | null> {
    const context = this.ensureContext();
    if (!context) return null;

    const url = this.resolveUrl(surah, ayah);

    const cached = this.decoded.get(url);
    if (cached) return cached;

    const inFlight = this.decoding.get(url);
    if (inFlight) return inFlight;

    const request = (async (): Promise<AudioBuffer | null> => {
      try {
        const response = await fetch(url, { credentials: 'omit', mode: 'cors' });
        if (!response.ok) return null;

        const encoded = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(encoded);
        const trimmed = trimPadding(context, buffer);

        if (this.decoded.size >= MAX_DECODED_BUFFERS) {
          // Insertion order is playback order, so the oldest entry is the ayah
          // furthest behind the listener.
          const oldest = this.decoded.keys().next();
          if (!oldest.done) this.decoded.delete(oldest.value);
        }
        this.decoded.set(url, trimmed);
        return trimmed;
      } catch {
        return null;
      } finally {
        this.decoding.delete(url);
      }
    })();

    this.decoding.set(url, request);
    return request;
  }

  // -------------------------------------------------------------------------
  // Scheduling
  // -------------------------------------------------------------------------

  /**
   * Commits one ayah to the audio clock.
   *
   * `when` is an absolute `AudioContext` time. Passing the previous ayah's end
   * is what makes the boundary sample-accurate: the audio thread already holds
   * both buffers and the instant at which to move between them.
   */
  private schedule(index: number, buffer: AudioBuffer, when: number, offset: number): Slot {
    const context = this.context;
    const gain = this.gain;
    if (!context || !gain) throw new Error('Audio graph is not initialised');

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.rate;
    source.connect(gain);

    const startAt = Math.max(when, context.currentTime);
    source.start(startAt, offset);

    const slot: Slot = {
      index,
      ayah: this.queue[index] ?? 0,
      source,
      startTime: startAt,
      duration: (buffer.duration - offset) / this.rate,
      offset,
      disposed: false,
    };

    source.onended = () => this.onSlotEnded(slot);

    this.slots.push(slot);
    this.scheduledThrough = index;
    this.scheduleEnd = startAt + slot.duration;
    return slot;
  }

  /**
   * Extends the schedule so the clock always holds the next few ayat.
   *
   * Runs well ahead of the boundary it is preparing — a decode takes tens of
   * milliseconds while the runway is a whole ayah — so the audio thread is never
   * waiting on this to finish.
   */
  private async fillAhead(generation: number): Promise<void> {
    while (
      generation === this.generation &&
      this.slots.filter((slot) => !slot.disposed).length < LOOKAHEAD_SLOTS + 1 &&
      this.scheduledThrough + 1 < this.queue.length
    ) {
      const index = this.scheduledThrough + 1;
      const ayah = this.queue[index];
      if (ayah === undefined) break;

      const buffer = await this.decode(this.surah, ayah);
      if (generation !== this.generation) return;

      if (!buffer) {
        // One unavailable ayah must not end the recitation; skip it and let the
        // schedule close over the hole rather than stopping at it.
        this.scheduledThrough = index;
        continue;
      }

      this.schedule(index, buffer, this.scheduleEnd, 0);
    }

    if (generation === this.generation) void this.decodeAhead(generation);
  }

  /** Warms buffers past the scheduled run, so extending it never waits. */
  private async decodeAhead(generation: number): Promise<void> {
    for (let step = 1; step <= DECODE_AHEAD; step += 1) {
      const index = this.scheduledThrough + step;
      const ayah = this.queue[index];
      if (ayah === undefined) return;
      await this.decode(this.surah, ayah);
      if (generation !== this.generation) return;
    }
  }

  /**
   * Fires as each ayah finishes — by which time its successor is already
   * sounding, because both were committed to the clock together.
   *
   * This is the engine's only main-thread timing signal, and it is used for
   * bookkeeping rather than for audio: extending the schedule, advancing the
   * highlighted ayah, and detecting the end of the queue. Arriving late costs
   * nothing but a slightly late highlight.
   */
  private onSlotEnded(slot: Slot): void {
    if (slot.disposed) return;
    slot.disposed = true;
    this.slots = this.slots.filter((item) => item !== slot);

    const next = this.slots.find((item) => !item.disposed);
    if (next) {
      this.cursor = next.index;
      this.emit();
      void this.fillAhead(this.generation);
      return;
    }

    // Nothing follows: either the queue is exhausted or the decode never
    // arrived. Either way playback has stopped.
    this.playing = false;
    this.status = 'idle';
    this.cursor = -1;
    this.emit();
  }

  /** Tears down every scheduled source without letting `ended` react. */
  private clearSchedule(): void {
    this.generation += 1;
    for (const slot of this.slots) {
      slot.disposed = true;
      slot.source.onended = null;
      try {
        slot.source.stop();
      } catch {
        // A source that never started throws on stop; harmless.
      }
      slot.source.disconnect();
    }
    this.slots = [];
    this.scheduledThrough = -1;
    this.scheduleEnd = 0;
  }

  // -------------------------------------------------------------------------
  // Transport
  // -------------------------------------------------------------------------

  /**
   * Begins a recitation.
   *
   * Must be reached from a user gesture the first time, so the context and the
   * anchor element both inherit permission to make sound.
   */
  async play(input: {
    surah: number;
    ayah: number;
    queue: readonly number[];
    /** Seconds into the ayah, used when resuming a saved position. */
    offset?: number;
  }): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      this.status = 'error';
      this.error = 'متصفحك لا يدعم تشغيل الصوت.';
      this.emit();
      return;
    }

    this.clearSchedule();

    const index = input.queue.indexOf(input.ayah);
    this.surah = input.surah;
    this.queue = input.queue;
    this.cursor = index === -1 ? 0 : index;
    this.status = 'loading';
    this.error = null;
    this.playing = true;
    this.emit();

    const generation = this.generation;

    // Both of these must be reached before the first `await`, while the call
    // stack still carries the user gesture that permitted playback. After an
    // await the gesture is spent, and mobile browsers refuse both.
    void this.startAnchor();
    const resuming = context.state === 'suspended' ? context.resume() : null;
    if (resuming) await resuming;

    const ayah = this.queue[this.cursor];
    if (ayah === undefined) return;

    const buffer = await this.decode(this.surah, ayah);
    if (generation !== this.generation) return;

    if (!buffer) {
      this.status = 'error';
      this.playing = false;
      this.error = 'تعذّر تحميل ملف التلاوة. تحقّق من اتصالك بالإنترنت.';
      this.emit();
      return;
    }

    this.schedule(this.cursor, buffer, context.currentTime + START_LEAD_SECONDS, input.offset ?? 0);
    this.status = 'ready';
    this.emit();

    void this.fillAhead(generation);
  }

  /**
   * Suspends the context rather than stopping sources.
   *
   * The context clock stops with it, so every scheduled start time stays valid
   * relative to the clock and resuming needs no rescheduling — the run continues
   * exactly where it stopped, still gapless.
   */
  async pause(): Promise<void> {
    const context = this.context;
    if (!context || !this.playing) return;
    await context.suspend();
    this.anchor?.pause();
    this.playing = false;
    this.emit();
  }

  async resume(): Promise<void> {
    const context = this.context;
    if (!context || this.cursor < 0) return;
    await context.resume();
    void this.startAnchor();
    this.playing = true;
    this.emit();
  }

  async toggle(): Promise<void> {
    if (this.playing) await this.pause();
    else await this.resume();
  }

  stop(): void {
    this.clearSchedule();
    this.anchor?.pause();
    this.queue = [];
    this.surah = 0;
    this.cursor = -1;
    this.playing = false;
    this.status = 'idle';
    this.error = null;
    // Buffers are dropped with the recitation; a new one rarely reuses them and
    // they are the largest thing this engine holds.
    this.decoded.clear();
    this.emit();
  }

  /** Jumps by a signed number of ayat, rebuilding the schedule from there. */
  async step(offset: number): Promise<void> {
    if (this.cursor < 0) return;
    const target = this.cursor + offset;
    const ayah = this.queue[target];
    if (ayah === undefined) return;

    await this.play({ surah: this.surah, ayah, queue: this.queue });
  }

  /** Moves within the current ayah. */
  async seek(seconds: number): Promise<void> {
    const slot = this.currentSlot();
    const buffer = slot?.source.buffer;
    if (!slot || !buffer) return;

    const offset = Math.max(0, Math.min(seconds, buffer.duration - 0.01));
    await this.play({
      surah: this.surah,
      ayah: slot.ayah,
      queue: this.queue,
      offset,
    });
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(value, 1));
    // Ramped rather than assigned: an instant gain change on a running graph is
    // a discontinuity in the waveform, which is audible as a click.
    const gain = this.gain;
    const context = this.context;
    if (gain && context) {
      gain.gain.setTargetAtTime(this.volume, context.currentTime, 0.015);
    }
  }

  /**
   * Changes playback rate.
   *
   * Every scheduled boundary was computed from the old rate, so the run is
   * rebuilt from the current position — the alternative is a schedule whose
   * later ayat overlap or leave gaps.
   */
  async setRate(value: number): Promise<void> {
    const clamped = Math.max(0.5, Math.min(value, 2));
    if (clamped === this.rate) return;

    const slot = this.currentSlot();
    const position = this.position;
    this.rate = clamped;

    if (!slot || !this.playing) return;
    await this.play({
      surah: this.surah,
      ayah: slot.ayah,
      queue: this.queue,
      offset: position,
    });
  }

  /** Releases the audio hardware. */
  async dispose(): Promise<void> {
    this.clearSchedule();
    this.listeners.clear();
    this.decoded.clear();

    const anchor = this.anchor;
    if (anchor) {
      anchor.pause();
      anchor.srcObject = null;
      this.anchor = null;
    }

    const context = this.context;
    this.context = null;
    this.gain = null;
    if (context) await context.close().catch(() => {});
  }
}

/**
 * Returns the buffer with exact-zero codec padding removed.
 *
 * The original is returned unchanged when there is nothing to trim, so the
 * common case allocates nothing.
 */
function trimPadding(context: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const channels: Float32Array[] = [];
  for (let index = 0; index < buffer.numberOfChannels; index += 1) {
    channels.push(buffer.getChannelData(index));
  }

  const { start, end } = findAudibleRange(channels, buffer.sampleRate);
  if (start === 0 && end === buffer.length) return buffer;

  const trimmed = context.createBuffer(buffer.numberOfChannels, end - start, buffer.sampleRate);
  for (let index = 0; index < buffer.numberOfChannels; index += 1) {
    trimmed.copyToChannel(buffer.getChannelData(index).subarray(start, end), index);
  }
  return trimmed;
}
