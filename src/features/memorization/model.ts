import { TOTAL_PAGES } from '@/constants';
import { isDayKey, type DayKey } from '@/utils';

/**
 * The memorisation domain.
 * -----------------------------------------------------------------------------
 * What the engine tracks, and how it is stored.
 *
 * The unit of scheduling is the **page**, because that is the unit memorisers
 * actually think in — "three pages today", never "verses 12 to 34". Verses are
 * the unit of *diagnosis* and will arrive with recitation checking; scheduling
 * them now would produce 6236 review items for a granularity nobody asked for.
 *
 * The second unit is the **link**: the join between one page and the next.
 * Ḥuffāẓ do not usually forget pages — they forget the seams. Ask someone where
 * their recitation breaks in tarāwīḥ and the answer is almost always "at the
 * end of the page", because every repetition started at a page top and none of
 * them ever practised the crossing. Making links first-class review items costs
 * 603 more records and addresses a failure that page-level review structurally
 * cannot reach.
 */

/** What kind of thing is being memorised. */
export type MemoryUnitType = 'page' | 'link';

/**
 * How well established a unit is.
 *
 * `relearning` is distinct from `learning` on purpose: a page that was solid
 * and then broke needs a different, shorter ladder than a page seen for the
 * first time, and collapsing the two loses that.
 */
export type LearningState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * One scheduled item.
 *
 * `stability` is in days and carries the definition the whole scheduler rests
 * on: the number of days until recall of this unit is expected to fall to 90%.
 * `difficulty` is 0–1, estimated from how the unit has actually behaved rather
 * than from anything the reader declares about it.
 */
export type MemoryUnit = {
  readonly type: MemoryUnitType;
  /** Page number for a page; for a link, the page it leads *out of*. */
  readonly id: number;
  readonly state: LearningState;
  /** Days until expected recall reaches 90%. */
  readonly stability: number;
  /** 0 (easy) – 1 (hard). */
  readonly difficulty: number;
  readonly lastReviewedOn: DayKey | null;
  readonly reps: number;
  /** Times this unit was solid and then broke. */
  readonly lapses: number;
  /** Grade of the most recent review, 0–1. */
  readonly lastGrade: number;
};

/** Stable identity for a unit, e.g. `p:47` or `l:47`. */
export type MemoryUnitKey = string;

export function unitKey(type: MemoryUnitType, id: number): MemoryUnitKey {
  return `${type === 'page' ? 'p' : 'l'}:${id}`;
}

/** Parses a unit key, returning `null` for anything malformed. */
export function parseUnitKey(key: string): { type: MemoryUnitType; id: number } | null {
  const match = /^([pl]):(\d{1,3})$/.exec(key);
  if (!match) return null;

  const id = Number(match[2]);
  const type: MemoryUnitType = match[1] === 'p' ? 'page' : 'link';

  // A link leads out of a page into the next one, so there is no link out of
  // the last page — 603 links for 604 pages.
  const max = type === 'page' ? TOTAL_PAGES : TOTAL_PAGES - 1;
  if (!Number.isInteger(id) || id < 1 || id > max) return null;

  return { type, id };
}

/** True when `id` names a real unit of this type. */
export function isValidUnitId(type: MemoryUnitType, id: number): boolean {
  const max = type === 'page' ? TOTAL_PAGES : TOTAL_PAGES - 1;
  return Number.isInteger(id) && id >= 1 && id <= max;
}

/** Every unit the engine can schedule, in Mus'haf order. */
export const TOTAL_LINKS = TOTAL_PAGES - 1;

// ---------------------------------------------------------------------------
// Review outcomes
// ---------------------------------------------------------------------------

/**
 * How a review went.
 *
 * Two shapes, one seam. Today the only available input is the reader's own
 * verdict; when recitation checking lands it will supply a measured outcome
 * from the same session, and **the scheduler will not change** — it consumes a
 * grade, and only `gradeFromOutcome` knows where the grade came from.
 *
 * Keeping the distinction in the type rather than hiding it behind a number is
 * deliberate. A self-report is a weaker signal than a measurement, the app
 * should be able to say so, and a stored history that cannot tell them apart
 * could never be recalibrated later.
 */
export type ReviewOutcome =
  | {
      readonly kind: 'self-reported';
      /**
       * Three rungs, not five. The distinctions a memoriser can actually make
       * about their own recitation are: it flowed, it stumbled, it broke.
       * Finer scales invite a precision nobody has about their own recall, and
       * the extra rungs get used inconsistently, which is worse than coarse.
       */
      readonly rating: 'solid' | 'hesitant' | 'forgotten';
    }
  | {
      readonly kind: 'measured';
      /** Correct words ÷ expected words, 0–1. */
      readonly accuracy: number;
      /** 1 − (hesitation time ÷ session time), 0–1. */
      readonly fluency: number;
      /** Times the reader needed prompting. */
      readonly assists: number;
      /** Words the reader was expected to recite. */
      readonly words: number;
    };

/** Grades for the three self-reported rungs. */
const SELF_REPORTED_GRADES = { solid: 0.95, hesitant: 0.6, forgotten: 0.15 } as const;

