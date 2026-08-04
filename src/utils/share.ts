/**
 * Clipboard and Web Share helpers.
 *
 * Both degrade deliberately: the Async Clipboard API is unavailable in
 * non-secure contexts and older Safari, and `navigator.share` only exists on
 * some platforms. Callers get a boolean and decide what to tell the user.
 */

/** Copies text to the clipboard. Returns false when every strategy fails. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path — a rejected promise here usually means
      // the document was not focused, which `execCommand` can still handle.
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    return succeeded;
  } catch {
    return false;
  }
}

/** True when the platform offers a native share sheet. */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed';

/** Opens the native share sheet. Distinguishes user cancellation from failure. */
export async function shareContent(data: ShareData): Promise<ShareOutcome> {
  if (!canShare()) return 'unsupported';

  try {
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/**
 * Composes the shareable text of an ayah: the verse itself, its reference, and
 * a link back to the exact position in the reader.
 */
export function formatAyahForSharing(params: {
  text: string;
  surahName: string;
  surah: number;
  ayah: number;
  url?: string;
}): string {
  const reference = `[${params.surahName}: ${params.ayah}]`;
  const lines = [`﴿ ${params.text} ﴾`, reference];
  if (params.url) lines.push(params.url);
  return lines.join('\n');
}
