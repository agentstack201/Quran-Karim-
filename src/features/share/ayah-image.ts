import { APP_NAME } from '@/constants';
import { fitText, wrapLines, type Measure } from './layout';

/**
 * Renders an ayah as a shareable image.
 * -----------------------------------------------------------------------------
 * Quranic content travels as pictures. It is posted to statuses, forwarded in
 * group chats and saved to camera rolls — a link is not what people send each
 * other. Producing that picture inside the app means the verse arrives set in
 * the Mus'haf typeface with its reference attached, instead of as a screenshot
 * with somebody's status bar across the top.
 *
 * Drawn on a canvas rather than assembled from an image: the fonts are
 * self-hosted, so nothing here is tainted by a cross-origin resource and the
 * canvas exports cleanly and offline.
 */

/** Square, because that is what survives every feed and status crop. */
const SIZE = 1080;
const MARGIN = 96;

export type ImageTheme = 'paper' | 'night' | 'gold';

type Palette = {
  readonly background: readonly [string, string];
  readonly text: string;
  readonly accent: string;
  readonly muted: string;
  readonly frame: string;
};

/**
 * The three grounds, taken from the app's own palette so a shared image is
 * recognisably from here without carrying a logo.
 */
const PALETTES: Record<ImageTheme, Palette> = {
  paper: {
    background: ['#FAF6EE', '#F2E9D8'],
    text: '#0B3D2E',
    accent: '#9C7320',
    muted: '#6B7A72',
    frame: '#DCCFB4',
  },
  night: {
    background: ['#0B1210', '#132119'],
    text: '#E8EFE9',
    accent: '#D9AF54',
    muted: '#8B9C92',
    frame: '#28372F',
  },
  gold: {
    background: ['#0B3D2E', '#0F6B4F'],
    text: '#FAF6EE',
    accent: '#E8C87A',
    muted: '#BFD3C8',
    frame: '#2E7D5F',
  },
};

export const IMAGE_THEMES: readonly { id: ImageTheme; label: string }[] = [
  { id: 'paper', label: 'ورقي' },
  { id: 'night', label: 'ليلي' },
  { id: 'gold', label: 'ذهبي' },
];

export type AyahImageInput = {
  readonly text: string;
  readonly surahName: string;
  readonly surah: number;
  readonly ayah: number;
  readonly theme: ImageTheme;
  /** Arabic-Indic reference, e.g. "٢:٢٥٥". */
  readonly reference: string;
};

/**
 * Waits for the Quranic face to be usable.
 *
 * Canvas does not participate in font blocking: draw before the face has
 * loaded and it silently falls back, producing an image in the wrong typeface
 * with no error to notice.
 */
async function ensureFont(fontSize: number, family: string): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    await document.fonts.load(`${fontSize}px ${family}`, 'بِسۡمِ');
    return document.fonts.check(`${fontSize}px ${family}`, 'بِسۡمِ');
  } catch {
    return false;
  }
}

/** Resolves the Quranic font stack as the canvas needs it. */
function quranFontFamily(): string {
  if (typeof window === 'undefined') return 'serif';
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-quran').trim();
  return value || 'serif';
}

/**
 * Draws the image and returns it as a PNG blob.
 *
 * Returns `null` when a canvas cannot be obtained, so the caller can fall back
 * to sharing text rather than failing the whole action.
 */
export async function renderAyahImage(input: AyahImageInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const palette = PALETTES[input.theme];
  const family = quranFontFamily();
  await ensureFont(64, family);

  // --- ground ---------------------------------------------------------------
  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, palette.background[0]);
  gradient.addColorStop(1, palette.background[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // A hairline frame, inset — the one ornament, standing in for a border the
  // printed Mus'haf would have.
  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGIN / 2, MARGIN / 2, SIZE - MARGIN, SIZE - MARGIN);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // --- verse ----------------------------------------------------------------
  const measure: Measure = (text, fontSize) => {
    ctx.font = `${fontSize}px ${family}`;
    return ctx.measureText(text).width;
  };

  const maxWidth = SIZE - MARGIN * 2;
  // Room reserved below for the reference line and the attribution.
  const maxHeight = SIZE - MARGIN * 2 - 180;

  const fitted = fitText({
    text: input.text,
    maxWidth,
    maxHeight,
    maxFontSize: 74,
    minFontSize: 26,
    leading: 1.85,
    measure,
  });

  ctx.fillStyle = palette.text;
  ctx.font = `${fitted.fontSize}px ${family}`;

  const blockHeight = fitted.lines.length * fitted.lineHeight;
  // Centred in the space above the reference, not in the whole square, so the
  // verse never drifts down into the caption.
  const blockTop = (SIZE - 120 - blockHeight) / 2;

  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, SIZE / 2, blockTop + index * fitted.lineHeight + fitted.lineHeight / 2);
  });

  // --- divider --------------------------------------------------------------
  const dividerY = blockTop + blockHeight + 52;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2 - 70, dividerY);
  ctx.lineTo(SIZE / 2 - 14, dividerY);
  ctx.moveTo(SIZE / 2 + 14, dividerY);
  ctx.lineTo(SIZE / 2 + 70, dividerY);
  ctx.stroke();

  // A small lozenge between the two rules, echoing the ayah medallion.
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, dividerY - 7);
  ctx.lineTo(SIZE / 2 + 7, dividerY);
  ctx.lineTo(SIZE / 2, dividerY + 7);
  ctx.lineTo(SIZE / 2 - 7, dividerY);
  ctx.closePath();
  ctx.fill();

  // --- reference ------------------------------------------------------------
  ctx.fillStyle = palette.accent;
  ctx.font = `600 34px ${family}`;
  ctx.fillText(`${input.surahName} · ${input.reference}`, SIZE / 2, dividerY + 56);

  ctx.fillStyle = palette.muted;
  ctx.font = `22px ${family}`;
  ctx.fillText(APP_NAME, SIZE / 2, SIZE - MARGIN + 6);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/** A filename a reader will recognise in their downloads folder. */
export function imageFileName(surah: number, ayah: number): string {
  return `tilawa-${surah}-${ayah}.png`;
}

export { wrapLines };
