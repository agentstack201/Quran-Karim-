import { addDays, daysBetween, type DayKey } from '@/utils';
import {
  LAPSE_THRESHOLD,
  isLapse,
  type LearningState,
  type MemoryUnit,
  type MemoryUnitType,
} from './model';

/**
 * Spaced repetition, tuned for ḥifẓ.
 * -----------------------------------------------------------------------------
 * Everything here is a pure function of a unit and a date. No storage, no
 * React, no clock of its own — which is what makes the behaviour that decides
 * a memoriser's year testable directly, and auditable by someone who wants to
 * know why the app asked for page 47 today.
 *
 * ## Why not SM-2
 *
 * SM-2 — what Anki shipped for years — models independent cards graded by the
 * learner on a five-point scale. Ḥifẓ violates all three assumptions:
 *
 *   1. Units are **adjacent and entangled**. Reviewing a page genuinely
 *      strengthens its neighbours, because reaching the bottom of page 47
 *      means reciting into the top of page 48.
 *   2. The grade should be **measured, not declared**. Today it is still
 *      self-reported (see `ReviewOutcome`), but the seam is in place.
 *   3. Similar passages **actively interfere**. Reviewing one of a mutashābih
 *      pair in isolation can leave a memoriser *more* likely to derail, not
 *      less — an effect SM-2 has no way to express.
 *
 * So the core is FSRS-shaped — retrievability, stability, difficulty — with
 * three Quran-specific additions layered on top.
 *
 * ## Calibration
 *
 * ⚠ Every constant below is a **defensible starting estimate, not a measured
 * value**. FSRS's own weights were fitted on hundreds of millions of reviews of
 * general flashcards; nobody has published an equivalent fit for Quranic
 * memorisation, and pretending these numbers are derived would be a lie told in
 * a place people cannot check. They are grouped, named and documented precisely
 * so they can be replaced once this app has anonymised review histories of its
 * own to fit against.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Recall probability at which a unit becomes due.
 *
 * 0.9 is the conventional target: review just before you would have forgotten.
 * Lower means fewer, harder reviews; higher means more, easier ones.
 */
export const DEFAULT_RETENTION_TARGET = 0.9;

/** Stability floor, in days. Below this a unit is effectively unlearned. */
const MIN_STABILITY = 0.5;

/** Stability ceiling, in days. ~5.5 years — beyond this the model is guessing. */
const MAX_STABILITY = 2000;

/**
 * Initial stability for a newly memorised unit, by grade.
 *
 * Deliberately short. Fresh ḥifẓ decays far faster than intuition suggests, and
 * a first interval that is too long is the single most common way a memoriser
 * loses a page they thought they had.
 */
const INITIAL_STABILITY = { solid: 3, hesitant: 1.5, forgotten: 0.5 } as const;

/** Growth shape. See `nextStability` for how each term is used. */
const GROWTH = {
  /** Overall scale of a successful review's effect. */
  factor: 2.6,
  /** How much harder units grow more slowly. Applied as `(1.1 - difficulty)`. */
  difficultyWeight: 1,
  /**
   * Diminishing returns: an already-stable unit gains proportionally less.
   * Without this, intervals explode after a handful of easy reviews.
   */
  stabilityDecay: 0.3,
  /**
   * Reward for recalling something you were about to forget. Retrieval at low
   * `R` is what actually consolidates memory, so a review that lands late is
   * worth more than one that lands early.
   */
  retrievalGain: 2.2,
} as const;

/** What a lapse does to stability: a hard reset, but not all the way to zero. */
const LAPSE = { multiplier: 0.25, floor: MIN_STABILITY } as const;

/** How fast difficulty tracks observed performance, and where it reverts to. */
const DIFFICULTY = { step: 0.18, meanReversion: 0.03, anchor: 0.3 } as const;

/**
 * Fraction of a review's stability gain that spills onto adjacent pages.
 *
 * Reviewing page 47 really does touch 46 and 48 — you recite into the join.
 * Ignoring that would schedule reviews the reader has effectively already done.
 * Small, because it is a side effect and not a review.
 */
export const NEIGHBOUR_REINFORCEMENT = 0.15;

/**
 * Stability penalty for a unit with untrained lookalikes.
 *
 * Reviewing two confusable passages separately builds a false sense of
 * mastery: each feels solid alone, and they collide under pressure. Until the
 * *difference* has been drilled, the scheduler treats stability on such a unit
 * as partly illusory rather than earned.
 *
 * Inert until the mutashābihāt dataset lands — `interference` is 0 for every
 * unit today. The hook is here so the scheduler does not have to change later.
 */
