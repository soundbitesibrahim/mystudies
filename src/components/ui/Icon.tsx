/** A small hand-rolled icon set — no icon dependency, consistent stroke. */

import React from 'react';

export type IconName =
  | 'gauge'
  | 'target'
  | 'book'
  | 'clipboard'
  | 'clock'
  | 'flag'
  | 'settings'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'download'
  | 'upload'
  | 'close'
  | 'check'
  | 'chevron-right'
  | 'refresh'
  | 'info'
  | 'spark'
  | 'layers'
  | 'repeat'
  | 'calendar'
  | 'search'
  | 'menu'
  | 'play'
  | 'pause'
  | 'skip'
  | 'snooze'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-left';

const PATHS: Record<IconName, React.ReactNode> = {
  gauge: (
    <>
      <path d="M12 14.5 16 9" />
      <path d="M3.6 17a9 9 0 1 1 16.8 0" />
      <circle cx="12" cy="15" r="1.4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 21H19" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7z" />
      <path d="m9 13 2.2 2.2L15.5 11" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4.5h10.5l-1.8 3.6 1.8 3.6H6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.5 13h-.2a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.5 6.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0-3-3L5.2 17z" />
      <path d="m14.5 7.5 2.9 2.9" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15" />
      <path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
      <path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="m7.5 8 4.5-4.5L16.5 8" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  close: (
    <>
      <path d="m6.5 6.5 11 11" />
      <path d="m17.5 6.5-11 11" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 8h.01" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 11 10.1 9z" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8 4.5-8 4.5-8-4.5z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </>
  ),
  repeat: (
    <>
      <path d="M4.5 10a5.5 5.5 0 0 1 5.5-5.5h9" />
      <path d="m16 1.5 3 3-3 3" />
      <path d="M19.5 14a5.5 5.5 0 0 1-5.5 5.5H5" />
      <path d="m8 22.5-3-3 3-3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  play: <path d="M7.5 4.8 19 12 7.5 19.2z" />,
  pause: (
    <>
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </>
  ),
  skip: (
    <>
      <path d="M6 5.5 15 12l-9 6.5z" />
      <path d="M18.5 5v14" />
    </>
  ),
  snooze: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.5 1.5" />
      <path d="M9 2.5h6" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  'chevron-left': <path d="M14.5 5.5 8 12l6.5 6.5" />,
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
