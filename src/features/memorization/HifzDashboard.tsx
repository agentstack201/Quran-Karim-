'use client';

import { useState } from 'react';
import { TOTAL_JUZ, TOTAL_PAGES } from '@/constants';
import { Button, Card, Icon, Slider, type IconName } from '@/components/ui';
import { toArabicNumerals } from '@/utils';
import { AddRangeDialog } from './AddRangeDialog';
import { DailySession } from './DailySession';
import { Heatmap } from './Heatmap';
import { useMemorization } from './MemorizationProvider';
import { WeakPages } from './WeakPages';

/**
 * The ḥifẓ screen.
 *
 * Three questions, in the order a memoriser actually asks them:
 *
 *   1. What do I do today?      → the session
 *   2. Where do I stand?        → the figures
 *   3. Where am I weak?         → the map
 *
 * Deliberately not a scoreboard. There are no streaks, no badges and no
 * congratulation for showing up — the figures here are the ones that change
 * what a reader does next, and nothing is included merely because it could be
 * counted. Quranic memorisation does not need to be made compelling; it needs
 * to be made legible.
 */

type Figure = {
  readonly icon: IconName;
  readonly value: string;
  readonly label: string;
  readonly tone: 'primary' | 'accent';
};

export function HifzDashboard(): React.JSX.Element {
  const { progress, settings, setBudget, units, hydrated, empty, reset } = useMemorization();
  const [addOpen, setAddOpen] = useState(false);

  const percent = Math.round((progress.pages / TOTAL_PAGES) * 100);

  const figures: readonly Figure[] = [
    {
      icon: 'mushaf',
      value: toArabicNumerals(progress.pages),
      label: `صفحة محفوظة من ${toArabicNumerals(TOTAL_PAGES)}`,
      tone: 'primary',
    },
    {
      icon: 'layers',
      value: toArabicNumerals(progress.completeJuz),
      label: `جزء كامل من ${toArabicNumerals(TOTAL_JUZ)}`,
      tone: 'primary',
    },
    {
      icon: 'checkCircle',
      value: toArabicNumerals(progress.strong),
      label: 'صفحة قوية الآن',
      tone: 'primary',
    },
    {
      /*
       * Shown next to "strong" rather than folded into a single percentage.
       * "You have memorised 240 pages" and "31 of them are slipping" are
       * different facts, and the second is the one a ḥāfiẓ needs.
       */
      icon: 'alert',
      value: toArabicNumerals(progress.fading),
      label: 'صفحة تحتاج مراجعة',
      tone: 'accent',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6">
      <section aria-labelledby="hifz-today">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="hifz-today" className="text-xl font-bold text-ink">
            ورد اليوم
          </h2>
          <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={15} />
            أضف ما تحفظه
          </Button>
        </div>

        <DailySession />
      </section>

      {!empty && (
        <>
          <section aria-labelledby="hifz-standing">
            <h2 id="hifz-standing" className="mb-4 text-xl font-bold text-ink">
              أين أنت
            </h2>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {figures.map((figure) => (
                <Card key={figure.label} className="p-4 text-center">
                  <span
                    aria-hidden="true"
                    className={
                      figure.tone === 'accent'
                        ? 'mx-auto mb-2 grid size-9 place-items-center rounded-full bg-accent-soft text-accent'
                        : 'mx-auto mb-2 grid size-9 place-items-center rounded-full bg-primary-soft text-primary'
                    }
                  >
                    <Icon name={figure.icon} size={17} />
                  </span>
                  <dd className="text-2xl font-bold text-ink tabular-nums">{figure.value}</dd>
                  <dt className="mt-0.5 text-xs leading-snug text-ink-subtle">{figure.label}</dt>
                </Card>
              ))}
            </dl>

            <div className="mt-4">
              <div
                className="h-2 overflow-hidden rounded-full bg-background-subtle"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="نسبة ما حفظت من المصحف"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[inline-size] duration-500"
                  style={{ inlineSize: `${percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-subtle">
                {toArabicNumerals(percent)}٪ من المصحف
              </p>
            </div>
          </section>

          <section aria-labelledby="hifz-map">
            <h2 id="hifz-map" className="mb-1 text-xl font-bold text-ink">
              خريطة حفظك
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-ink-muted">
              كل مربّع صفحة، ولونه قوّة حفظك لها اليوم — تضعف الصفحة كلما طال العهد بها. الخريطة
              تُظهر الصورة، والقائمة تحتها تفتح ما يحتاج عملاً.
            </p>
            <Heatmap units={units} />

            <div className="mt-8">
              <WeakPages units={units} />
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="hifz-settings">
        <h2 id="hifz-settings" className="mb-4 text-xl font-bold text-ink">
          إعدادات الخطة
        </h2>

        <Card className="space-y-5 p-5">
          <Slider
            label="كم وحدة تحتمل في اليوم؟"
            value={settings.budget}
            min={1}
            max={30}
            step={1}
            onChange={setBudget}
            valueText={`${toArabicNumerals(settings.budget)} وحدة`}
            hint={`${toArabicNumerals(settings.budget)} وحدة`}
          />
          <p className="text-xs leading-relaxed text-ink-subtle">
            الوحدة صفحة مراجعة أو حفظ أو وصل. اختر ما تلتزم به فعلاً لا ما تتمناه — الخطة تُبنى على
            هذا الرقم، والرقم المبالغ فيه يصنع تأخّراً لا إنجازاً.
          </p>

          {hydrated && !empty && (
            <div className="border-t border-border pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('سيُحذف سجلّ حفظك كاملاً ولا يمكن التراجع. متأكد؟')) reset();
                }}
              >
                <Icon name="trash" size={15} />
                امسح سجلّ الحفظ
              </Button>
            </div>
          )}
        </Card>
      </section>

      <AddRangeDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
