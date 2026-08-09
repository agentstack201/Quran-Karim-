import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETENTION_TARGET,
  applyNeighbourReinforcement,
  applyReview,
  createUnit,
  currentRetrievability,
  dueOn,
  intervalForRetention,
  isDue,
  retrievability,
  seedKnownUnit,
} from '@/features/memorization/srs';
import { gradeFromOutcome, isLapse, type MemoryUnit } from '@/features/memorization/model';
import { addDays, daysBetween } from '@/utils';

const TODAY = '2026-03-01';

/** A unit reviewed `daysAgo`, at a given stability. */
function reviewed(daysAgo: number, stability: number, overrides: Partial<MemoryUnit> = {}) {
  return {
    ...createUnit('page', 42),
    state: 'review' as const,
    stability,
    difficulty: 0.3,
    lastReviewedOn: addDays(TODAY, -daysAgo),
    reps: 5,
    lastGrade: 0.9,
    ...overrides,
  };
}

describe('retrievability', () => {
  it('is 1 the moment a unit is reviewed', () => {
    expect(retrievability(10, 0)).toBe(1);
  });

  /**
   * This is the definition the whole scheduler rests on. If stability stops
   * meaning "days until 90% recall", every interval it produces is arbitrary.
   */
  it('is exactly 0.9 after a number of days equal to stability', () => {
    for (const stability of [1, 5, 30, 365]) {
      expect(retrievability(stability, stability)).toBeCloseTo(0.9, 10);
    }
  });

  it('decays monotonically and never reaches zero', () => {
    let previous = 1;
    for (const days of [1, 7, 30, 180, 3650]) {
      const value = retrievability(10, days);
      expect(value).toBeLessThan(previous);
      expect(value).toBeGreaterThan(0);
      previous = value;
    }
  });

  it('decays more slowly the more stable a unit is', () => {
    expect(retrievability(100, 30)).toBeGreaterThan(retrievability(10, 30));
  });
});

describe('intervalForRetention', () => {
  it('round-trips with retrievability', () => {
    for (const stability of [1, 12, 200]) {
      const interval = intervalForRetention(stability, 0.9);
      expect(retrievability(stability, interval)).toBeCloseTo(0.9, 10);
    }
  });

  it('asks for shorter intervals when the reader wants higher retention', () => {
    expect(intervalForRetention(30, 0.95)).toBeLessThan(intervalForRetention(30, 0.85));
  });
});

describe('isDue', () => {
  it('treats a never-reviewed unit as due immediately', () => {
    expect(isDue(createUnit('page', 1), TODAY)).toBe(true);
    expect(dueOn(createUnit('page', 1))).toBeNull();
  });

  it('is not due the day after a review at meaningful stability', () => {
    expect(isDue(reviewed(1, 30), TODAY)).toBe(false);
  });

  it('is due once the interval has elapsed', () => {
    const unit = reviewed(0, 10);
    const due = dueOn(unit, DEFAULT_RETENTION_TARGET);
    expect(due).not.toBeNull();
    expect(isDue(unit, due as string)).toBe(true);
    expect(isDue(unit, addDays(due as string, -1))).toBe(false);
  });
});

