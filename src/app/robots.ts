import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants';

/** يُكتب مرة واحدة عند البناء — الموقع تصدير ثابت بلا خادم. */
export const dynamic = 'force-static';

/**
 * robots.txt.
 *
 * تُستثنى `/bookmarks` لأنها شخصية بالكامل، و`/search` لأن صفحات النتائج لا
 * تحمل محتوى فريداً وفهرستها تُضعف الصفحات الأصلية. أما `/offline` فليست صفحة
 * يُقصد الوصول إليها من محرك بحث.
 *
 * أما `/data/` فمستثناة لأنها حمولات JSON لا صفحات: فهرستها تُنفق ميزانية
 * الزحف على ملفات لا يقرؤها أحد، ونصّها القرآني منشور أصلاً في الصفحات نفسها.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/data/', '/bookmarks', '/search', '/offline'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
