/**
 * Tilawa — icon generator.
 * -----------------------------------------------------------------------------
 * Renders the brand mark into every raster and vector asset the application and
 * its manifest reference:
 *
 *   public/icons/favicon.svg            vector favicon, theme-aware
 *   public/icons/icon-{192,512}.png     PWA icons (`purpose: any`)
 *   public/icons/maskable-{192,512}.png Android adaptive icons (`purpose: maskable`)
 *   public/icons/apple-touch-icon.png   iOS home-screen icon
 *   public/icons/shortcut-*.png         app shortcut icons
 *   public/og-image.png                 1200×630 social preview
 *
 * PNGs are encoded by hand — a minimal zlib-stored PNG writer — rather than by
 * pulling in `sharp` or `canvas`. Those are heavyweight native dependencies to
 * carry for artwork that is regenerated perhaps twice in a project's lifetime,
 * and this project deliberately keeps its dependency tree to three runtime
 * packages.
 *
 * Usage:  npm run icons:generate
 */

import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ICON_DIR = join(ROOT, 'public', 'icons');
const PUBLIC_DIR = join(ROOT, 'public');

/** Brand palette, mirroring src/styles/theme.css. */
const COLOURS = {
  forest: [11, 61, 46],
  emerald: [15, 107, 79],
  gold: [184, 137, 43],
  goldLight: [217, 175, 84],
  paper: [250, 246, 238],
  sand: [242, 233, 216],
  dark: [11, 18, 16],
};

// ---------------------------------------------------------------------------
// Minimal PNG encoder
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Encodes an RGBA pixel buffer as a PNG.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} pixels RGBA, row-major, `width * height * 4` bytes
 */
function encodePng(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // colour type: RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Each scanline is prefixed with filter type 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing primitives (analytically anti-aliased via 3×3 supersampling)
// ---------------------------------------------------------------------------

const SAMPLES = 3;

function createCanvas(width, height) {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

function blend(canvas, x, y, [r, g, b], alpha) {
  if (alpha <= 0) return;
  const index = (y * canvas.width + x) * 4;
  const existing = canvas.pixels[index + 3] / 255;
  const outAlpha = alpha + existing * (1 - alpha);
  if (outAlpha <= 0) return;

  for (let channel = 0; channel < 3; channel += 1) {
    const source = [r, g, b][channel];
    const destination = canvas.pixels[index + channel];
    canvas.pixels[index + channel] = Math.round(
      (source * alpha + destination * existing * (1 - alpha)) / outAlpha,
    );
  }
  canvas.pixels[index + 3] = Math.round(outAlpha * 255);
}

/**
 * Fills every pixel whose supersampled centre satisfies `test`.
 * @param {(x: number, y: number) => boolean} test
 * @param {(x: number, y: number) => number[]} colourAt
 */
function fill(canvas, test, colourAt) {
  const step = 1 / SAMPLES;
  const offset = step / 2;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          if (test(x + offset + sx * step, y + offset + sy * step)) hits += 1;
        }
      }
      if (hits === 0) continue;
      blend(canvas, x, y, colourAt(x, y), hits / (SAMPLES * SAMPLES));
    }
  }
}

/** Signed-distance test for a rounded rectangle rotated about its centre. */
function roundedRectTest(cx, cy, halfWidth, halfHeight, radius, rotation) {
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const rx = Math.abs(dx * cos - dy * sin);
    const ry = Math.abs(dx * sin + dy * cos);

    const qx = rx - (halfWidth - radius);
    const qy = ry - (halfHeight - radius);

    if (qx <= 0 && qy <= 0) return true;
    if (qx > 0 && qy > 0) return qx * qx + qy * qy <= radius * radius;
    return qx <= 0 ? ry <= halfHeight : rx <= halfWidth;
  };
}

/** Linear gradient sampled along the canvas diagonal. */
function diagonalGradient(size, from, to) {
  return (x, y) => {
    const t = Math.min(Math.max((x + y) / (2 * size), 0), 1);
    return [
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t),
    ];
  };
}

