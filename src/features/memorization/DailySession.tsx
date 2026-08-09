'use client';

import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Badge, Button, Card, Icon, useToast } from '@/components/ui';
import { getChapter, getPage } from '@/services/quran';
import { toArabicNumerals } from '@/utils';
import { useMemorization } from './MemorizationProvider';
import type { SessionItem } from './session';

/**
 * Today's work.
 *
 * The whole screen is built around one refusal: **never show the backlog as the
 * headline.** A memoriser who opens this and reads "47 pages due" closes it,
 * and the number was true. The session is a day's work, in priority order, and
 * arrears are mentioned once, quietly, in words rather than as a scoreboard.
 */

/** Names the reason an item is in today's session, in the reader's language. */
const REASONS: Record<SessionItem['reason'], { label: string; tone: 'primary' | 'accent' }> = {
  due: { label: 'مراجعة', tone: 'primary' },
  fresh: { label: 'حفظ جديد', tone: 'accent' },
  weak: { label: 'نقطة ضعف', tone: 'accent' },
  link: { label: 'وصل', tone: 'primary' },
};

/** Describes what a page actually contains, so the reader knows before opening. */
function describePage(page: number): string {
  const meta = getPage(page);
  if (!meta) return '';
  const names = meta.surahs.map((id) => getChapter(id)?.name).filter(Boolean);
  return names.join(' · ');
}

function ItemRow({ item }: { readonly item: SessionItem }): React.JSX.Element {
  const { review } = useMemorization();
  const { toast } = useToast();

  const isLink = item.unit.type === 'link';
  const page = item.unit.id;
  const reason = REASONS[item.reason];

  const title = isLink
    ? `الوصل: ${toArabicNumerals(page)} ← ${toArabicNumerals(page + 1)}`
    : `صفحة ${toArabicNumerals(page)}`;

  const grade = (rating: 'solid' | 'hesitant' | 'forgotten'): void => {
    review(item.unit.type, item.unit.id, { kind: 'self-reported', rating });
    toast(
      rating === 'forgotten'
        ? `${title} — ستعود قريباً`
        : `${title} — أُحصيت${rating === 'solid' ? '، أحسنت' : ''}`,
      { tone: rating === 'forgotten' ? 'info' : 'success' },
    );
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.page(page)}
              className="rounded-xs font-bold text-ink underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
            >
              {title}
            </Link>
            <Badge tone={reason.tone}>{reason.label}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-ink-muted">
            {isLink
              ? `اقرأ آخر صفحة ${toArabicNumerals(page)} وأكمل إلى ${toArabicNumerals(page + 1)} بلا توقف`
              : describePage(page)}
          </p>
        </div>

        {/*
         * Three buttons, not five. The distinctions a person can actually make
         * about their own recitation are: it flowed, it stumbled, it broke.
         * A finer scale gets used inconsistently, and an inconsistent grade is
         * worse for the scheduler than a coarse one.
         */}
        <div className="flex shrink-0 gap-2" role="group" aria-label={`تقييم ${title}`}>
          <Button size="sm" variant="ghost" onClick={() => grade('forgotten')}>
            نسيت
          </Button>
          <Button size="sm" variant="ghost" onClick={() => grade('hesitant')}>
            تردّدت
          </Button>
          <Button size="sm" variant="primary" onClick={() => grade('solid')}>
            أتقنت
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function DailySession(): React.JSX.Element {
  const { session, hydrated, empty } = useMemorization();

  if (!hydrated) {
    return <p className="text-sm text-ink-subtle">…</p>;
  }

  if (empty) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm leading-relaxed text-ink-muted">
          لم تسجّل شيئاً بعد. أضف ما تحفظه الآن، أو ابدأ بصفحة واحدة — الخطة تبنى نفسها بعدها.
        </p>
      </Card>
    );
  }

  if (session.items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <Icon name="checkCircle" size={22} />
        </span>
        <p className="font-bold text-ink">لا مراجعة اليوم</p>
        <p className="mt-1 text-sm text-ink-muted">
          كل ما تحفظه ما زال قوياً. عُد غداً، أو أضف صفحة جديدة إن أردت.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/*
       * The one place arrears are mentioned. Stated as a plain sentence with a
       * reason, not as a counter — a counter invites the reader to measure
       * themselves against it every single day.
       */}
      {session.newWorkPaused && (
        <Card className="border-accent/40 bg-accent-soft/40 p-4">
          <p className="text-sm leading-relaxed text-ink">
            <strong className="font-bold">أوقفنا الحفظ الجديد مؤقتاً.</strong> عندك مراجعة متأخرة،
            والحفظ الجديد فوق حفظ متهالك يهدم الاثنين. راجع أياماً قليلة وسيعود تلقائياً.
          </p>
        </Card>
      )}

      <ul className="space-y-3">
        {session.items.map((item) => (
          <li key={item.key}>
            <ItemRow item={item} />
          </li>
        ))}
      </ul>

      {session.backlog > 0 && (
        <p className="pt-1 text-center text-xs text-ink-subtle">
          بقيت {toArabicNumerals(session.backlog)} صفحة مؤجّلة لأيام قادمة — لا تقلق منها، الخطة
          توزّعها.
        </p>
      )}
    </div>
  );
}
