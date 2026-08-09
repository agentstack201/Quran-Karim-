import { describe, expect, it } from 'vitest';
import { TOTAL_PAGES } from '@/constants';
import {
  advancePlan,
  computeDailyPortion,
  createPlan,
  dayKey,
  daysBetween,
  parsePlan,
  type KhatmahPlan,
} from '@/features/khatmah/plan';
import { getPageByVerseId, PAGE_LIST } from '@/services/quran';

const plan = (overrides: Partial<KhatmahPlan> = {}): KhatmahPlan => ({
  startedOn: '2026-01-01',
  days: 30,
  completedPages: 0,
  metOn: [],
  ...overrides,
});

describe('dayKey and daysBetween', () => {
  it('formats a local date, not a UTC one', () => {
    // Late evening local time falls on the *next* UTC day in eastern zones; a
    // reader's day has to end at their own midnight, not Greenwich's.
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 0, 5, 0, 15))).toBe('2026-01-05');
  });

  it('counts whole calendar days', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
});

describe('computeDailyPortion', () => {
  it('divides the Mus’haf evenly on the first day', () => {
    const portion = computeDailyPortion(plan(), '2026-01-01');

    expect(portion.day).toBe(1);
    expect(portion.from).toBe(1);
    // 604 pages over 30 days rounds up to 21 a day.
    expect(portion.pages).toBe(Math.ceil(TOTAL_PAGES / 30));
    expect(portion.percent).toBe(0);
  });

  it('starts the next portion where the last one ended', () => {
    const portion = computeDailyPortion(plan({ completedPages: 21 }), '2026-01-02');
    expect(portion.from).toBe(22);
  });

  /**
   * The behaviour the whole feature turns on.
   *
   * Missing days must stretch the remaining pace, never hand back a backlog.
   * A reader who skipped three days should be asked for a slightly longer
   * sitting — being asked for four days at once is what ends a khatmah.
   */
  it('rebalances after missed days instead of accumulating a backlog', () => {
    // Day 5 of 30, still on page 1: 604 pages left over 26 remaining days.
    const behind = computeDailyPortion(plan(), '2026-01-05');

    expect(behind.day).toBe(5);
    expect(behind.daysLeft).toBe(26);
    expect(behind.pages).toBe(Math.ceil(TOTAL_PAGES / 26));
    // Emphatically not four days' worth at once.
    expect(behind.pages).toBeLessThan(Math.ceil(TOTAL_PAGES / 30) * 2);
  });

  it('asks for less each day when the reader is ahead', () => {
    const onPace = computeDailyPortion(plan({ completedPages: 21 }), '2026-01-02');
    const ahead = computeDailyPortion(plan({ completedPages: 120 }), '2026-01-02');
    expect(ahead.pages).toBeLessThan(onPace.pages);
  });

  /** Past the deadline the pace holds; it does not demand the remainder at once. */
  it('keeps a steady pace once the plan has run over', () => {
    const overdue = computeDailyPortion(plan({ completedPages: 100 }), '2026-03-01');

    expect(overdue.overdue).toBe(true);
    expect(overdue.pages).toBe(Math.ceil(TOTAL_PAGES / 30));
    expect(overdue.pages).toBeLessThan(TOTAL_PAGES - 100);
  });

  it('keeps spreading the last pages over the days that remain', () => {
    // Day 29 of 30 with three pages left: two today, one tomorrow — not all
    // three today merely because the end is in sight.
    const nearly = computeDailyPortion(plan({ completedPages: TOTAL_PAGES - 3 }), '2026-01-29');

    expect(nearly.daysLeft).toBe(2);
    expect(nearly.from).toBe(TOTAL_PAGES - 2);
    expect(nearly.pages).toBe(2);
  });

  it('never runs past the end of the Mus’haf', () => {
    const lastDay = computeDailyPortion(plan({ completedPages: TOTAL_PAGES - 3 }), '2026-01-30');
    expect(lastDay.to).toBe(TOTAL_PAGES);
    expect(lastDay.pages).toBe(3);

    // Even a wildly over-long portion cannot point past the final page.
    const oneLeft = computeDailyPortion(
      plan({ completedPages: TOTAL_PAGES - 1, days: 1 }),
      '2026-01-01',
    );
    expect(oneLeft.to).toBe(TOTAL_PAGES);
    expect(oneLeft.pages).toBe(1);
  });

  it('reports completion once every page is behind them', () => {
    const done = computeDailyPortion(plan({ completedPages: TOTAL_PAGES }), '2026-01-20');
    expect(done.finished).toBe(true);
    expect(done.percent).toBe(100);
    expect(done.pagesLeft).toBe(0);
  });

  it('treats a plan opened before its start date as day one', () => {
    const portion = computeDailyPortion(plan({ startedOn: '2026-06-01' }), '2026-05-20');
    expect(portion.day).toBe(1);
  });
});

