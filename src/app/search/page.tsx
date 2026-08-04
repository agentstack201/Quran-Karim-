import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ROUTES } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui';
import { SearchResults } from '@/features/search/SearchResults';

export const metadata: Metadata = {
  title: 'البحث',
  description:
    'ابحث في نص القرآن الكريم كاملاً وفي ترجمته وأسماء سوره — بحث فوري يتجاهل التشكيل واختلاف رسم الهمزة.',
  alternates: { canonical: ROUTES.search },
  // Search result pages carry no unique content of their own — indexing them
  // would only dilute the canonical reading pages.
  robots: { index: false, follow: true },
};

/** Placeholder while the client component reads the query from the URL. */
function SearchFallback(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6" aria-busy="true" aria-label="جارٍ تجهيز البحث">
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title="البحث في القرآن"
        subtitle="ابحث بالنص أو الترجمة أو اسم السورة، أو اكتب ٢:٢٥٥ للانتقال المباشر"
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'البحث' }]}
      />
      <Suspense fallback={<SearchFallback />}>
        <SearchResults />
      </Suspense>
    </AppShell>
  );
}
