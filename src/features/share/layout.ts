/**
 * Text layout for the shareable ayah image.
 *
 * Kept apart from the canvas so the awkward part — fitting an arbitrary ayah
 * into a fixed square without it overflowing or floating in whitespace — can be
 * tested against a stub instead of against a browser. The caller supplies a
 * `measure` function; everything here is arithmetic.
 */

/** Measures the rendered width of a string at a given font size. */
export type Measure = (text: string, fontSize: number) => number;

export type FittedText = {
  readonly lines: readonly string[];
  readonly fontSize: number;
  readonly lineHeight: number;
};

/**
 * Breaks text into lines that fit a width.
 *
 * Splits on spaces, which is safe for Arabic: letters join within a word and
 * never across a space, so a line break can never alter a word's shape. A word
 * wider than the whole line is kept on a line of its own rather than being cut
 * — a truncated Quranic word is not an acceptable output at any size.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  measure: Measure,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Finds the largest size at which the text still fits the box.
 *
 * Stepping down from the maximum rather than solving directly, because line
 * count changes discontinuously with size: one pixel smaller can remove a line
 * and free far more height than the size change alone suggests.
 *
 * At the floor the text is laid out anyway and allowed to overflow, which the
 * caller resolves by growing the canvas. The alternative — dropping words — is
 * not one.
 */
export function fitText(input: {
  readonly text: string;
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxFontSize: number;
  readonly minFontSize: number;
  /** Multiple of the font size used as line height. */
  readonly leading: number;
  readonly measure: Measure;
}): FittedText {
  const { text, maxWidth, maxHeight, maxFontSize, minFontSize, leading, measure } = input;

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    const lines = wrapLines(text, maxWidth, fontSize, measure);
    const lineHeight = fontSize * leading;
    if (lines.length * lineHeight <= maxHeight) {
      return { lines, fontSize, lineHeight };
    }
  }

  const lines = wrapLines(text, maxWidth, minFontSize, measure);
  return { lines, fontSize: minFontSize, lineHeight: minFontSize * leading };
}
