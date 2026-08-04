'use client';

import { Icon } from '@/components/ui';
import { useOnlineStatus } from '@/hooks';

/**
 * A connectivity notice.
 *
 * Announced politely rather than assertively: losing connection is not an
 * emergency in this app — the whole Mus'haf is already on the device. The
 * wording says what still works, not just what broke.
 */
export function OfflineBanner(): React.JSX.Element | null {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      data-print="hidden"
      className="animate-[var(--animate-fade-in)] border-b border-warning/25 bg-warning-soft text-warning"
    >
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-xs font-medium sm:px-6">
        <Icon name="offline" size={15} />
        لا يوجد اتصال — القراءة والتصفّح تعمل، أما التلاوة والتفسير فتحتاج إنترنت.
      </p>
    </div>
  );
}