describe('applyReview', () => {
  it('gives a new unit a short first interval, not a long one', () => {
    const first = applyReview(createUnit('page', 1), 0.95, TODAY);
    // Fresh ḥifẓ decays fast; a first interval measured in weeks is how a
    // page someone "memorised" is quietly lost.
    expect(first.stability).toBeLessThanOrEqual(4);
    expect(first.reps).toBe(1);
    expect(first.state).toBe('learning');
  });

  it('grows stability on a successful review', () => {
    const before = reviewed(10, 10);
    const after = applyReview(before, 0.95, TODAY);
    expect(after.stability).toBeGreaterThan(before.stability);
    expect(after.lapses).toBe(0);
    expect(after.lastReviewedOn).toBe(TODAY);
  });

  /**
   * Retrieval at low recall is what consolidates memory. A review that lands
   * late should therefore be worth more than one that lands early — otherwise
   * the model rewards over-reviewing, which wastes the reader's time.
   */
  it('rewards a late review more than an early one', () => {
    const early = applyReview(reviewed(1, 20), 0.95, TODAY);
    const late = applyReview(reviewed(40, 20), 0.95, TODAY);
    expect(late.stability).toBeGreaterThan(early.stability);
  });

  it('grows harder units more slowly than easier ones', () => {
    const easy = applyReview(reviewed(10, 20, { difficulty: 0.1 }), 0.9, TODAY);
    const hard = applyReview(reviewed(10, 20, { difficulty: 0.9 }), 0.9, TODAY);
    expect(easy.stability).toBeGreaterThan(hard.stability);
  });

  it('applies diminishing returns as a unit becomes stable', () => {
    const young = reviewed(5, 5);
    const old = reviewed(5, 500);
    const youngGain = applyReview(young, 0.9, TODAY).stability / young.stability;
    const oldGain = applyReview(old, 0.9, TODAY).stability / old.stability;
    expect(youngGain).toBeGreaterThan(oldGain);
  });

  it('collapses stability and records a lapse on a failure', () => {
    const before = reviewed(30, 40);
    const after = applyReview(before, 0.1, TODAY);
    expect(after.stability).toBeLessThan(before.stability);
    expect(after.lapses).toBe(1);
    expect(after.state).toBe('relearning');
  });

  /**
   * A hesitant recall is still a recall. Punishing it would teach readers that
   * honesty costs them, and a self-reported scale that people game is worse
   * than no scale at all.
   */
  it('does not treat a hesitant review as a lapse', () => {
    const after = applyReview(
      reviewed(10, 20),
      gradeFromOutcome({
        kind: 'self-reported',
        rating: 'hesitant',
      }),
      TODAY,
    );
    expect(after.lapses).toBe(0);
    expect(after.state).not.toBe('relearning');
  });

  it('needs two good reviews to graduate out of learning', () => {
    let unit = applyReview(createUnit('page', 1), 0.95, TODAY);
    expect(unit.state).toBe('learning');
    unit = applyReview(unit, 0.95, addDays(TODAY, 3));
    expect(unit.state).toBe('review');
  });

  it('makes difficulty rise on poor grades and fall on good ones', () => {
    const harder = applyReview(reviewed(10, 20), 0.2, TODAY);
    const easier = applyReview(reviewed(10, 20), 1, TODAY);
    expect(harder.difficulty).toBeGreaterThan(0.3);
    expect(easier.difficulty).toBeLessThan(0.3);
  });

  it('keeps stability and difficulty inside their bounds under abuse', () => {
    let unit = createUnit('page', 1);
    for (let index = 0; index < 200; index += 1) {
      unit = applyReview(unit, 1, addDays(TODAY, index * 400));
      expect(unit.stability).toBeGreaterThan(0);
      expect(unit.stability).toBeLessThanOrEqual(2000);
      expect(unit.difficulty).toBeGreaterThanOrEqual(0);
      expect(unit.difficulty).toBeLessThanOrEqual(1);
    }

    for (let index = 0; index < 200; index += 1) {
      unit = applyReview(unit, 0, addDays(TODAY, index));
      expect(unit.stability).toBeGreaterThanOrEqual(0.5);
      expect(unit.difficulty).toBeLessThanOrEqual(1);
    }
  });

  it('tolerates a grade outside 0–1 rather than producing nonsense', () => {
    expect(applyReview(reviewed(5, 10), 42, TODAY).lastGrade).toBe(1);
    expect(applyReview(reviewed(5, 10), -3, TODAY).lastGrade).toBe(0);
  });

  /**
   * Reviewing one of a confusable pair in isolation builds a mastery that
   * collapses under pressure. The scheduler must not credit it in full.
   */
  it('discounts the gain when a unit has untrained lookalikes', () => {
    const clean = applyReview(reviewed(10, 20), 0.95, TODAY, 0);
    const entangled = applyReview(reviewed(10, 20), 0.95, TODAY, 1);
    expect(entangled.stability).toBeLessThan(clean.stability);
  });

  it('does not discount a lapse for interference', () => {
    const clean = applyReview(reviewed(10, 20), 0.1, TODAY, 0);
    const entangled = applyReview(reviewed(10, 20), 0.1, TODAY, 1);
    expect(entangled.stability).toBe(clean.stability);
  });
});

describe('applyNeighbourReinforcement', () => {
  it('strengthens a neighbour a little without marking it reviewed', () => {
    const before = reviewed(10, 20);
    const after = applyNeighbourReinforcement(before, 0.9, TODAY);
    expect(after.stability).toBeGreaterThan(before.stability);
    // The crucial part: the page was not reviewed, and must not look reviewed.
    expect(after.lastReviewedOn).toBe(before.lastReviewedOn);
    expect(after.reps).toBe(before.reps);
  });

  it('gives less than a real review would', () => {
    const before = reviewed(10, 20);
    const spillover = applyNeighbourReinforcement(before, 0.95, TODAY).stability;
    const real = applyReview(before, 0.95, TODAY).stability;
    expect(spillover).toBeLessThan(real);
  });

  /**
   * The regression this function was rewritten for. A flat multiplier of
   * stability beat a real review whenever the review landed early — recall
   * still high, so the real gain was small. If that is ever true again, the
   * scheduler is telling readers that reviewing page 47 helps page 48 more
   * than reviewing page 48 does.
   */
  it('never beats a real review, at any elapsed time or stability', () => {
    for (const daysAgo of [0, 1, 3, 10, 40, 200]) {
      for (const stability of [1, 5, 20, 100, 800]) {
        const before = reviewed(daysAgo, stability);
        const spillover = applyNeighbourReinforcement(before, 0.95, TODAY).stability;
        const real = applyReview(before, 0.95, TODAY).stability;
        expect(spillover).toBeLessThanOrEqual(real);
      }
    }
  });

  it('does nothing for an untouched neighbour or after a lapse', () => {
    const untouched = createUnit('page', 5);
    expect(applyNeighbourReinforcement(untouched, 0.9, TODAY)).toBe(untouched);

    const known = reviewed(10, 20);
    expect(applyNeighbourReinforcement(known, 0.1, TODAY)).toBe(known);
  });
});

