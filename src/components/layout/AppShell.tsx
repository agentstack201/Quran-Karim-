import type { ReactNode } from 'react';
import { AudioPlayer } from '@/features/audio/AudioPlayer';
import { InstallPrompt } from '@/features/pwa/InstallPrompt';
import { ServiceWorkerRegistrar } from '@/features/pwa/ServiceWorkerRegistrar';
import { Footer } from './Footer';
import { Header } from './Header';
import { OfflineBanner } from './OfflineBanner';
import { ScrollToTop } from './ScrollToTop';

/**
 * The application chrome wrapped around every page.
 *
 * A Server Component: only the pieces that genuinely need the browser (header
 * interactivity, audio, install prompt, service worker) are client boundaries,
 * so page content streams without waiting on any of them.
 *
 * The bottom padding reserves room for the audio player, which is fixed to the
 * viewport and would otherwise cover the last verses of a surah.
 */
export function AppShell({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <Header />

      <main id="main" className="flex-1 pb-28" tabIndex={-1}>
        {children}
      </main>

      <Footer />

      <ScrollToTop />
      <AudioPlayer />
      <InstallPrompt />
      <ServiceWorkerRegistrar />
    </div>
  );
}
