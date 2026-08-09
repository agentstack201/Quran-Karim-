import { describe, expect, it } from 'vitest';
import {
  NEW_WORK_DEBT_LIMIT,
  buildDailySession,
  summariseProgress,
} from '@/features/memorization/session';
import { createUnit, seedKnownUnit } from '@/features/memorization/srs';
import {
  deserialise,
  gradeFromOutcome,
  parseUnitKey,
  serialise,
  unitKey,
  type MemoryUnit,
  type MemoryUnitKey,
} from '@/features/memorization/model';
import { applyReview } from '@/features/memorization/srs';
import { addDays } from '@/utils';
import { getPage } from '@/services/quran';

const TODAY = '2026-03-01';

/** Maps a page to its juzʾ using the real Mus'haf index. */
const pageToJuz = (page: number): number => getPage(page)?.juz[0] ?? 1;

/** A map of pages, each reviewed `daysAgo` at the given stability. */
function pages(
  spec: readonly {
    id: number;
    daysAgo: number;
    stability: number;
    lapses?: number;
    difficulty?: number;
  }[],
): Map<MemoryUnitKey, MemoryUnit> {
  const units = new Map<MemoryUnitKey, MemoryUnit>();
  for (const item of spec) {
    units.set(unitKey('page', item.id), {
      ...createUnit('page', item.id),
      state: 'review',
      stability: item.stability,
      difficulty: item.difficulty ?? 0.3,
      lastReviewedOn: addDays(TODAY, -item.daysAgo),
      reps: 3,
      lapses: item.lapses ?? 0,
      lastGrade: 0.9,
    });
  }
  return units;
}