/**
 * Weights for a measured outcome.
 *
 * Accuracy dominates because a wrong word is a memorisation failure, while
 * hesitancy is a fluency problem that resolves with repetition. Assists are
 * subtracted per word rather than per session so that needing three prompts
 * across a long page counts for less than needing three on a short one.
 */
const MEASURED_WEIGHTS = { accuracy: 0.65, fluency: 0.35, assistPenalty: 4 } as const;

/** Collapses an outcome into the 0–1 grade the scheduler consumes. */
export function gradeFromOutcome(outcome: ReviewOutcome): number {
  if (outcome.kind === 'self-reported') return SELF_REPORTED_GRADES[outcome.rating];

  const accuracy = clamp01(outcome.accuracy);
  const fluency = clamp01(outcome.fluency);
  const words = Math.max(outcome.words, 1);
  const penalty = (MEASURED_WEIGHTS.assistPenalty * Math.max(outcome.assists, 0)) / words;

  return clamp01(
    MEASURED_WEIGHTS.accuracy * accuracy + MEASURED_WEIGHTS.fluency * fluency - penalty,
  );
}

/**
 * The grade below which a review counts as a lapse.
 *
 * Set at the boundary between "stumbled" and "broke": a hesitant run is still
 * a successful recall and must not reset the interval, or every honest reader
 * would be punished for honesty and quickly stop being honest.
 */
export const LAPSE_THRESHOLD = 0.4;

export function isLapse(grade: number): boolean {
  return grade < LAPSE_THRESHOLD;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Bumped when the stored shape changes incompatibly. */
export const MEMORIZATION_VERSION = 1;

const STATES: readonly LearningState[] = ['new', 'learning', 'review', 'relearning'];

/**
 * One unit, as stored: a fixed-position tuple rather than an object.
 *
 * `[type, id, state, stability, difficulty, lastReviewedOn, reps, lapses, grade]`
 *
 * Verbose JSON would repeat nine keys across up to 1207 records, and this is
 * written to LocalStorage — a synchronous API on the main thread, where the
 * cost of a write scales with its size. The tuple is a third of the bytes for
 * the same information, and the schema is right here rather than implied.
 */
type StoredUnit = [number, number, number, number, number, string | null, number, number, number];

export type MemorizationSnapshot = {
  readonly version: number;
  readonly units: readonly StoredUnit[];
};

/** Rounds to a fixed number of decimals, keeping stored numbers short. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function serialise(units: ReadonlyMap<MemoryUnitKey, MemoryUnit>): MemorizationSnapshot {
  const stored: StoredUnit[] = [];

  for (const unit of units.values()) {
    stored.push([
      unit.type === 'page' ? 0 : 1,
      unit.id,
      Math.max(0, STATES.indexOf(unit.state)),
      round(unit.stability, 2),
      round(unit.difficulty, 3),
      unit.lastReviewedOn,
      unit.reps,
      unit.lapses,
      round(unit.lastGrade, 2),
    ]);
  }

  return { version: MEMORIZATION_VERSION, units: stored };
}

/**
 * Restores a snapshot, discarding anything it cannot trust.
 *
 * Skips bad records rather than rejecting the whole snapshot: losing one page's
 * history is a small harm, and losing a year of ḥifẓ tracking because a single
 * field was corrupted is not a trade anyone would accept. A wholly unreadable
 * snapshot still returns `null` so the caller can fall back cleanly.
 */
export function deserialise(raw: unknown): Map<MemoryUnitKey, MemoryUnit> | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const snapshot = raw as Partial<MemorizationSnapshot>;
  if (snapshot.version !== MEMORIZATION_VERSION) return null;
  if (!Array.isArray(snapshot.units)) return null;

  const units = new Map<MemoryUnitKey, MemoryUnit>();

  for (const entry of snapshot.units) {
    if (!Array.isArray(entry) || entry.length < 9) continue;

    const [type, id, state, stability, difficulty, lastReviewedOn, reps, lapses, grade] = entry as
      StoredUnit | unknown[];

    if (typeof type !== 'number' || typeof id !== 'number') continue;

    const unitType: MemoryUnitType = type === 1 ? 'link' : 'page';
    if (!isValidUnitId(unitType, id)) continue;

    if (typeof stability !== 'number' || !Number.isFinite(stability) || stability <= 0) continue;
    if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) continue;
    if (lastReviewedOn !== null && !isDayKey(lastReviewedOn)) continue;

    const stateName = typeof state === 'number' ? STATES[state] : undefined;

    units.set(unitKey(unitType, id), {
      type: unitType,
      id,
      state: stateName ?? 'review',
      stability,
      difficulty: Math.min(1, Math.max(0, difficulty)),
      lastReviewedOn: lastReviewedOn as DayKey | null,
      reps: typeof reps === 'number' && reps >= 0 ? Math.floor(reps) : 0,
      lapses: typeof lapses === 'number' && lapses >= 0 ? Math.floor(lapses) : 0,
      lastGrade: typeof grade === 'number' ? clamp01(grade) : 0,
    });
  }

  return units;
}
