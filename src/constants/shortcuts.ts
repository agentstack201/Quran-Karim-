/**
 * Keyboard shortcuts.
 *
 * Declared as data so the help dialog and the key handler can never drift apart.
 */

export type ShortcutId =
  | 'search'
  | 'playPause'
  | 'nextAyah'
  | 'previousAyah'
  | 'toggleTheme'
  | 'fontIncrease'
  | 'fontDecrease'
  | 'fontReset'
  | 'bookmark'
  | 'settings'
  | 'help'
  | 'top';

export type Shortcut = {
  readonly id: ShortcutId;
  /** Keys rendered in the help dialog, in display order. */
  readonly keys: readonly string[];
  readonly label: string;
  readonly group: 'التنقل' | 'التلاوة' | 'العرض';
};

export const SHORTCUTS: readonly Shortcut[] = [
  { id: 'search', keys: ['/'], label: 'فتح البحث', group: 'التنقل' },
  { id: 'top', keys: ['Home'], label: 'الانتقال لأعلى الصفحة', group: 'التنقل' },
  { id: 'help', keys: ['؟'], label: 'عرض الاختصارات', group: 'التنقل' },
  { id: 'settings', keys: ['S'], label: 'فتح الإعدادات', group: 'التنقل' },
  { id: 'playPause', keys: ['Space'], label: 'تشغيل / إيقاف التلاوة', group: 'التلاوة' },
  { id: 'nextAyah', keys: ['→'], label: 'الآية التالية', group: 'التلاوة' },
  { id: 'previousAyah', keys: ['←'], label: 'الآية السابقة', group: 'التلاوة' },
  { id: 'bookmark', keys: ['B'], label: 'حفظ الآية الحالية', group: 'التلاوة' },
  { id: 'toggleTheme', keys: ['T'], label: 'تبديل الوضع الليلي', group: 'العرض' },
  { id: 'fontIncrease', keys: ['+'], label: 'تكبير خط المصحف', group: 'العرض' },
  { id: 'fontDecrease', keys: ['−'], label: 'تصغير خط المصحف', group: 'العرض' },
  { id: 'fontReset', keys: ['0'], label: 'إعادة حجم الخط', group: 'العرض' },
] as const;

/** Shortcut groups in the order they appear in the help dialog. */
export const SHORTCUT_GROUPS = ['التنقل', 'التلاوة', 'العرض'] as const;
