import type { ReactNode } from 'react';
import { cn } from '@/utils';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type BaseStateProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly message?: string;
  readonly action?: ReactNode;
  readonly className?: string;
};

function BaseState({
  icon,
  title,
  message,
  action,
  className,
  tone,
}: BaseStateProps & { readonly tone: 'neutral' | 'danger' }): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex animate-[var(--animate-fade-in)] flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'mb-5 inline-flex size-16 items-center justify-center rounded-2xl',
          tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary',
        )}
      >
        <Icon name={icon} size={28} />
      </span>

      <h2 className="text-lg font-bold text-ink">{title}</h2>

      {message && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{message}</p>}

      {action && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{action}</div>
      )}
    </div>
  );
}

/** Shown when a legitimate query simply has no results. */
export function EmptyState(props: BaseStateProps): React.JSX.Element {
  return <BaseState {...props} tone="neutral" />;
}

/** Shown when something failed and the user can retry. */
export function ErrorState({
  title = 'تعذّر تحميل المحتوى',
  message = 'حدث خطأ غير متوقع. تحقق من اتصالك ثم أعد المحاولة.',
  onRetry,
  retryLabel = 'إعادة المحاولة',
  ...rest
}: Partial<BaseStateProps> & {
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
}): React.JSX.Element {
  return (
    <div role="alert">
      <BaseState
        icon={rest.icon ?? 'alert'}
        title={title}
        message={message}
        tone="danger"
        className={rest.className}
        action={
          rest.action ??
          (onRetry ? (
            <Button variant="outline" iconStart="reset" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : undefined)
        }
      />
    </div>
  );
}

/** Shown when the device is offline and the content was never cached. */
export function OfflineState({ onRetry }: { readonly onRetry?: () => void }): React.JSX.Element {
  return (
    <ErrorState
      icon="offline"
      title="لا يوجد اتصال بالإنترنت"
      message="هذا المحتوى غير متوفر دون اتصال. السور التي زرتها من قبل ما زالت متاحة للقراءة."
      onRetry={onRetry}
    />
  );
}
