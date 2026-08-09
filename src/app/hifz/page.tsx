import type { Metadata } from 'next';
import { ROUTES, SITE_URL } from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { HifzDashboard } from '@/features/memorization/HifzDashboard';

const DESCRIPTION =
  'خطة حفظ ومراجعة تُبنى على مقدار ما تحتمله يومياً، وتعرف الصفحات التي بدأت تضعف ' +
  'قبل أن تنساها. كل شيء على جهازك، بلا حساب ولا اشتراك.';

export const metadata: Metadata = {
  title: 'الحفظ والمراجعة',
  description: DESCRIPTION,
  alternates: { canonical: ROUTES.hifz },
  openGraph: {
    title: 'الحفظ والمراجعة · القرآن الكريم',
    description: DESCRIPTION,
    url: `${SITE_URL}${ROUTES.hifz}`,
    type: 'website',
  },
};

/**
 * The ḥifẓ page.
 *
 * A server shell around a client dashboard, like every other route here: the
 * heading, metadata and chrome are static HTML, and only the part that reads a
 * reader's own history runs in the browser.
 *
 * There is nothing to prerender *into* the dashboard, because there is no
 * server that knows anything about anyone. That is the point.
 */
export default function HifzPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        centered
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'الحفظ' }]}
        title="الحفظ والمراجعة"
        subtitle="راجع في الوقت الصحيح، واعرف أين يضعف حفظك قبل أن ينفلت"
      />
      <HifzDashboard />
    </AppShell>
  );
}
