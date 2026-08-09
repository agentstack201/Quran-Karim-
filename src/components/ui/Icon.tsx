import type { SVGProps } from 'react';
import { cn } from '@/utils';

/**
 * The application's icon set.
 *
 * Hand-drawn on a 24×24 grid with a consistent 1.75 stroke weight and round
 * joins, so every glyph reads as part of one family. Kept in-repo rather than
 * pulled from an icon package: the app needs ~35 icons, and shipping them as
 * inline SVG costs nothing at runtime and nothing in the dependency tree.
 */
const PATHS = {
  home: 'M3 10.6 12 3.5l9 7.1M5.5 9.4V20h13V9.4M9.75 20v-5.5h4.5V20',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v14.5H5.5A1.5 1.5 0 0 0 4 19V4.5ZM4 19a1.5 1.5 0 0 0 1.5 1.5H19M8 7.5h7M8 11h5',
  layers: 'M12 3.2 3.5 7.5 12 11.8l8.5-4.3L12 3.2ZM3.5 12 12 16.3 20.5 12M3.5 16.5 12 20.8l8.5-4.3',
  grid: 'M4 4h6.2v6.2H4V4Zm9.8 0H20v6.2h-6.2V4ZM4 13.8h6.2V20H4v-6.2Zm9.8 0H20V20h-6.2v-6.2Z',
  bookmark: 'M6.5 3.75h11a.75.75 0 0 1 .75.75v15.2l-6.25-4-6.25 4V4.5a.75.75 0 0 1 .75-.75Z',
  search: 'M10.9 18.3a7.4 7.4 0 1 0 0-14.8 7.4 7.4 0 0 0 0 14.8ZM16.4 16.4 21 21',
  settings:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 14.4a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.75 2.75l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.75-2.75l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.17a1.94 1.94 0 1 1 0-3.88h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 1 1 2.75-2.75l.06.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.47v-.17a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.75 2.75l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.47.97Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1.8v2.4M12 19.8v2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7',
  moon: 'M20.5 14.4A8.6 8.6 0 1 1 9.6 3.5a6.7 6.7 0 0 0 10.9 10.9Z',
  monitor: 'M3.5 5.2h17v10.6h-17V5.2ZM8.5 20.5h7M12 15.8v4.7',
  play: 'M7.5 4.8v14.4l11.5-7.2L7.5 4.8Z',
  pause: 'M9 5v14M15 5v14',
  next: 'M18 5.5v13M16 12 6.5 5.8v12.4L16 12Z',
  previous: 'M6 5.5v13M8 12l9.5-6.2v12.4L8 12Z',
  volume: 'M11 5 6.5 8.8H3.5v6.4h3L11 19V5Z',
  volumeWave: 'M14.6 9a4.2 4.2 0 0 1 0 6M17.4 6.4a8 8 0 0 1 0 11.2',
  volumeMute: 'M15.5 9.8 20.5 14.8M20.5 9.8 15.5 14.8',
  copy: 'M9 9.5A1.5 1.5 0 0 1 10.5 8h8A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 9 17.5v-8ZM5.5 15.5A1.5 1.5 0 0 1 4 14v-8A1.5 1.5 0 0 1 5.5 4.5h8A1.5 1.5 0 0 1 15 6',
  share:
    'M18 8.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM6 14.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM18 21.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM8.3 13.4l7.4 4.3M15.7 6.3 8.3 10.6',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M3.5 7h17M3.5 12h17M3.5 17h17',
  chevronDown: 'm6 9.5 6 6 6-6',
  chevronUp: 'm6 14.5 6-6 6 6',
  chevronStart: 'm14.5 6-6 6 6 6',
  chevronEnd: 'm9.5 6 6 6-6 6',
  arrowUp: 'M12 20V4M5.5 10.5 12 4l6.5 6.5',
  arrowStart: 'M20 12H4M10.5 5.5 4 12l6.5 6.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  reset: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v5h5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5v-5M12 8.2h.01',
  alert: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5v5.5M12 16.6h.01',
  check: 'm4.5 12.5 5 5 10-11',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.2l2.8 2.8L16 9.5',
  offline:
    'M2.5 8.6a16 16 0 0 1 5-3.1M16.5 5.5a16 16 0 0 1 5 3.1M6.3 12.3a10.5 10.5 0 0 1 3-1.8M14.7 10.5a10.5 10.5 0 0 1 3 1.8M9.8 16a5 5 0 0 1 4.4 0M12 20h.01M3 3l18 18',
  download: 'M12 3.5v11.5M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  install: 'M12 3.5v10M8 9.8l4 3.8 4-3.8M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15',
  keyboard: 'M3.5 6.5h17v11h-17v-11ZM7 10h.01M10.5 10h.01M14 10h.01M17 10h.01M7.5 14h9',
  textSize: 'M3.5 6h9M8 6v13M13.5 11h7M17 11v8',
  palette:
    'M12 20.5a8.5 8.5 0 1 1 8.5-8.5c0 1.8-1.5 2.6-3 2.6h-1.4a2.1 2.1 0 0 0-1.5 3.6 1.7 1.7 0 0 1-1.2 2.3 8.6 8.6 0 0 1-1.4.1ZM7.5 12h.01M10 8.5h.01M14.5 8.5h.01',
  headphones:
    'M4 15v-3a8 8 0 1 1 16 0v3M4 14.5h2.2A1.3 1.3 0 0 1 7.5 15.8v3.4a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 19.2v-4.7ZM20 14.5h-2.2a1.3 1.3 0 0 0-1.3 1.3v3.4a1.3 1.3 0 0 0 1.3 1.3h.9a1.3 1.3 0 0 0 1.3-1.3v-4.7Z',
  sparkle:
    'M12 3.2 13.9 9l5.9 1.9-5.9 1.9L12 18.7l-1.9-5.9-5.9-1.9L10.1 9 12 3.2ZM19 3.5v3M17.5 5h3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.2V12l3.2 2',
  star: 'm12 3.6 2.6 5.4 5.9.85-4.25 4.15 1 5.9L12 17.1l-5.25 2.8 1-5.9L3.5 9.85 9.4 9 12 3.6Z',
  trash:
    'M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5l.9 13a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-13M10 10.5v6M14 10.5v6',
  filter: 'M3.5 6h17M6.5 12h11M10 18h4',
  translate:
    'M3.5 6h8M7.5 4v2M9.5 6a9 9 0 0 1-6 8.5M5.5 10a7.5 7.5 0 0 0 5.5 4.5M12.5 20.5l4.5-11 4.5 11M14.4 17h5.2',
  page: 'M6 3.5h7.5L19 9v11.5H6V3.5ZM13 3.5V9h6',
  mushaf:
    'M12 6.2S9.8 4.2 6.5 4.2c-1.2 0-2 .2-2 .2v14s.8-.2 2-.2c3.3 0 5.5 2 5.5 2s2.2-2 5.5-2c1.2 0 2 .2 2 .2v-14s-.8-.2-2-.2c-3.3 0-5.5 2-5.5 2Zm0 0v14',
  spinner: 'M12 3.5a8.5 8.5 0 0 1 8.5 8.5',
  eye: 'M2.5 12C4.5 8 8 5.5 12 5.5S19.5 8 21.5 12C19.5 16 16 18.5 12 18.5S4.5 16 2.5 12ZM15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  eyeOff:
    'M10.7 6.7A8.4 8.4 0 0 1 12 6.6c4 0 7.5 2.4 9.5 5.4a15 15 0 0 1-3 3.4M6.6 8.3A14.8 14.8 0 0 0 2.5 12c2 3 5.5 5.4 9.5 5.4 1.4 0 2.7-.3 3.9-.8M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17',
} as const;

export type IconName = keyof typeof PATHS;

/** Icons whose paths describe a filled shape rather than a stroke. */
const FILLED = new Set<IconName>(['play', 'next', 'previous', 'volume']);

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  readonly name: IconName;
  /** Size in pixels. Defaults to 20, matching the UI text cap height. */
  readonly size?: number;
  /** Accessible label. When omitted the icon is hidden from screen readers. */
  readonly label?: string;
};

export function Icon({ name, size = 20, label, className, ...rest }: IconProps): React.JSX.Element {
  const isFilled = FILLED.has(name);

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={isFilled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
      {name === 'volume' ? (
        <path d={PATHS.volumeWave} fill="none" strokeWidth={1.75} />
      ) : name === 'volumeMute' ? (
        <path d={PATHS.volume} fill="currentColor" />
      ) : null}
    </svg>
  );
}
