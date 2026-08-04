'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Icon } from '@/components/ui';

/**
 * حدّ الخطأ على مستوى المسار.
 *
 * لا يعرض رسالة الخطأ التقنية للمستخدم — فهي لا تعنيه، وقد تكشف تفاصيل عن
 * البنية الداخلية. تُسجَّل في الطرفية للمطوّر، ويُعرض للمستخدم `digest` وحده
 * ليتمكّن من ذكره في بلاغ عن المشكلة.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    console.error('[tilawa] Unhandled route error', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
      <span
        aria-hidden="true"
        className="mb-6 grid size-20 place-items-center rounded-2xl bg-danger-soft text-danger"
      >
        <Icon name="alert" size={36} />
      </span>

      <h1 className="text-2xl font-bold text-ink sm:text-3xl">حدث خطأ غير متوقّع</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        نعتذر عن ذلك. يمكنك إعادة المحاولة، وإن تكرّر الأمر فارجع إلى الصفحة الرئيسية.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover"
        >
          <Icon name="reset" size={17} />
          إعادة المحاولة
        </button>
        <Link
          href={ROUTES.home}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:border-border-strong"
        >
          <Icon name="home" size={17} />
          الصفحة الرئيسية
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-ink-subtle">رمز الخطأ: {error.digest}</p>
      )}
    </div>
  );
}