/**
 * Draws the Tilawa mark: an eight-pointed star (two overlaid squares, the
 * classic khatim construction) with an open Mus'haf carved out of it.
 *
 * @param {number} size
 * @param {object} options
 * @param {number[] | null} options.background Fill behind the mark, or null for transparency
 * @param {number} options.inset Fraction of the canvas kept clear around the mark
 */
function drawMark(size, { background = null, inset = 0.16 } = {}) {
  const canvas = createCanvas(size, size);
  const centre = size / 2;

  if (background) {
    fill(
      canvas,
      () => true,
      () => background,
    );
  }

  // A tight corner radius keeps the eight points of the star legible; round the
  // squares much further and the two of them merge into an octagon.
  const half = centre * (1 - inset) * 0.86;
  const radius = half * 0.12;
  const gradient = diagonalGradient(size, COLOURS.emerald, COLOURS.gold);

  fill(canvas, roundedRectTest(centre, centre, half, half, radius, 0), gradient);
  fill(canvas, roundedRectTest(centre, centre, half, half, radius, Math.PI / 4), gradient);

  /**
   * The open Mus'haf.
   *
   * Built from two curved boundaries rather than an ellipse: the top edge rises
   * towards the outer corners and the bottom edge lifts as it approaches them,
   * which is what makes the silhouette read as a book laid open rather than as
   * a circle.
   */
  const pageColour = background ?? COLOURS.paper;
  const bookHalfWidth = half * 0.62;
  const bookHalfHeight = half * 0.44;
  const spineHalfWidth = Math.max(half * 0.035, 1);

  const insideBook = (x, y) => {
    const dx = Math.abs(x - centre);
    if (dx > bookHalfWidth) return false;

    const t = dx / bookHalfWidth;
    const top = centre - bookHalfHeight * (0.52 + 0.48 * t);
    const bottom = centre + bookHalfHeight * (1 - 0.42 * t * t);
    return y >= top && y <= bottom;
  };

  fill(canvas, insideBook, () => pageColour);

  // The spine, re-cut through the pages so two facing leaves read clearly.
  fill(
    canvas,
    (x, y) => insideBook(x, y) && Math.abs(x - centre) <= spineHalfWidth,
    () => COLOURS.emerald,
  );

  // Text lines, suggesting script without pretending to be it. They shorten
  // towards the outer edge so they sit inside the curved page boundary.
  const lineCount = 3;
  const lineHalfHeight = Math.max(size * 0.011, 1);
  const marginX = spineHalfWidth * 3.2;

  for (let line = 0; line < lineCount; line += 1) {
    const offsetY = centre + bookHalfHeight * (-0.12 + line * 0.38);
    const reach = bookHalfWidth * (line === lineCount - 1 ? 0.4 : 0.62);

    fill(
      canvas,
      (x, y) =>
        Math.abs(y - offsetY) <= lineHalfHeight &&
        Math.abs(x - centre) >= marginX &&
        Math.abs(x - centre) <= marginX + reach &&
        insideBook(x, y),
      () => COLOURS.emerald,
    );
  }

  return canvas;
}

/** The favicon, as SVG — sharp at every size and theme-aware. */
function buildFaviconSvg() {
  const rgb = (colour) => `rgb(${colour.join(' ')})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${rgb(COLOURS.emerald)}"/>
      <stop offset="100%" stop-color="${rgb(COLOURS.gold)}"/>
    </linearGradient>
  </defs>
  <g fill="url(#m)">
    <rect x="7" y="7" width="34" height="34" rx="7"/>
    <rect x="7" y="7" width="34" height="34" rx="7" transform="rotate(45 24 24)"/>
  </g>
  <g fill="none" stroke="${rgb(COLOURS.paper)}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 18.4s-2.9-2.4-7.2-2.4c-1.4 0-2.4.2-2.4.2v13.6s1-.2 2.4-.2c4.3 0 7.2 2.4 7.2 2.4s2.9-2.4 7.2-2.4c1.4 0 2.4.2 2.4.2V16.2s-1-.2-2.4-.2c-4.3 0-7.2 2.4-7.2 2.4Z"/>
    <path d="M24 18.4v13.2"/>
  </g>
</svg>
`;
}

