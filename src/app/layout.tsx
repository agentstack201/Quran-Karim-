import type { Metadata, Viewport } from 'next';
import { APP_DESCRIPTION, APP_NAME, APP_NAME_LATIN, APP_TAGLINE, SITE_URL } from '@/constants';
import { Providers } from '@/components/layout/Providers';
import { buildThemeScript } from '@/features/settings/theme-script';
import { fontVariables } from './fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} · ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: `${APP_NAME_LATIN} contributors` }],
  generator: 'Next.js',
  keywords: [
    'القرآن الكريم',
    'المصحف',
    'قراءة القرآن',
    'تفسير',
    'تلاوة',
    'الرسم العثماني',
    'حفص عن عاصم',
    'Quran',
    'Mushaf',
    'Tafsir',
    'Islam',
  ],
  category: 'religion',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    canonical: '/',
    languages: { ar: '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/icons/favicon.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zooming must never be disabled — WCAG 2.2 · 1.4.4 Resize Text.
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1210' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="ar" dir="rtl" className={fontVariables} suppressHydrationWarning>
      <head>
        {/*
          The single inline script in the application. It applies the persisted
          theme before first paint, eliminating the flash of the default theme.
          Generated from the same constants the runtime uses — see
          `src/features/settings/theme-script.ts`.
        */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeScript() }} />
      </head>
      <body className="bg-background text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