export const INTERFERENCE_PENALTY = 0.25;

// ---------------------------------------------------------------------------
// Core model
// ---------------------------------------------------------------------------

/**
 * Probability of recalling a unit `elapsed` days after its last review.
 *
 * The FSRS forgetting curve: `R(t) = (1 + t / (9·S))⁻¹`. At `t = S` this gives
 * exactly 0.9, which is what makes stability mean "days until recall falls to
 * 90%" rather than an abstract score.
 */
export function retrievability(stability: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 1;
  const safeStability = Math.max(stability, MIN_STABILITY);
  return 1 / (1 + elapsedDays / (9 * safeStability));
}

/** Days until a unit's recall is expected to fall to `target`. */
export function intervalForRetention(
  stability: number,
  target: number = DEFAULT_RETENTION_TARGET,
): number {
  const clamped = Math.min(Math.max(target, 0.5), 0.99);
  // Inverting R(t): t = 9·S·(1/R − 1).
  return 9 * Math.max(stability, MIN_STABILITY) * (1 / clamped - 1);
}

/** Current recall probability for a unit, as of `today`. */
export function currentRetrievability(unit: MemoryUnit, today: DayKey): number {
  if (unit.lastReviewedOn === null) return 0;
  return retrievability(unit.stability, Math.max(0, daysBetween(unit.lastReviewedOn, today)));
}

/** The date a unit falls due. `null` for a unit never reviewed — due now. */
export function dueOn(unit: MemoryUnit, target: number = DEFAULT_RETENTION_TARGET): DayKey | null {
  if (unit.lastReviewedOn === null) return null;
  return addDays(unit.lastReviewedOn, Math.round(intervalForRetention(unit.stability, target)));
}

/** True when a unit should be reviewed on or before `today`. */
export function isDue(
  unit: MemoryUnit,
  today: DayKey,
  target: number = DEFAULT_RETENTION_TARGET,
): boolean {
  const due = dueOn(unit, target);
  return due === null || daysBetween(due, today) >= 0;
}

/**
 * Stability after a successful review.
 *
 * ```
 * S′ = S · (1 + factor · (1.1 − D) · S^−decay · (e^(gain·(1−R)) − 1) · grade)
 * ```
 *
 * Each term earns its place: harder units grow more slowly, already-stable
 * units gain proportionally less, and a recall that happened when `R` was low
 * is worth more than one that happened when the answer was still fresh.
 */
function nextStability(
  stability: number,
  difficulty: number,
  recall: number,
  grade: number,
): number {
  const growth =
    GROWTH.factor *
    (1.1 - GROWTH.difficultyWeight * difficulty) *
    Math.pow(Math.max(stability, MIN_STABILITY), -GROWTH.stabilityDecay) *
    (Math.exp(GROWTH.retrievalGain * (1 - recall)) - 1) *
    grade;

  return clampStability(stability * (1 + Math.max(growth, 0)));
}

/** Difficulty after a review, with mean reversion so it cannot drift forever. */
function nextDifficulty(difficulty: number, grade: number): number {
  // Grades above the anchor make a unit easier, below it harder.
  const moved = difficulty + DIFFICULTY.step * (0.75 - grade);
  const reverted = moved + DIFFICULTY.meanReversion * (DIFFICULTY.anchor - moved);
  return Math.min(1, Math.max(0, reverted));
}

function clampStability(value: number): number {
  if (!Number.isFinite(value)) return MIN_STABILITY;
  return Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, value));
}

