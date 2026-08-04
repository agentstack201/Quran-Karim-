import type { MetadataRoute } from 'next';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, ROUTES } from '@/constants';

/**
 * Web App Manifest.
 *
 * Generated from the same constants the UI uses, so the installed app can never
 * present a different name or description from the site itself.
 *
 * `id` is pinned explicitly: without it browsers derive identity from the start
 * URL, and a later change to that URL would register as a *different* app,
 * silently orphaning everyone's installed copy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#faf6ee',
    theme_color: '#0f6b4f',
    lang: 'ar',
    dir: 'rtl',
    categories: ['books', 'education', 'lifestyle'],
    prefer_related_applications: false,

    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android crops adaptive icons to a shape inscribed in the safe zone, so
      // the maskable variants carry extra padding and an opaque background.
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],

    screenshots: [
      {
        src: '/og-image.png',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'الصفحة الرئيسية لتطبيق تلاوة',
      },
    ],

    shortcuts: [
      {
        name: 'متابعة القراءة',
        short_name: 'متابعة',
        description: 'افتح المصحف من حيث توقّفت',
        url: `${ROUTES.surah(1)}?source=shortcut`,
        icons: [{ src: '/icons/shortcut-continue.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'البحث في القرآن',
        short_name: 'بحث',
        description: 'ابحث في نص المصحف وترجمته',
        url: `${ROUTES.search}?source=shortcut`,
        icons: [{ src: '/icons/shortcut-search.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'المحفوظات',
        short_name: 'محفوظات',
        description: 'الآيات التي حفظتها',
        url: `${ROUTES.bookmarks}?source=shortcut`,
        icons: [{ src: '/icons/shortcut-bookmarks.png', sizes: '96x96', type: 'image/png' }],
      },
    ],

    related_applications: [],
    // Deep links shared into the app land on the search page, so a pasted ayah
    // reference resolves rather than dead-ending on the home screen.
    share_target: {
      action: ROUTES.search,
      method: 'GET',
      params: { title: 'q', text: 'q', url: 'q' },
    },
  } satisfies MetadataRoute.Manifest & { share_target?: unknown };
}

/** Named for clarity in the route manifest; Next reads the default export. */
export const dynamic = 'force-static';
