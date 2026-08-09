/**
 * Playback queue construction.
 *
 * The engine plays whatever sequence of ayah numbers it is handed, one after
 * another, and moves through it by position rather than by value. That single
 * property is what makes memorisation practice a queue transformation instead
 * of a feature: repeating an ayah five times is the list `[7,7,7,7,7]`, and
 * repeating a passage three times is that list concatenated three times. No
 * scheduling, timing or transport code needs to know any of it.
 */

/** Upper bound on repetitions offered for a single ayah. */
export const MAX_REPEAT_EACH = 10;

/** Upper bound on repetitions offered for a whole passage. */
export const MAX_REPEAT_RANGE = 10;

/**
 * Ceiling on the generated queue.
 *
 * Al-Baqarah at ten repeats each, ten times over, would be 28,600 entries —
 * more than an hour of scheduling bookkeeping for a session nobody sits
 * through. The queue is truncated rather than refused, so an extreme setting
 * degrades into a long session instead of an error.
 */
export const MAX_QUEUE_LENGTH = 4000;

export type RepeatPlan = {
  /** Times each ayah is heard before moving to the next. */
  readonly repeatEach: number;
  /** Times the whole passage is heard. */
  readonly repeatRange: number;
};

function clampCount(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.floor(value), max));
}

/**
 * Expands a passage into a practice queue.
 *
 * Ayah repeats are grouped (`1,1,2,2`) rather than interleaved (`1,2,1,2`)
 * because that is how memorisation actually works: a verse is repeated until it
 * settles, then the next one is added.
 *
 * @param ayat The passage, in recitation order.
 */
export function buildRepeatQueue(ayat: readonly number[], plan: RepeatPlan): number[] {
  if (ayat.length === 0) return [];

  const each = clampCount(plan.repeatEach, MAX_REPEAT_EACH);
  const range = clampCount(plan.repeatRange, MAX_REPEAT_RANGE);

  if (each === 1 && range === 1) return [...ayat];

  const queue: number[] = [];

  for (let pass = 0; pass < range; pass += 1) {
    for (const ayah of ayat) {
      for (let repeat = 0; repeat < each; repeat += 1) {
        if (queue.length >= MAX_QUEUE_LENGTH) return queue;
        queue.push(ayah);
      }
    }
  }

  return queue;
}

/**
 * Restricts a passage to the ayat at or after `from`.
 *
 * Starting a repeat session mid-surah should practise from that ayah onward,
 * not replay everything before it — but the ayat before it still belong to the
 * surah, so the caller keeps them for ordinary listening.
 */
export function passageFrom(ayat: readonly number[], from: number): number[] {
  const index = ayat.indexOf(from);
  return index === -1 ? [...ayat] : ayat.slice(index);
}