describe('buildDailySession', () => {
  it('never returns more items than the reader asked for', () => {
    const units = pages(
      Array.from({ length: 100 }, (_, index) => ({ id: index + 1, daysAgo: 90, stability: 2 })),
    );

    for (const budget of [1, 5, 20]) {
      const session = buildDailySession(units, TODAY, { budget, queue: [] });
      expect(session.items.length).toBeLessThanOrEqual(budget);
    }
  });

  /**
   * The point of the budget. Showing "47 due" is true, useless, and the single
   * most reliable way to make someone close the app for good.
   */
  it('reports the backlog without putting it in the session', () => {
    const units = pages(
      Array.from({ length: 50 }, (_, index) => ({ id: index + 1, daysAgo: 90, stability: 2 })),
    );

    const session = buildDailySession(units, TODAY, { budget: 10, queue: [] });
    expect(session.items).toHaveLength(10);
    expect(session.dueTotal).toBe(50);
    expect(session.backlog).toBeGreaterThan(0);
  });

  it('puts the weakest recall first', () => {
    const units = pages([
      { id: 1, daysAgo: 30, stability: 5 },
      { id: 2, daysAgo: 300, stability: 5 },
      { id: 3, daysAgo: 60, stability: 5 },
    ]);

    const session = buildDailySession(units, TODAY, { budget: 3, queue: [] });
    const order = session.items.map((item) => item.unit.id);
    expect(order[0]).toBe(2);
  });

  it('breaks ties in Mus’haf order rather than arbitrarily', () => {
    const units = pages([
      { id: 30, daysAgo: 90, stability: 3 },
      { id: 10, daysAgo: 90, stability: 3 },
      { id: 20, daysAgo: 90, stability: 3 },
    ]);

    const session = buildDailySession(units, TODAY, { budget: 3, queue: [] });
    expect(session.items.map((item) => item.unit.id)).toEqual([10, 20, 30]);
  });

  it('introduces new pages from the queue when there is room', () => {
    const session = buildDailySession(new Map(), TODAY, { budget: 10, queue: [1, 2, 3] });
    const fresh = session.items.filter((item) => item.reason === 'fresh');
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((item) => item.unit.reps === 0)).toBe(true);
  });

  it('never re-introduces a page already being tracked', () => {
    const units = pages([{ id: 1, daysAgo: 0, stability: 20 }]);
    const session = buildDailySession(units, TODAY, { budget: 10, queue: [1, 2] });
    const fresh = session.items.filter((item) => item.reason === 'fresh');
    expect(fresh.map((item) => item.unit.id)).not.toContain(1);
  });

  /**
   * What every teacher of ḥifẓ says and almost no app enforces: new pages laid
   * on top of crumbling old ones destroy both.
   */
  it('suspends new memorisation once review debt is too high', () => {
    const budget = 10;
    const overdue = budget * NEW_WORK_DEBT_LIMIT + 1;
    const units = pages(
      Array.from({ length: overdue }, (_, index) => ({
        id: index + 1,
        daysAgo: 120,
        stability: 2,
      })),
    );

    const session = buildDailySession(units, TODAY, { budget, queue: [500, 501] });
    expect(session.newWorkPaused).toBe(true);
    expect(session.items.some((item) => item.reason === 'fresh')).toBe(false);
  });

  it('resumes new memorisation once the debt is cleared', () => {
    const units = pages([{ id: 1, daysAgo: 120, stability: 2 }]);
    const session = buildDailySession(units, TODAY, { budget: 10, queue: [500] });
    expect(session.newWorkPaused).toBe(false);
    expect(session.items.some((item) => item.reason === 'fresh')).toBe(true);
  });

  it('spends leftover budget on reviews rather than shrinking the session', () => {
    // Nothing queued and no links: the review slots alone are 60% of budget,
    // but the reader offered ten units of time and there are ten due pages.
    const units = pages(
      Array.from({ length: 10 }, (_, index) => ({ id: index + 1, daysAgo: 90, stability: 2 })),
    );

    const session = buildDailySession(units, TODAY, { budget: 10, queue: [] });
    expect(session.items).toHaveLength(10);
  });

  it('includes fragile pages that are not yet due', () => {
    const units = pages([
      // Not due — reviewed today — but it has broken before and scores hard.
      { id: 7, daysAgo: 0, stability: 30, lapses: 2, difficulty: 0.8 },
    ]);

    const session = buildDailySession(units, TODAY, { budget: 10, queue: [] });
    expect(session.items.some((item) => item.reason === 'weak' && item.unit.id === 7)).toBe(true);
  });

  it('schedules page links alongside pages', () => {
    const units = new Map<MemoryUnitKey, MemoryUnit>([
      [unitKey('link', 5), { ...createUnit('link', 5), reps: 1, lastReviewedOn: null }],
    ]);

    const session = buildDailySession(units, TODAY, { budget: 10, queue: [] });
    expect(session.items.some((item) => item.reason === 'link')).toBe(true);
  });

  it('never lists the same unit twice', () => {
    const units = pages([
      { id: 1, daysAgo: 200, stability: 1, lapses: 3, difficulty: 0.9 },
      { id: 2, daysAgo: 200, stability: 1, lapses: 3, difficulty: 0.9 },
    ]);

    const session = buildDailySession(units, TODAY, { budget: 20, queue: [1, 2] });
    const keys = session.items.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('survives a nonsense budget without throwing', () => {
    for (const budget of [0, -5, Number.NaN]) {
      const session = buildDailySession(pages([{ id: 1, daysAgo: 90, stability: 2 }]), TODAY, {
        budget,
        queue: [],
      });
      expect(session.items.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('ignores page numbers outside the Mus’haf in the queue', () => {
    const session = buildDailySession(new Map(), TODAY, {
      budget: 10,
      queue: [0, -1, 605, 9999, 3],
    });
    const fresh = session.items.filter((item) => item.reason === 'fresh');
    expect(fresh.map((item) => item.unit.id)).toEqual([3]);
  });

  it('returns an empty session for a reader with nothing tracked', () => {
    const session = buildDailySession(new Map(), TODAY, { budget: 10, queue: [] });
    expect(session.items).toHaveLength(0);
    expect(session.dueTotal).toBe(0);
    expect(session.newWorkPaused).toBe(false);
  });
});

describe('summariseProgress', () => {
  it('separates pages that are solid from pages that are slipping', () => {
    const units = new Map<MemoryUnitKey, MemoryUnit>();
    units.set(unitKey('page', 1), seedKnownUnit('page', 1, 'strong', TODAY));
    units.set(unitKey('page', 2), {
      ...seedKnownUnit('page', 2, 'weak', TODAY),
      lastReviewedOn: addDays(TODAY, -120),
    });

    const progress = summariseProgress(units, TODAY, pageToJuz);
    expect(progress.pages).toBe(2);
    expect(progress.strong).toBe(1);
    expect(progress.fading).toBe(1);
  });

  it('counts a juzʾ complete only when every one of its pages is tracked', () => {
    const units = new Map<MemoryUnitKey, MemoryUnit>();
    // Juz 30 runs from page 582 to 604.
    for (let page = 582; page <= 604; page += 1) {
      units.set(unitKey('page', page), seedKnownUnit('page', page, 'strong', TODAY));
    }

    expect(summariseProgress(units, TODAY, pageToJuz).completeJuz).toBe(1);

    units.delete(unitKey('page', 590));
    expect(summariseProgress(units, TODAY, pageToJuz).completeJuz).toBe(0);
  });

  it('does not count links as pages', () => {
    const units = new Map<MemoryUnitKey, MemoryUnit>();
    units.set(unitKey('link', 1), seedKnownUnit('link', 1, 'strong', TODAY));

    const progress = summariseProgress(units, TODAY, pageToJuz);
    expect(progress.pages).toBe(0);
    expect(progress.links).toBe(1);
  });

  it('reports zero rather than NaN for an empty history', () => {
    const progress = summariseProgress(new Map(), TODAY, pageToJuz);
    expect(progress.meanRetrievability).toBe(0);
    expect(progress.pages).toBe(0);
  });
});

describe('persistence', () => {
  it('round-trips a history through the compact format', () => {
    const units = new Map<MemoryUnitKey, MemoryUnit>();
    units.set(unitKey('page', 42), applyReview(createUnit('page', 42), 0.9, TODAY));
    units.set(unitKey('link', 42), seedKnownUnit('link', 42, 'moderate', TODAY));

    const restored = deserialise(JSON.parse(JSON.stringify(serialise(units))));
    expect(restored).not.toBeNull();
    expect(restored?.size).toBe(2);

    const page = restored?.get(unitKey('page', 42));
    expect(page?.type).toBe('page');
    expect(page?.id).toBe(42);
    expect(page?.lastReviewedOn).toBe(TODAY);
    expect(page?.stability).toBeCloseTo(units.get(unitKey('page', 42))?.stability ?? 0, 1);
  });

  /**
   * Losing one page's history is a small harm. Losing a year of ḥifẓ tracking
   * because a single field was corrupted is not a trade anyone would accept.
   */
  it('drops only the corrupt records, keeping the rest', () => {
    const good = serialise(pages([{ id: 1, daysAgo: 1, stability: 10 }]));
    const mixed = {
      ...good,
      units: [
        ...good.units,
        'not an array',
        [0, 9999, 2, 5, 0.3, TODAY, 1, 0, 0.9],
        [0, 3, 2, -1, 0.3, TODAY, 1, 0, 0.9],
        [0, 4, 2, 5, 0.3, 'not-a-date', 1, 0, 0.9],
      ],
    };

    const restored = deserialise(JSON.parse(JSON.stringify(mixed)));
    expect(restored?.size).toBe(1);
    expect(restored?.has(unitKey('page', 1))).toBe(true);
  });

  it('refuses a snapshot from an incompatible version', () => {
    const snapshot = { ...serialise(pages([{ id: 1, daysAgo: 1, stability: 10 }])), version: 99 };
    expect(deserialise(snapshot)).toBeNull();
  });

  it('refuses input that is not a snapshot at all', () => {
    for (const value of [null, undefined, 42, 'x', []]) {
      expect(deserialise(value)).toBeNull();
    }
  });
});

describe('parseUnitKey', () => {
  it('round-trips every valid key', () => {
    for (const [type, id] of [
      ['page', 1],
      ['page', 604],
      ['link', 603],
    ] as const) {
      expect(parseUnitKey(unitKey(type, id))).toEqual({ type, id });
    }
  });

  it('rejects ids past the end of the Mus’haf', () => {
    expect(parseUnitKey('p:605')).toBeNull();
    // There is no link out of the last page.
    expect(parseUnitKey('l:604')).toBeNull();
  });

  it('rejects malformed keys', () => {
    for (const key of ['', 'p', 'p:', 'x:1', 'p:0', 'p:-1', 'p:1:2', 'page:1']) {
      expect(parseUnitKey(key)).toBeNull();
    }
  });
});

describe('gradeFromOutcome + applyReview together', () => {
  it('turns a week of honest self-reports into a sensible schedule', () => {
    let unit = createUnit('page', 1);
    let day = TODAY;

    for (const rating of ['solid', 'solid', 'hesitant', 'solid'] as const) {
      unit = applyReview(unit, gradeFromOutcome({ kind: 'self-reported', rating }), day);
      day = addDays(day, 2);
    }

    expect(unit.state).toBe('review');
    expect(unit.lapses).toBe(0);
    // Four good sessions should have bought more than a couple of days.
    expect(unit.stability).toBeGreaterThan(4);
  });
});
