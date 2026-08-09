'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { AudioProvider } from '@/features/audio/AudioProvider';
import { BookmarksProvider } from '@/features/bookmarks/BookmarksProvider';
import { DownloadsProvider } from '@/features/downloads/DownloadsProvider';
import { KhatmahProvider } from '@/features/khatmah/KhatmahProvider';
import { MemorizationProvider } from '@/features/memorization/MemorizationProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';

/**
 * The client-side provider stack.
 *
 * Isolated into its own Client Component so the root layout — and therefore
 * every page's shell, metadata and static content — stays a Server Component.
 *
 * Order matters: settings must be available before audio (which reads the
 * chosen reciter, volume and playback rate) and before downloads (which are
 * stored per reciter); the khatmah plan sits under bookmarks because it follows
 * the reading position they record, and memorisation sits under the plan
 * because both speak in pages. Toasts must wrap everything that reports
 * success or failure to the user.
 */
export function Providers({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return (
    <ToastProvider>
      <SettingsProvider>
        <BookmarksProvider>
          <KhatmahProvider>
            <MemorizationProvider>
              <DownloadsProvider>
                <AudioProvider>{children}</AudioProvider>
              </DownloadsProvider>
            </MemorizationProvider>
          </KhatmahProvider>
        </BookmarksProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
