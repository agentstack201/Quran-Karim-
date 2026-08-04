import { Suspense } from 'react';
import { SkeletonReader } from '@/components/ui';
import { Reader, type ReaderProps } from './Reader';

/**
 * حدّ Suspense حول سطح القراءة.
 *
 * يقرأ `Reader` معامل الرابط العميق `?ayah=` أثناء التصيير، وهو ما يُخرج شجرته
 * من التصيير الساكن. عزله داخل حدٍّ خاص به يجعل ذلك يقتصر على الآيات وحدها:
 * تبقى ترويسة الصفحة وروابط التنقّل والبيانات الوصفية في HTML ساكن يُقدَّم من
 * الحافة — وهو ما تراه محرّكات البحث ويقيسه Largest Contentful Paint.
 */
export function ReaderBoundary(props: ReaderProps): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SkeletonReader count={6} />
        </div>
      }
    >
      <Reader {...props} />
    </Suspense>
  );
}
