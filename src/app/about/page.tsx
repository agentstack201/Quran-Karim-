import type { Metadata } from 'next';
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  DATA_ATTRIBUTION,
  ROUTES,
  TOTAL_CHAPTERS,
  TOTAL_HIZB,
  TOTAL_JUZ,
  TOTAL_PAGES,
  TOTAL_VERSES,
} from '@/constants';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Icon, type IconName } from '@/components/ui';
import { toArabicNumerals } from '@/utils';

export const metadata: Metadata = {
  title: 'عن التطبيق',
  description: APP_DESCRIPTION,
  alternates: { canonical: ROUTES.about },
};

const FEATURES: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'mushaf',
    title: 'المصحف كاملاً على جهازك',
    body: 'نص المصحف بالرسم العثماني برواية حفص عن عاصم مضمّن في التطبيق نفسه، فيفتح فوراً ويعمل دون اتصال بالكامل.',
  },
  {
    icon: 'headphones',
    title: 'تلاوة بمستوى الآية',
    body: 'كل آية ملف صوتي مستقل، فيمكن الانتقال آيةً آية، والتشغيل المتتابع، ومتابعة الآية المقروءة على الشاشة.',
  },
  {
    icon: 'book',
    title: 'تفسير وترجمة',
    body: 'التفسير الميسر وتفاسير أخرى، مع الترجمة الإنجليزية والنطق اللاتيني ومعلومات الآية من جزء وحزب وصفحة.',
  },
  {
    icon: 'search',
    title: 'بحث يفهم العربية',
    body: 'يتجاهل التشكيل واختلاف رسم الهمزة والألف المقصورة والتاء المربوطة، فتجد الآية كما تكتبها لا كما تُرسم.',
  },
  {
    icon: 'palette',
    title: 'قراءة مريحة للعين',
    body: 'أربع خلفيات ووضع ليلي وتحكّم كامل في حجم الخط وتباعد الأسطر — كلها محفوظة لجلستك القادمة.',
  },
  {
    icon: 'install',
    title: 'تطبيق قابل للتثبيت',
    body: 'ثبّته على أندرويد أو آيفون أو ويندوز أو ماك ليعمل كتطبيق مستقل بلا شريط عنوان ولا مشتّتات.',
  },
];

const NUMBERS: readonly { value: string; label: string }[] = [
  { value: toArabicNumerals(TOTAL_CHAPTERS), label: 'سورة' },
  { value: toArabicNumerals(TOTAL_VERSES), label: 'آية' },
  { value: toArabicNumerals(TOTAL_JUZ), label: 'جزءاً' },
  { value: toArabicNumerals(TOTAL_HIZB), label: 'حزباً' },
  { value: toArabicNumerals(TOTAL_PAGES), label: 'صفحة' },
];

export default function AboutPage(): React.JSX.Element {
  return (
    <AppShell>
      <PageHeader
        title={`عن ${APP_NAME}`}
        subtitle={APP_TAGLINE}
        crumbs={[{ label: 'الرئيسية', href: ROUTES.home }, { label: 'عن التطبيق' }]}
      />

      <div className="mx-auto max-w-4xl space-y-14 px-4 sm:px-6">
        <section aria-labelledby="about-intro">
          <h2 id="about-intro" className="sr-only">
            نبذة
          </h2>
          <p className="text-base leading-loose text-ink-muted">
            {APP_NAME} تطبيق ويب لقراءة القرآن الكريم، صُمّم ليكون هادئاً وسريعاً ومتاحاً دائماً. نص
            المصحف كاملاً محفوظ على جهازك منذ أول زيارة، فلا تنتظر تحميلاً ولا يوقفك انقطاع
            الإنترنت.
          </p>
          <p className="mt-4 text-base leading-loose text-ink-muted">
            لا يطلب التطبيق حساباً، ولا يجمع أي بيانات، ولا يعرض إعلانات. محفوظاتك وإعداداتك وآخر
            قراءتك تبقى على جهازك وحده ولا تُرسل إلى أي خادم.
          </p>
        </section>

        <section aria-labelledby="about-numbers">
          <h2 id="about-numbers" className="mb-5 text-xl font-bold text-ink">
            المصحف بالأرقام
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {NUMBERS.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-surface px-3 py-5 text-center"
              >
                <dd className="text-2xl font-bold text-primary tabular-nums">{item.value}</dd>
                <dt className="mt-1 text-xs text-ink-subtle">{item.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="about-features">
          <h2 id="about-features" className="mb-5 text-xl font-bold text-ink">
            ما يقدّمه التطبيق
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-5">
                <span
                  aria-hidden="true"
                  className="mb-3.5 grid size-10 place-items-center rounded-md bg-primary-soft text-primary"
                >
                  <Icon name={feature.icon} size={19} />
                </span>
                <h3 className="text-sm font-bold text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="about-sources">
          <h2 id="about-sources" className="mb-3 text-xl font-bold text-ink">
            المصادر والتراخيص
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-ink-muted">
            نص المصحف مأخوذ من مصادر موثوقة ومراجَع آلياً مقابل بيانات بنيوية مستقلة. إن لاحظت أي
            اختلاف في النص، فالرجاء الإبلاغ عنه فوراً — تصحيح النص أولوية تسبق كل ما عداها.
          </p>

          <ul className="space-y-3">
            {Object.entries(DATA_ATTRIBUTION).map(([key, entry]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3.5"
              >
                <span className="text-sm font-medium text-ink">{entry.label}</span>
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xs text-sm text-primary transition-colors hover:text-primary-hover"
                >
                  {entry.source}
                  <Icon name="share" size={13} />
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-ink-subtle">
            نص المصحف والترجمات منشورة برخصة Creative Commons BY-SA 4.0. الشيفرة المصدرية للتطبيق
            منشورة برخصة MIT. خطّا أميري وكايرو منشوران برخصة SIL Open Font License 1.1.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
