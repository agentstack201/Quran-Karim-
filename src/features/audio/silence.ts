/**
 * Codec padding removal.
 *
 * Every MP3 carries silence that the reciter never recorded. The format is
 * frame-based, so an encoder pads the first frame with a fixed decoder delay
 * (1105 samples for LAME) and pads the final frame out to a frame boundary.
 * Play two such files back to back and you hear the sum of one file's tail
 * padding and the next file's head delay — roughly 25–50 ms of digital silence
 * per transition, present no matter how precisely playback is scheduled.
 *
 * The rule used here is deliberately narrow: trim only samples that are
 * *exactly* zero in every channel. That distinction is what makes this safe.
 * Encoder padding is written as exact zeros; a recording's own quiet moments —
 * the reciter's breath, the pause between ayat, room tone — always carry a
 * noise floor and are never exactly zero across a whole channel. So this
 * removes the artefact and cannot touch the recitation, including its silences.
 */

/**
 * Ceiling on how much may be removed from either end, in seconds.
 *
 * Codec padding is measured in milliseconds. A longer run of exact zeros means
 * something other than padding — a mastering choice, or a file that genuinely
 * opens silent — and is left alone rather than guessed at.
 */
export const MAX_TRIM_SECONDS = 0.25;

/** A decoded region: sample offsets into the source, end-exclusive. */
export type AudibleRange = {
  readonly start: number;
  readonly end: number;
};

/**
 * Finds the region of a decoded buffer that holds actual signal.
 *
 * Framework-free and operating on plain sample arrays so it can be verified in
 * a unit test without a browser audio stack.
 *
 * @param channels One `Float32Array` per channel, all the same length.
 * @param sampleRate Samples per second, used to apply the trim ceiling.
 */
export function findAudibleRange(
  channels: readonly Float32Array[],
  sampleRate: number,
): AudibleRange {
  const length = channels[0]?.length ?? 0;
  if (length === 0 || channels.length === 0) return { start: 0, end: length };

  const maxTrim = Math.min(Math.floor(MAX_TRIM_SECONDS * sampleRate), Math.floor(length / 2));

  /** True when every channel is exactly zero at this sample. */
  const isSilent = (index: number): boolean => {
    for (const channel of channels) {
      if (channel[index] !== 0) return false;
    }
    return true;
  };

  let start = 0;
  while (start < maxTrim && isSilent(start)) start += 1;

  let end = length;
  while (end > length - maxTrim && isSilent(end - 1)) end -= 1;

  // A buffer of nothing but zeros would otherwise collapse to an empty range,
  // which no audio graph can schedule. Leave such a file untouched.
  if (end <= start) return { start: 0, end: length };

  return { start, end };
}
