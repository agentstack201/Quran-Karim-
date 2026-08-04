import { cn } from '@/utils';

export type LogoProps = {
  readonly className?: string;
  readonly title?: string;
};

/**
 * The Tilawa mark.
 *
 * An eight-pointed Islamic star (khatim) enclosing an open Mus'haf. The star is
 * drawn as two overlaid squares — the classic geometric construction — so the
 * form is authentic rather than decorative pastiche. Rendered as inline SVG
 * with `currentColor`-derived gradients so it inherits the active theme with no
 * extra request and no dark-mode variant to maintain.
 */
export function Logo({ className, title }: LogoProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id="tilawa-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent-strong)" />
        </linearGradient>
      </defs>

      {/* Eight-pointed star: a square and its 45° rotation. */}
      <g fill="url(#tilawa-mark)">
        <rect x="7" y="7" width="34" height="34" rx="7" opacity="0.92" />
        <rect
          x="7"
          y="7"
          width="34"
          height="34"
          rx="7"
          opacity="0.92"
          transform="rotate(45 24 24)"
        />
      </g>

      {/* Open Mus'haf, carved out of the star. */}
      <g
        fill="none"
        stroke="var(--surface-raised)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 18.4s-2.9-2.4-7.2-2.4c-1.4 0-2.4.2-2.4.2v13.6s1-.2 2.4-.2c4.3 0 7.2 2.4 7.2 2.4s2.9-2.4 7.2-2.4c1.4 0 2.4.2 2.4.2V16.2s-1-.2-2.4-.2c-4.3 0-7.2 2.4-7.2 2.4Z" />
        <path d="M24 18.4v13.2" />
      </g>
    </svg>
  );
}
