import type { MetadataRoute } from 'next';
import { ROUTES, SITE_URL } from '@/constants';
import { CHAPTERS, HIZB_LIST, JUZ_LIST } from '@/services/quran';

/**
 * خريطة الموقع.
 *
 * تشمل كل صفحات القراءة الـ٢٠٤ (١١٤ سورة + ٣٠ جزءاً + ٦٠ حزباً) إضافةً إلى
 * الفهارس. صفحات البحث والمحفوظات مستثناة عمداً: الأولى بلا محتوى فريد،
 * والثانية شخصية بالكامل.
 *
 * تتدرّج `priority` بحسب أهمية الصفحة فعلاً — الفهارس ثم السور ثم التقسيمات —
 * لا اعتباطاً، فمحرّكات البحث تقرأ التدرّج النسبي داخل الموقع لا القيمة
 * المطلقة.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}${ROUTES.home}`, lastModified, changeFrequency: 'daily', priority: 1 },
    {
      url: `${SITE_URL}${ROUTES.surahIndex}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}${ROUTES.juzIndex}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${ROUTES.hizbIndex}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    { url: `${SITE_URL}${ROUTES.about}`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const chapterRoutes: MetadataRoute.Sitemap = CHAPTERS.map((chapter) => ({
    url: `${SITE_URL}${ROUTES.surah(chapter.id)}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.85,
  }));

  const juzRoutes: MetadataRoute.Sitemap = JUZ_LIST.map((juz) => ({
    url: `${SITE_URL}${ROUTES.juz(juz.id)}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.65,
  }));

  const hizbRoutes: MetadataRoute.Sitemap = HIZB_LIST.map((hizb) => ({
    url: `${SITE_URL}${ROUTES.hizb(hizb.id)}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.55,
  }));

  return [...staticRoutes, ...chapterRoutes, ...juzRoutes, ...hizbRoutes];
}
