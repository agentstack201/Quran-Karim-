'use client';

import Link from 'next/link';
import { ROUTES, TOTAL_PAGES } from '@/constants';
import { Button, Card, Icon, Skeleton } from '@/components/ui';
import { getChapter, getPage } from '@/services/quran';
import { toArabicNumerals } from '@/utils';
import { PLAN_LENGTHS } from './plan';
import { useKhatmah } from './KhatmahProvider';

/** Circumference of the progress ring, at r=34. */
const RING = 2 * Math.PI * 34;

/**
 * Today's portion of the khatmah.
 *
 * A ring rather than a bar: a khatmah is a circuit you come back around to, and
 * the shape says at a glance how much of the Mus'haf is behind you without
 * anyone reading a number.
 */
function ProgressRing({ percent }: { readonly percent: number }): React.JSX.Element {
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-sunken)" strokeWidth="7" />
      <circle
        cx="40"
        cy="40"
        r="34"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - percent / 100)}
        className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-soft)]"
      />
    </svg>
  );
}

export function KhatmahCard(): React.JSX.Element {
  const { plan, portion, hydrated, start, abandon, completeToday } = useKhatmah();

  if (!hydrated) {
    return (
      <Card className="p-5" aria-busy="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-44" />
        <Skeleton className="mt-2.5 h-3 w-32" />
      </Card>
    );
  }

  // No plan yet: offer the choice rather than an empty state, since the whole
  // feature is one tap away and explaining it costs more than starting it.
  if (!plan || !portion) {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-subtle">
          <Icon name="mushaf" size={14} />
          خطة ختمة
        </p>
        <h3 className="mt-2.5 text-lg font-bold text-ink">اختم المصحف على مهل</h3>
        <p className="mt-1.5 text-sm text-ink-muted">
          اختر مدةً، ويحسب التطبيق وردك كل يوم. وإن تأخّرت يُعيد التوزيع على ما تبقّى — بلا تراكم.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PLAN_LENGTHS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => start(days)}
              className="rounded-sm border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              {toArabicNumerals(days)} يوماً
            </button>
          ))}
        </div>
      </Card>
    );
  }

  if (portion.finished) {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Icon name="checkCircle" size={14} />
          تمّت الختمة
        </p>
        <h3 className="mt-2.5 text-lg font-bold text-ink">
          ختمت المصحف في {toArabicNumerals(portion.day)} يوماً
        </h3>
        <p className="mt-1.5 text-sm text-ink-muted">تقبّل الله. ابدأ ختمة جديدة متى شئت.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLAN_LENGTHS.slice(0, 4).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => start(days)}
              className="rounded-sm border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-200 hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              {toArabicNumerals(days)} يوماً
            </button>
          ))}
        </div>
      </Card>
    );
  }

  const startPage = getPage(portion.from);
  const opening = startPage ? getChapter(startPage.start.surah) : null;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <ProgressRing percent={portion.percent} />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Icon name="clock" size={14} />
            ورد اليوم · اليوم {toArabicNumerals(portion.day)} من {toArabicNumerals(plan.days)}
          </p>

          <h3 className="mt-2 text-lg font-bold text-ink">
            {portion.pages === 1
              ? `صفحة ${toArabicNumerals(portion.from)}`
              : `الصفحات ${toArabicNumerals(portion.from)}–${toArabicNumerals(portion.to)}`}
          </h3>

          <p className="mt-1 text-sm text-ink-muted">
            {opening && <span className="font-quran">{opening.name}</span>}
            {opening && ' · '}
            {toArabicNumerals(portion.pages)}{' '}
            {portion.pages === 1 ? 'صفحة' : portion.pages === 2 ? 'صفحتان' : 'صفحات'}
          </p>

          <p className="mt-1 text-xs text-ink-subtle tabular-nums">
            {toArabicNumerals(plan.completedPages)} من {toArabicNumerals(TOTAL_PAGES)} صفحة ·{' '}
            {toArabicNumerals(portion.percent)}٪
            {portion.overdue && ' · تجاوزت المدة، والوتيرة كما هي'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={ROUTES.page(portion.from)}>
          <Button size="sm" iconStart="arrowStart">
            ابدأ ورد اليوم
          </Button>
        </Link>
        <Button variant="ghost" size="sm" iconStart="check" onClick={completeToday}>
          قرأته
        </Button>
        <button
          type="button"
          onClick={abandon}
          className="ms-auto rounded-xs text-[0.6875rem] text-ink-subtle underline-offset-2 transition-colors duration-200 hover:text-danger hover:underline"
        >
          إلغاء الخطة
        </button>
      </div>
    </Card>
  );
}
