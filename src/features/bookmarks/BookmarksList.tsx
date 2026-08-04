'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { Button, EmptyState, Icon, IconButton, Modal, Skeleton, useToast } from '@/components/ui';
import { formatRelativeTime, toArabicNumerals } from '@/utils';
import { useBookmarks } from './BookmarksProvider';

/**
 * قائمة الآيات المحفوظة.
 *
 * المحفوظات مخزّنة على الجهاز وحده، لذلك يمرّ «مسح الكل» بنافذة تأكيد: لا توجد
 * نسخة احتياطية على خادم يمكن الرجوع إليها، فالحذف نهائي فعلاً.
 */
export function BookmarksList(): React.JSX.Element {
  const { bookmarks, removeBookmark, clearBookmarks, hydrated } = useBookmarks();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <EmptyState
          icon="bookmark"
          title="لا توجد آيات محفوظة بعد"
          message="اضغط على أيقونة الحفظ بجانب أي آية أثناء القراءة لتجدها هنا. المحفوظات تبقى على جهازك وحده."
          action={
            <Link
              href={ROUTES.surahIndex}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-on-primary transition-colors duration-200 hover:bg-primary-hover"
            >
              <Icon name="book" size={18} />
              تصفّح السور
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" role="status" aria-live="polite">
          {toArabicNumerals(bookmarks.length)} آية محفوظة
        </p>
        <Button variant="ghost" size="sm" iconStart="trash" onClick={() => setConfirmOpen(true)}>
          مسح الكل
        </Button>
      </div>

      <ul className="space-y-3">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.key}
            className="group relative rounded-lg border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong"
          >
            <Link href={ROUTES.surahAyah(bookmark.surah, bookmark.ayah)} className="block">
              <p className="quran-text line-clamp-3 text-ink" dir="rtl" lang="ar">
                {bookmark.excerpt}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-primary">
                  {bookmark.surahName} · الآية {toArabicNumerals(bookmark.ayah)}
                </span>
                <span className="text-xs text-ink-subtle">
                  حُفظت {formatRelativeTime(bookmark.createdAt)}
                </span>
              </div>
            </Link>

            <IconButton
              icon="trash"
              label={`إزالة ${bookmark.surahName} الآية ${bookmark.ayah} من المحفوظات`}
              size="sm"
              onClick={() => {
                removeBookmark(bookmark.key);
                toast('تمت إزالة الآية من المحفوظات');
              }}
              className="absolute end-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            />
          </li>
        ))}
      </ul>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="مسح كل المحفوظات؟"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              iconStart="trash"
              onClick={() => {
                clearBookmarks();
                setConfirmOpen(false);
                toast('تم مسح جميع المحفوظات');
              }}
            >
              مسح الكل
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          ستُحذف {toArabicNumerals(bookmarks.length)} آية محفوظة نهائياً من هذا الجهاز. المحفوظات
          مخزّنة محلياً فقط، فلا توجد نسخة احتياطية يمكن استرجاعها بعد المسح.
        </p>
      </Modal>
    </div>
  );
}
