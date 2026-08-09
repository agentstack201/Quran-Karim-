import { describe, expect, it } from 'vitest';
import {
  MAX_QUEUE_LENGTH,
  MAX_REPEAT_EACH,
  buildRepeatQueue,
  passageFrom,
} from '@/features/audio/queue';

describe('buildRepeatQueue', () => {
  it('returns the passage unchanged when nothing repeats', () => {
    expect(buildRepeatQueue([1, 2, 3], { repeatEach: 1, repeatRange: 1 })).toEqual([1, 2, 3]);
  });

  /**
   * Grouped, not interleaved. A memoriser repeats one verse until it settles
   * and only then moves on, so `1,1,2,2` is the useful order and `1,2,1,2` is
   * merely a different recitation.
   */
  it('groups each ayah with its own repeats', () => {
    expect(buildRepeatQueue([1, 2, 3], { repeatEach: 2, repeatRange: 1 })).toEqual([
      1, 1, 2, 2, 3, 3,
    ]);
  });

  it('repeats the whole passage after each ayah has had its turn', () => {
    expect(buildRepeatQueue([4, 5], { repeatEach: 2, repeatRange: 3 })).toEqual([
      4, 4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5,
    ]);
  });

  it('preserves the passage order across passes', () => {
    const queue = buildRepeatQueue([7, 8, 9], { repeatEach: 1, repeatRange: 2 });
    expect(queue).toEqual([7, 8, 9, 7, 8, 9]);
  });

  it('clamps counts to the offered range', () => {
    const queue = buildRepeatQueue([1], { repeatEach: 999, repeatRange: 1 });
    expect(queue).toHaveLength(MAX_REPEAT_EACH);
  });

  it('treats counts below one as no repetition', () => {
    expect(buildRepeatQueue([1, 2], { repeatEach: 0, repeatRange: -5 })).toEqual([1, 2]);
    expect(buildRepeatQueue([1, 2], { repeatEach: Number.NaN, repeatRange: 1 })).toEqual([1, 2]);
  });

  /**
   * A session is truncated rather than refused. Al-Baqarah at ten repeats, ten
   * times over, is 28,600 entries — no one sits through it, and building it
   * would cost more than the recitation is worth.
   */
  it('truncates instead of generating an unusable queue', () => {
    const surah = Array.from({ length: 286 }, (_, index) => index + 1);
    const queue = buildRepeatQueue(surah, { repeatEach: 10, repeatRange: 10 });

    expect(queue).toHaveLength(MAX_QUEUE_LENGTH);
    // Truncation must not corrupt what it kept.
    expect(queue.slice(0, 10)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('handles an empty passage', () => {
    expect(buildRepeatQueue([], { repeatEach: 5, repeatRange: 5 })).toEqual([]);
  });

  it('does not alias the passage it was given', () => {
    const passage = [1, 2];
    const queue = buildRepeatQueue(passage, { repeatEach: 1, repeatRange: 1 });
    queue.push(3);
    expect(passage).toEqual([1, 2]);
  });
});

describe('passageFrom', () => {
  it('starts the passage at the chosen ayah', () => {
    expect(passageFrom([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
  });

  it('keeps the whole passage when the ayah is not in it', () => {
    expect(passageFrom([1, 2, 3], 9)).toEqual([1, 2, 3]);
  });

  it('keeps the whole passage when starting at its first ayah', () => {
    expect(passageFrom([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  it('returns a copy rather than a view', () => {
    const passage = [1, 2, 3];
    passageFrom(passage, 1).push(4);
    expect(passage).toEqual([1, 2, 3]);
  });
});
