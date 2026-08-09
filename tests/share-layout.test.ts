import { describe, expect, it } from 'vitest';
import { fitText, wrapLines, type Measure } from '@/features/share/layout';

/**
 * A stub metric: every character is `fontSize / 2` wide.
 *
 * Deterministic and independent of any installed font, so these tests measure
 * the layout arithmetic rather than the machine they run on.
 */
const measure: Measure = (text, fontSize) => text.length * (fontSize / 2);

describe('wrapLines', () => {
  it('keeps text on one line when it fits', () => {
    expect(wrapLines('الحمد لله', 200, 10, measure)).toEqual(['الحمد لله']);
  });

  it('breaks at spaces once a line would overflow', () => {
    // At size 10 each character is 5 wide, so 50 units holds ten characters.
    const lines = wrapLines('اثنان ثلاثة اربعة خمسة', 50, 10, measure);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measure(line, 10)).toBeLessThanOrEqual(50);
    }
  });

  /**
   * The property that matters most: a shared image must contain the ayah, whole.
   * Losing or reordering a word would be a far worse defect than an ugly break.
   */
  it('preserves every word, in order', () => {
    const text = 'الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين';
    const lines = wrapLines(text, 40, 10, measure);
    expect(lines.join(' ')).toBe(text);
  });

  it('gives a word too long for the line a line of its own rather than cutting it', () => {
    const lines = wrapLines('قصير فأنلزمكموها طويل', 30, 10, measure);

    expect(lines).toContain('فأنلزمكموها');
    expect(lines.join(' ')).toBe('قصير فأنلزمكموها طويل');
  });

  it('collapses runs of whitespace instead of emitting blank lines', () => {
    expect(wrapLines('  الحمد   لله  ', 200, 10, measure)).toEqual(['الحمد لله']);
  });

  it('returns nothing for empty text', () => {
    expect(wrapLines('', 200, 10, measure)).toEqual([]);
    expect(wrapLines('   ', 200, 10, measure)).toEqual([]);
  });
});

describe('fitText', () => {
  const box = { maxWidth: 400, maxHeight: 300, maxFontSize: 60, minFontSize: 20, leading: 2 };

  it('uses the largest size for a short verse', () => {
    // 5 characters at 60px is 150 wide against a 400 box — comfortably one line.
    const fitted = fitText({ text: 'قل هو', ...box, measure });
    expect(fitted.fontSize).toBe(box.maxFontSize);
    expect(fitted.lines).toHaveLength(1);
  });

  it('prefers wrapping at full size over shrinking to fit one line', () => {
    // Two lines at the largest size read better than one cramped line, and
    // there is height to spare — so the size must not drop.
    const fitted = fitText({ text: 'قل هو الله أحد', ...box, measure });

    expect(fitted.fontSize).toBe(box.maxFontSize);
    expect(fitted.lines).toHaveLength(2);
    expect(fitted.lines.join(' ')).toBe('قل هو الله أحد');
  });

  it('shrinks a long verse until it fits the box', () => {
    const long = Array.from({ length: 40 }, () => 'كلمة').join(' ');
    const fitted = fitText({ text: long, ...box, measure });

    expect(fitted.fontSize).toBeLessThan(box.maxFontSize);
    expect(fitted.lines.length * fitted.lineHeight).toBeLessThanOrEqual(box.maxHeight);
    for (const line of fitted.lines) {
      expect(measure(line, fitted.fontSize)).toBeLessThanOrEqual(box.maxWidth);
    }
  });

  it('never shrinks below the floor, and keeps the whole verse there', () => {
    // Al-Baqarah 282 is the longest ayah; nothing has to fit, but nothing may
    // be dropped either.
    const enormous = Array.from({ length: 400 }, () => 'كلمة').join(' ');
    const fitted = fitText({ text: enormous, ...box, measure });

    expect(fitted.fontSize).toBe(box.minFontSize);
    expect(fitted.lines.join(' ')).toBe(enormous);
  });

  it('derives line height from the chosen size', () => {
    const fitted = fitText({ text: 'قل هو الله أحد', ...box, measure });
    expect(fitted.lineHeight).toBe(fitted.fontSize * box.leading);
  });

  it('handles empty text without looping forever', () => {
    const fitted = fitText({ text: '', ...box, measure });
    expect(fitted.lines).toEqual([]);
  });
});
