/**
 * Application-wide identity and configuration constants.
 */

export const APP_NAME = 'تلاوة';
export const APP_NAME_LATIN = 'Tilawa';
export const APP_TAGLINE = 'مصحف رقمي أنيق للقراءة والاستماع والتدبر';
export const APP_TAGLINE_EN = 'An elegant digital Mus’haf for reading, listening and reflection';
export const APP_DESCRIPTION =
  'تلاوة — اقرأ القرآن الكريم بالرسم العثماني، واستمع لكبار القراء، وتصفح التفسير والترجمة. ' +
  'تصفح حسب السورة أو الجزء أو الحزب، مع بحث فوري ووضع ليلي وعمل كامل بدون إنترنت.';

/**
 * Canonical origin, used for absolute URLs in metadata, sitemap and JSON-LD.
 * Override with `NEXT_PUBLIC_SITE_URL` when deploying to a custom domain.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tilawa.app').replace(
  /\/+$/,
  '',
);

export const APP_LOCALE = 'ar';
export const APP_DIRECTION = 'rtl';

/** Structural constants of the Mus'haf (Hafs riwaya). */
export const TOTAL_CHAPTERS = 114;
export const TOTAL_VERSES = 6236;
export const TOTAL_JUZ = 30;
export const TOTAL_HIZB = 60;
export const TOTAL_PAGES = 604;

/** The Basmalah, rendered above every surah that opens with it. */
export const BASMALAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

/** Istiadhah, offered before starting a recitation. */
export const ISTIADHAH = 'أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيۡطَٰنِ ٱلرَّجِيمِ';

/** Sadaqa Allah, shown at the end of a surah. */
export const SADAQA = 'صَدَقَ ٱللَّهُ ٱلۡعَظِيمُ';

/**
 * إسناد المصادر، يُعرض في التذييل وصفحة «عن التطبيق» ونافذة التفسير.
 *
 * هذا التزام ترخيصي لا زينة: نص المصحف مولَّد من مصدر تحت CC BY-SA 4.0،
 * والرخصة تشترط تسمية المصدر والرخصة معاً. كان هذا الحقل ينسب النص إلى
 * «موسوعة القرآن الكريم» بينما يولّده `scripts/generate-quran-data.mjs` فعلياً
 * من `quran-json` و`quran-meta` — إسنادٌ خاطئ، وهو بذاته إخلال بالشرط.
 *
 * القاعدة هنا: **ما يُعرض للقارئ يجب أن يطابق ما يقرؤه المولّد.** أي تغيير في
 * مصادر السكربت يلزمه تغيير مقابل في هذا الملف.
 *
 * `licence` اختياري عن قصد: يُذكر حيث تحقّقنا منه، ويُترك فارغاً حيث لم
 * نتحقّق بعد بدل ادّعاء ما لا نعلم.
 *
 * @see scripts/generate-quran-data.mjs
 * @see docs/PRODUCT_AUDIT.md § مصفوفة التراخيص
 */
export const DATA_ATTRIBUTION = {
  text: {
    label: 'نص المصحف والترجمة',
    source: 'quran-json',
    href: 'https://github.com/risan/quran-json',
    licence: 'CC BY-SA 4.0',
    licenceHref: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ar',
  },
  structure: {
    label: 'الأجزاء والأحزاب والصفحات',
    source: 'quran-meta',
    href: 'https://github.com/quran-center/quran-meta',
    licence: 'MIT',
    licenceHref: 'https://opensource.org/licenses/MIT',
  },
  tafsir: {
    label: 'التفسير',
    source: 'Quran.com API',
    href: 'https://api-docs.quran.com',
  },
  audio: {
    label: 'التلاوات',
    source: 'EveryAyah',
    href: 'https://everyayah.com',
  },
} as const;