/**
 * Word marks for the social preview.
 *
 * The card needs a wordmark, and there is no text rasteriser here — importing
 * one would mean a font parser plus a shaper, which for Arabic means bidi and
 * contextual joining too. Instead each glyph is described as a handful of
 * strokes and dots on a normalised 0–1 box and rendered as rounded capsules.
 * These are deliberately *lettering*, drawn once for this card, not a typeface.
 */

/** Rounded-capsule stroke test: distance from a segment, in canvas units. */
function capsuleTest(x1, y1, x2, y2, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  return (x, y) => {
    const t =
      lengthSquared === 0
        ? 0
        : Math.min(Math.max(((x - x1) * dx + (y - y1) * dy) / lengthSquared, 0), 1);
    const px = x1 + t * dx - x;
    const py = y1 + t * dy - y;
    return px * px + py * py <= radius * radius;
  };
}

/** Circle test, for dots and counters. */
function circleTest(cx, cy, radius) {
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  };
}

/**
 * Draws "تِلاوة" as a single connected Naskh-like ligature.
 *
 * Right-to-left: a long baseline joins the letters, with the alef and lam
 * ascending from it, the waw and ta-marbuta as bowls, and the tashkeel above.
 * The proportions were tuned by eye against the Amiri specimen.
 */
function drawWordmark(canvas, centreX, baselineY, scale, colour) {
  const s = scale;
  const stroke = s * 0.052;
  const paint = (test) => fill(canvas, test, () => colour);

  // The connecting baseline the whole word sits on, right to left.
  const right = centreX + s * 0.92;
  const left = centreX - s * 0.92;
  paint(capsuleTest(right, baselineY, left + s * 0.3, baselineY, stroke));

  // ت — two ascenders' base plus two dots above (rightmost letter).
  paint(capsuleTest(right, baselineY, right, baselineY - s * 0.16, stroke));
  paint(circleTest(right - s * 0.06, baselineY - s * 0.34, stroke * 0.85));
  paint(circleTest(right + s * 0.1, baselineY - s * 0.34, stroke * 0.85));

  // ل — the tall lam, rising well above the line and hooking at the foot.
  const lamX = centreX + s * 0.44;
  paint(capsuleTest(lamX, baselineY, lamX, baselineY - s * 0.78, stroke));

  // ا — the alef.
  const alefX = centreX + s * 0.12;
  paint(capsuleTest(alefX, baselineY, alefX, baselineY - s * 0.72, stroke));

  // و — the waw: a bowl above the line with a descending tail.
  const wawX = centreX - s * 0.24;
  const bowlRadius = s * 0.19;
  paint(circleTest(wawX, baselineY - bowlRadius * 0.85, bowlRadius));
  fill(
    canvas,
    circleTest(wawX, baselineY - bowlRadius * 0.85, bowlRadius - stroke * 1.15),
    () => COLOURS.paper,
  );
  paint(
    capsuleTest(wawX - bowlRadius * 0.4, baselineY, wawX - s * 0.34, baselineY + s * 0.2, stroke),
  );

  // ة — the ta-marbuta: a closed bowl with two dots above.
  const tahX = centreX - s * 0.72;
  const tahRadius = s * 0.17;
  paint(circleTest(tahX, baselineY - tahRadius * 0.8, tahRadius));
  fill(
    canvas,
    circleTest(tahX, baselineY - tahRadius * 0.8, tahRadius - stroke * 1.15),
    () => COLOURS.paper,
  );
  paint(circleTest(tahX - s * 0.07, baselineY - s * 0.42, stroke * 0.8));
  paint(circleTest(tahX + s * 0.07, baselineY - s * 0.42, stroke * 0.8));
}

