import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants';

/**
 * robots.txt.
 *
 * تُستثنى `/api/` لأنها بيانات لا صفحات، و`/bookmarks` لأنها شخصية بالكامل،
 * و`/search` لأن صفحات النتائج لا تحمل محتوى فريداً وفهرستها تُضعف الصفحات
 * الأصلية. أما `/offline` فليست صفحة يُقصد الوصول إليها من محرك بحث.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/bookmarks', '/search', '/offline'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
