import type { Metadata } from 'next';
import { ROUTES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { BookmarksList } from '@/features/bookmarks/BookmarksList';

export const metadata: Metadata = {
  title: 'المحفوظات',
  description:
    'الآيات التي حفظتها للرجوع إليها — مخزّنة على جهازك وحده، بلا حساب ولا مزامنة ولا تتبّع.',
  alternates: { canonical: ROUTES.bookmarks },
  // Bookmarks are per-device and personal; there is nothing here to index.
  robots: { index: false, follow: true },
};

export default function BookmarksPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title="المحفوظات"
        subtitle="آياتك المحفوظة — تبقى على هذا الجهاز فقط"
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'المحفوظات' }]}
      />
      <BookmarksList />
    </AppShell>
  );
}
