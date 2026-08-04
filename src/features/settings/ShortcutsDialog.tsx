'use client';

import { Modal } from '@/components/ui';
import { SHORTCUTS, SHORTCUT_GROUPS } from '@/constants';

/**
 * The keyboard shortcut reference.
 *
 * Rendered from the same `SHORTCUTS` table the key handler consumes, so the
 * documentation cannot drift away from the behaviour.
 */
export function ShortcutsDialog({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="اختصارات لوحة المفاتيح"
      description="تعمل في كل صفحات التطبيق"
      size="sm"
    >
      <div className="space-y-7">
        {SHORTCUT_GROUPS.map((group) => {
          const items = SHORTCUTS.filter((shortcut) => shortcut.group === group);
          if (items.length === 0) return null;

          return (
            <section key={group} aria-labelledby={`shortcuts-${group}`}>
              <h3 id={`shortcuts-${group}`} className="mb-3 text-xs font-bold text-ink-subtle">
                {group}
              </h3>
              <dl className="space-y-2.5">
                {items.map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-ink">{shortcut.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="min-w-7 rounded-xs border border-border bg-surface-sunken px-2 py-1 text-center font-sans text-xs font-semibold text-ink-muted"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}

        <p className="border-t border-border pt-5 text-xs leading-relaxed text-ink-subtle">
          الاختصارات معطّلة أثناء الكتابة في حقول النص. يمكنك أيضاً استخدام{' '}
          <kbd className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="rounded-xs border border-border bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold">
            K
          </kbd>{' '}
          لفتح البحث من أي مكان.
        </p>
      </div>
    </Modal>
  );
}
