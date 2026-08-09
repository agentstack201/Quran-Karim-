import { describe, expect, it } from 'vitest';
import { MAX_TRIM_SECONDS, findAudibleRange } from '@/features/audio/silence';

const SAMPLE_RATE = 44100;

/** A signal that never touches zero, so any trimming would be visible. */
function tone(length: number, amplitude = 0.5): Float32Array {
  const samples = new Float32Array(length);
  for (let n = 0; n < length; n += 1) {
    samples[n] = amplitude * Math.sin((2 * Math.PI * 440 * n) / SAMPLE_RATE + 0.3);
  }
  return samples;
}

function padded(body: Float32Array, head: number, tail: number): Float32Array {
  const samples = new Float32Array(head + body.length + tail);
  samples.set(body, head);
  return samples;
}

describe('findAudibleRange', () => {
  it('removes exactly the codec padding and nothing more', () => {
    // LAME's decoder delay is 1105 samples; the final frame is padded out too.
    const body = tone(4410);
    const range = findAudibleRange([padded(body, 1105, 900)], SAMPLE_RATE);

    expect(range.start).toBe(1105);
    expect(range.end).toBe(1105 + 4410);
  });

  it('leaves a buffer with no padding untouched', () => {
    const body = tone(4410);
    expect(findAudibleRange([body], SAMPLE_RATE)).toEqual({ start: 0, end: 4410 });
  });

  /**
   * The property that makes this safe to apply to recitation.
   *
   * A reciter's pause between ayat, and the room tone under it, are recorded
   * signal — quiet, but never digitally zero. Only an encoder writes exact
   * zeros, so only an encoder's padding is removed.
   */
  it('never trims recorded silence, however quiet', () => {
    const body = tone(4410);
    const roomTone = new Float32Array(2000);
    for (let n = 0; n < roomTone.length; n += 1) {
      // A noise floor around -90 dBFS: inaudible, and decisively not zero.
      roomTone[n] = n % 2 === 0 ? 3e-5 : -3e-5;
    }

    const samples = new Float32Array(roomTone.length + body.length + roomTone.length);
    samples.set(roomTone, 0);
    samples.set(body, roomTone.length);
    samples.set(roomTone, roomTone.length + body.length);

    expect(findAudibleRange([samples], SAMPLE_RATE)).toEqual({ start: 0, end: samples.length });
  });

  it('trims only where every channel is silent', () => {
    // The left channel opens with padding, the right one carries signal from the
    // first sample. Trimming on the left alone would shear the stereo image.
    const left = padded(tone(4410), 1105, 0);
    const right = tone(1105 + 4410, 0.4);

    expect(findAudibleRange([left, right], SAMPLE_RATE)).toEqual({
      start: 0,
      end: left.length,
    });
  });

  it('refuses to trim beyond the ceiling, however long the silence', () => {
    // Padding is measured in milliseconds. A file that genuinely opens with a
    // second of digital silence is not a padded file, and is left alone.
    const head = SAMPLE_RATE; // one full second
    const range = findAudibleRange([padded(tone(4410), head, 0)], SAMPLE_RATE);

    expect(range.start).toBe(Math.floor(MAX_TRIM_SECONDS * SAMPLE_RATE));
    expect(range.start).toBeLessThan(head);
  });

  it('leaves an entirely silent buffer intact rather than collapsing it', () => {
    const silence = new Float32Array(8000);
    expect(findAudibleRange([silence], SAMPLE_RATE)).toEqual({ start: 0, end: 8000 });
  });

  it('handles an empty buffer without throwing', () => {
    expect(findAudibleRange([new Float32Array(0)], SAMPLE_RATE)).toEqual({ start: 0, end: 0 });
    expect(findAudibleRange([], SAMPLE_RATE)).toEqual({ start: 0, end: 0 });
  });
});