describe('seedKnownUnit', () => {
  it('trusts the reader but schedules a real review soon', () => {
    const seeded = seedKnownUnit('page', 100, 'strong', TODAY);
    expect(seeded.state).toBe('review');
    expect(isDue(seeded, TODAY)).toBe(false);

    const due = dueOn(seeded);
    expect(due).not.toBeNull();
    // Weeks, not years: an overestimate must be caught while it is cheap.
    expect(daysBetween(TODAY, due as string)).toBeLessThanOrEqual(60);
  });

  it('orders the confidence levels sensibly', () => {
    const strong = seedKnownUnit('page', 1, 'strong', TODAY);
    const moderate = seedKnownUnit('page', 2, 'moderate', TODAY);
    const weak = seedKnownUnit('page', 3, 'weak', TODAY);

    expect(strong.stability).toBeGreaterThan(moderate.stability);
    expect(moderate.stability).toBeGreaterThan(weak.stability);
  });

  it('does not record a grade it never measured', () => {
    expect(seedKnownUnit('page', 1, 'strong', TODAY).lastGrade).toBe(0);
  });
});

describe('currentRetrievability', () => {
  it('is zero for a unit never reviewed', () => {
    expect(currentRetrievability(createUnit('page', 1), TODAY)).toBe(0);
  });

  it('does not exceed 1 when the clock moves backwards', () => {
    // A reader crossing a time zone, or correcting their device clock.
    const unit = reviewed(-5, 20);
    expect(currentRetrievability(unit, TODAY)).toBeLessThanOrEqual(1);
  });
});

describe('gradeFromOutcome', () => {
  it('maps the three self-reported rungs in order', () => {
    const solid = gradeFromOutcome({ kind: 'self-reported', rating: 'solid' });
    const hesitant = gradeFromOutcome({ kind: 'self-reported', rating: 'hesitant' });
    const forgotten = gradeFromOutcome({ kind: 'self-reported', rating: 'forgotten' });

    expect(solid).toBeGreaterThan(hesitant);
    expect(hesitant).toBeGreaterThan(forgotten);
    expect(isLapse(solid)).toBe(false);
    expect(isLapse(hesitant)).toBe(false);
    expect(isLapse(forgotten)).toBe(true);
  });

  it('scores a flawless measured recitation near the top', () => {
    const grade = gradeFromOutcome({
      kind: 'measured',
      accuracy: 1,
      fluency: 1,
      assists: 0,
      words: 150,
    });
    expect(grade).toBeCloseTo(1, 5);
  });

  it('weighs accuracy above fluency', () => {
    const inaccurate = gradeFromOutcome({
      kind: 'measured',
      accuracy: 0.5,
      fluency: 1,
      assists: 0,
      words: 150,
    });
    const halting = gradeFromOutcome({
      kind: 'measured',
      accuracy: 1,
      fluency: 0.5,
      assists: 0,
      words: 150,
    });
    expect(halting).toBeGreaterThan(inaccurate);
  });

  it('penalises assists relative to passage length', () => {
    const onShortPassage = gradeFromOutcome({
      kind: 'measured',
      accuracy: 1,
      fluency: 1,
      assists: 3,
      words: 30,
    });
    const onLongPassage = gradeFromOutcome({
      kind: 'measured',
      accuracy: 1,
      fluency: 1,
      assists: 3,
      words: 300,
    });
    expect(onLongPassage).toBeGreaterThan(onShortPassage);
  });

  it('never leaves the 0–1 range on hostile input', () => {
    const grade = gradeFromOutcome({
      kind: 'measured',
      accuracy: Number.NaN,
      fluency: -5,
      assists: 1000,
      words: 0,
    });
    expect(grade).toBeGreaterThanOrEqual(0);
    expect(grade).toBeLessThanOrEqual(1);
  });
});