/** The social preview card: the mark, the wordmark and a gold rule. */
function buildOgImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);

  // Warm vertical wash from paper to sand.
  fill(
    canvas,
    () => true,
    (_x, y) => {
      const t = y / height;
      return [
        Math.round(COLOURS.paper[0] + (COLOURS.sand[0] - COLOURS.paper[0]) * t),
        Math.round(COLOURS.paper[1] + (COLOURS.sand[1] - COLOURS.paper[1]) * t),
        Math.round(COLOURS.paper[2] + (COLOURS.sand[2] - COLOURS.paper[2]) * t),
      ];
    },
  );

  // Deep green band along the bottom edge, with a gold hairline above it.
  fill(
    canvas,
    (_x, y) => y >= height - 14,
    () => COLOURS.forest,
  );
  fill(
    canvas,
    (_x, y) => y >= height - 20 && y < height - 14,
    () => COLOURS.gold,
  );

  // The mark.
  const markSize = 250;
  const mark = drawMark(markSize, { inset: 0.06 });
  const originX = Math.round((width - markSize) / 2);
  const originY = 80;

  for (let y = 0; y < markSize; y += 1) {
    for (let x = 0; x < markSize; x += 1) {
      const source = (y * markSize + x) * 4;
      const alpha = mark.pixels[source + 3] / 255;
      if (alpha === 0) continue;
      blend(
        canvas,
        originX + x,
        originY + y,
        [mark.pixels[source], mark.pixels[source + 1], mark.pixels[source + 2]],
        alpha,
      );
    }
  }

  // The wordmark, beneath the mark.
  drawWordmark(canvas, width / 2, 470, 120, COLOURS.forest);

  // A short gold rule under the wordmark, echoing the ornamental rules in the UI.
  fill(
    canvas,
    (x, y) => Math.abs(y - 520) <= 2 && Math.abs(x - width / 2) <= 90,
    () => COLOURS.gold,
  );
  fill(canvas, roundedRectTest(width / 2, 520, 9, 9, 2, Math.PI / 4), () => COLOURS.gold);

  // Corner ornaments — four small gold squares, echoing the star's geometry.
  for (const [cx, cy] of [
    [70, 70],
    [width - 70, 70],
    [70, height - 90],
    [width - 70, height - 90],
  ]) {
    fill(canvas, roundedRectTest(cx, cy, 13, 13, 3, Math.PI / 4), () => COLOURS.goldLight);
  }

  return canvas;
}

async function main() {
  await mkdir(ICON_DIR, { recursive: true });

  const outputs = [];

  const write = async (path, buffer, label) => {
    await writeFile(path, buffer);
    outputs.push(`${label} — ${(buffer.byteLength / 1024).toFixed(1)} kB`);
  };

  // Vector favicon.
  await write(join(ICON_DIR, 'favicon.svg'), Buffer.from(buildFaviconSvg(), 'utf8'), 'favicon.svg');

  // Standard PWA icons — transparent, so the platform can compose them.
  for (const size of [192, 512]) {
    const canvas = drawMark(size, { inset: 0.08 });
    await write(
      join(ICON_DIR, `icon-${size}.png`),
      encodePng(size, size, canvas.pixels),
      `icon-${size}.png`,
    );
  }

  // Maskable icons — Android crops to a circle inscribed in the safe zone, so
  // the mark is inset to 40% of the canvas and the background is opaque.
  for (const size of [192, 512]) {
    const canvas = drawMark(size, { background: COLOURS.paper, inset: 0.28 });
    await write(
      join(ICON_DIR, `maskable-${size}.png`),
      encodePng(size, size, canvas.pixels),
      `maskable-${size}.png`,
    );
  }

  // iOS refuses transparency and applies its own rounding.
  const apple = drawMark(180, { background: COLOURS.paper, inset: 0.14 });
  await write(
    join(ICON_DIR, 'apple-touch-icon.png'),
    encodePng(180, 180, apple.pixels),
    'apple-touch-icon.png',
  );

  // Shortcut icons, one per manifest shortcut.
  for (const [name, background] of [
    ['shortcut-continue', COLOURS.paper],
    ['shortcut-search', COLOURS.sand],
    ['shortcut-bookmarks', COLOURS.paper],
  ]) {
    const canvas = drawMark(96, { background, inset: 0.2 });
    await write(join(ICON_DIR, `${name}.png`), encodePng(96, 96, canvas.pixels), `${name}.png`);
  }

  // Social preview.
  const og = buildOgImage();
  await write(join(PUBLIC_DIR, 'og-image.png'), encodePng(1200, 630, og.pixels), 'og-image.png');

  console.log('✔ Generated brand assets:');
  for (const line of outputs) console.log(`  · ${line}`);
}

main().catch((error) => {
  console.error('✖ Icon generation failed');
  console.error(error);
  process.exitCode = 1;
});
