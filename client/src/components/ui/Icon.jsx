// Minimal stroke icon set (1.5px, 24 grid). Decorative unless given a title.
const PATHS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7M8 7h9v9',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronUp: 'M6 15l6-6 6 6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1 1 0 1 0 0-.01',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  external: 'M14 5h5v5M19 5l-8 8M18 14v5H5V6h5',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  logout: 'M15 12H4M9 7l-5 5 5 5M14 4h6v16h-6',
  sparkle: 'M12 3v5M12 16v5M3 12h5M16 12h5',
  flame: 'M12 21c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-4 3 1-3 0-6-3-8 0 4-4 6-4 12 0 4 3 7 7 7z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
};

export default function Icon({ name, size = 18, className = '', title, strokeWidth = 1.6 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name] || PATHS.arrow} />
    </svg>
  );
}
