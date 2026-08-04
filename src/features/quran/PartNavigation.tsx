import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Icon } from '@/components/ui';

/**
 * التنقّل بين جزءٍ وآخر أو حزبٍ وآخر أسفل صفحة القراءة.
 *
 * يستخدم `rel="prev"` و`rel="next"` فيفهم كلٌّ من متصفّحات القراءة ومحرّكات
 * البحث أن هذه الصفحات متسلسلة، لا مستقلّة.
 */
export function PartNavigation({
  kind,
  id,
  max,
}: {
  readonly kind: 'juz' | 'hizb';
  readonly id: number;
  readonly max: number;
}): React.JSX.Element {
  const label = kind === 'juz' ? 'الجزء' : 'الحزب';
  const buildHref = kind === 'juz' ? ROUTES.juz : ROUTES.hizb;

  const previous = id > 1 ? id - 1 : null;
  const next = id < max ? id + 1 : null;

  return (
    <nav
      aria-label={`التنقّل بين ${kind === 'juz' ? 'الأجزاء' : 'الأحزاب'}`}
      className="mt-4 flex items-stretch gap-3 border-t border-border pt-8"
    >
      {previous !== null ? (
        <Link
          href={buildHref(previous)}
          rel="prev"
          className="group flex flex-1 items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 hover:border-border-strong"
        >
          <Icon
            name="chevronEnd"
            size={18}
            className="text-ink-subtle transition-colors group-hover:text-primary"
          />
          <span className="text-start">
            <span className="block text-[0.6875rem] text-ink-subtle">{label} السابق</span>
            <span className="block text-lg font-bold text-ink">
              {label} {previous}
            </span>
          </span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}

      {next !== null ? (
        <Link
          href={buildHref(next)}
          rel="next"
          className="group flex flex-1 items-center justify-end gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-200 hover:border-border-strong"
        >
          <span className="text-end">
            <span className="block text-[0.6875rem] text-ink-subtle">{label} التالي</span>
            <span className="block text-lg font-bold text-ink">
              {label} {next}
            </span>
          </span>
          <Icon
            name="chevronStart"
            size={18}
            className="text-ink-subtle transition-colors group-hover:text-primary"
          />
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
