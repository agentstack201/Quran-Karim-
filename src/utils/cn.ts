/**
 * Conditional class-name composition.
 *
 * Deliberately dependency-free: `clsx` and `tailwind-merge` would add ~4 kB for
 * behaviour this project does not need. Conflicting utilities are avoided by
 * construction — variants are defined as complete, mutually exclusive class
 * strings rather than patched together at call sites.
 */
export type ClassValue = string | number | null | undefined | false | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value && value !== 0) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    out.push(String(value));
  };

  for (const value of values) walk(value);

  return out.join(' ').replace(/\s+/g, ' ').trim();
}