describe('advancePlan', () => {
  it('records progress and marks the day met', () => {
    const next = advancePlan(plan(), 21, '2026-01-01');
    expect(next.completedPages).toBe(21);
    expect(next.metOn).toEqual(['2026-01-01']);
  });

  /**
   * Revisiting Al-Fatihah mid-khatmah is reading, not a reset — a progress bar
   * that fell backwards for it would punish the wrong behaviour.
   */
  it('never moves backwards', () => {
    const current = plan({ completedPages: 200 });
    expect(advancePlan(current, 3, '2026-01-10')).toBe(current);
    expect(advancePlan(current, 200, '2026-01-10').completedPages).toBe(200);
  });

  it('does not mark the day met on partial progress', () => {
    const next = advancePlan(plan(), 5, '2026-01-01');
    expect(next.completedPages).toBe(5);
    expect(next.metOn).toEqual([]);
  });

  it('records a day only once', () => {
    const first = advancePlan(plan(), 21, '2026-01-01');
    const second = advancePlan(first, 42, '2026-01-01');
    expect(second.metOn).toEqual(['2026-01-01']);
  });

  it('clamps progress to the last page', () => {
    expect(advancePlan(plan(), 9999, '2026-01-01').completedPages).toBe(TOTAL_PAGES);
  });
});

describe('createPlan and parsePlan', () => {
  it('clamps an absurd plan length rather than accepting it', () => {
    expect(createPlan(0).days).toBe(1);
    expect(createPlan(100_000).days).toBe(730);
  });

  it('rejects stored data it cannot trust', () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan({ days: 30 })).toBeNull();
    expect(parsePlan({ startedOn: 'yesterday', days: 30 })).toBeNull();
    expect(parsePlan({ startedOn: '2026-01-01', days: 'thirty' })).toBeNull();
  });

  it('repairs a plan with out-of-range progress', () => {
    const restored = parsePlan({ startedOn: '2026-01-01', days: 30, completedPages: 99_999 });
    expect(restored?.completedPages).toBe(TOTAL_PAGES);

    const negative = parsePlan({ startedOn: '2026-01-01', days: 30, completedPages: -5 });
    expect(negative?.completedPages).toBe(0);
  });

  it('round-trips a created plan', () => {
    const created = createPlan(60, '2026-04-01');
    expect(parsePlan(JSON.parse(JSON.stringify(created)))).toEqual(created);
  });
});

describe('getPageByVerseId', () => {
  it('finds the page holding every page boundary', () => {
    for (const page of PAGE_LIST) {
      expect(getPageByVerseId(page.firstVerseId)?.id, `first of page ${page.id}`).toBe(page.id);
      expect(getPageByVerseId(page.lastVerseId)?.id, `last of page ${page.id}`).toBe(page.id);
    }
  });

  it('resolves every verse in the Mus’haf to exactly one page', () => {
    for (let verseId = 1; verseId <= 6236; verseId += 1) {
      expect(getPageByVerseId(verseId), `verse ${verseId}`).not.toBeNull();
    }
  });

  it('returns null outside the Mus’haf', () => {
    expect(getPageByVerseId(0)).toBeNull();
    expect(getPageByVerseId(6237)).toBeNull();
  });
});