/** The state a unit moves to after a review at this grade. */
function nextState(current: LearningState, grade: number): LearningState {
  if (isLapse(grade)) return 'relearning';
  if (current === 'new') return 'learning';
  // Two consecutive good reviews graduate a unit; one is not evidence.
  if (current === 'learning' || current === 'relearning') {
    return grade >= 0.8 ? 'review' : current;
  }
  return 'review';
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** A unit that has never been studied. */
export function createUnit(type: MemoryUnitType, id: number): MemoryUnit {
  return {
    type,
    id,
    state: 'new',
    stability: MIN_STABILITY,
    difficulty: DIFFICULTY.anchor,
    lastReviewedOn: null,
    reps: 0,
    lapses: 0,
    lastGrade: 0,
  };
}

/**
 * Applies a review to a unit.
 *
 * The first review of a new unit sets initial stability from a table rather
 * than growing it, because there is no prior stability to grow and the growth
 * curve is undefined at zero.
 *
 * `interference` is the 0–1 share of this unit's content that has untrained
 * lookalikes. It discounts the stability gain rather than the grade: the
 * reader really did recite it correctly, but in isolation, which is exactly
 * the condition under which a mutashābih feels mastered and is not.
 */
export function applyReview(
  unit: MemoryUnit,
  grade: number,
  today: DayKey,
  interference = 0,
): MemoryUnit {
  const clampedGrade = Math.min(1, Math.max(0, grade));
  const lapsed = isLapse(clampedGrade);

  const recall = currentRetrievability(unit, today);
  const difficulty = nextDifficulty(unit.difficulty, clampedGrade);

  let stability: number;

  if (lapsed) {
    stability = clampStability(Math.max(unit.stability * LAPSE.multiplier, LAPSE.floor));
  } else if (unit.reps === 0 || unit.lastReviewedOn === null) {
    stability = clampStability(
      clampedGrade >= 0.8
        ? INITIAL_STABILITY.solid
        : clampedGrade >= LAPSE_THRESHOLD
          ? INITIAL_STABILITY.hesitant
          : INITIAL_STABILITY.forgotten,
    );
  } else {
    stability = nextStability(unit.stability, difficulty, recall, clampedGrade);
  }

  if (interference > 0 && !lapsed) {
    const share = Math.min(1, Math.max(0, interference));
    stability = clampStability(stability * (1 - INTERFERENCE_PENALTY * share));
  }

  return {
    ...unit,
    state: nextState(unit.state, clampedGrade),
    stability,
    difficulty,
    lastReviewedOn: today,
    reps: unit.reps + 1,
    lapses: unit.lapses + (lapsed ? 1 : 0),
    lastGrade: clampedGrade,
  };
}

/**
 * The spillover a neighbouring page receives when its neighbour is reviewed.
 *
 * Expressed as a fraction of the gain a *real* review would have produced,
 * rather than as a flat multiplier of stability. The difference is not
 * cosmetic: a flat multiplier ignores how much the review was worth, and for a
 * page reviewed early — while recall was still high, so a real review gains
 * almost nothing — the spillover could exceed it. That would mean a reader
 * strengthened page 48 more by reviewing 47 than by reviewing 48, and a
 * scheduler that believes such a thing will happily send someone through the
 * Mus'haf reviewing every other page.
 *
 * Never moves `lastReviewedOn`. The page was not reviewed, and claiming
 * otherwise would let coverage look complete when half of it was inferred.
 */
export function applyNeighbourReinforcement(
  unit: MemoryUnit,
  grade: number,
  today: DayKey,
): MemoryUnit {
  if (unit.reps === 0 || isLapse(grade)) return unit;

  const gain = applyReview(unit, grade, today).stability - unit.stability;
  if (gain <= 0) return unit;

  return {
    ...unit,
    stability: clampStability(unit.stability + NEIGHBOUR_REINFORCEMENT * gain),
  };
}

/**
 * Seeds a unit the reader says they already know.
 *
 * A ḥāfiẓ arriving with fifteen juzʾ memorised cannot be asked to tap through
 * three hundred pages, and starting them from zero would bury them under
 * fabricated review debt on day one. So the app takes their word for it — but
 * conservatively: `confidence` maps to a stability of days-to-weeks, not years,
 * so the first real review arrives soon enough to correct an overestimate
 * before it costs them anything.
 *
 * `reviewedOn` is set so the unit is not immediately due; the reader is
 * declaring a state, not doing a review.
 */
export function seedKnownUnit(
  type: MemoryUnitType,
  id: number,
  confidence: 'strong' | 'moderate' | 'weak',
  today: DayKey,
): MemoryUnit {
  const stability = { strong: 21, moderate: 7, weak: 2 }[confidence];
  const difficulty = { strong: 0.2, moderate: 0.3, weak: 0.45 }[confidence];

  return {
    type,
    id,
    state: 'review',
    stability,
    difficulty,
    lastReviewedOn: today,
    reps: 1,
    lapses: 0,
    // Not a graded review — recorded as neutral so it cannot flatter the
    // reader's statistics or skew a future calibration.
    lastGrade: 0,
  };
}
