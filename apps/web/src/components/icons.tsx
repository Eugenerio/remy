/* eslint-disable react/no-unknown-property */
/**
 * Hand-drawn SVG icons for Remy.
 *
 * lucide-react is explicitly NOT a dependency — ADR 0002 bans it. These
 * icons are custom, 24x24 by default, 1.6-stroke, round linecaps. Adding
 * a new icon: keep the same stroke width and viewBox, and design on a
 * 24px grid so line weight stays consistent at the default size.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps, children: React.ReactNode) {
  const { size = 20, strokeWidth = 1.6, className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Spark = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 3l.6 1.7L21 5.3l-1.4.6L19 7.6l-.6-1.7L17 5.3l1.4-.6z" />
    </>,
  );

export const SparkSmall = (p: IconProps) =>
  base(
    p,
    <path d="M12 5l1.5 4.2L18 11l-4.5 1.8L12 17l-1.5-4.2L6 11l4.5-1.8z" />,
  );

export const User = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6" />
    </>,
  );

export const Characters = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="10" r="2.5" />
      <path d="M3 20c1-4 3.5-6 6-6s5 2 6 6" />
      <path d="M14 20c.6-2 1.8-3 3.5-3s2.9 1 3.5 3" />
    </>,
  );

export const Upload = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 16V5" />
      <path d="M7 10l5-5 5 5" />
      <path d="M5 19h14" />
    </>,
  );

export const Film = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18M3 16h18M9 4v16M15 4v16" />
    </>,
  );

export const Trend = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 17l6-6 4 4 6-8" />
      <path d="M14 7h6v6" />
    </>,
  );

export const Library = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="6" height="16" rx="1.5" />
      <rect x="10" y="6" width="4" height="14" rx="1.5" />
      <path d="M16 5l4.5 1.2-3 14L13 19z" />
    </>,
  );

export const Settings = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09c0 .66.39 1.25 1 1.51a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82c.26.61.85 1 1.51 1H21a2 2 0 110 4h-.09c-.66 0-1.25.39-1.51 1z" />
    </>,
  );

export const Billing = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>,
  );

export const Admin = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  );

export const Check = (p: IconProps) =>
  base(p, <path d="M5 12l4 4 10-10" />);

export const CheckCircle = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>,
  );

export const AlertCircle = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>,
  );

export const Clock = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  );

export const ArrowRight = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>,
  );

export const ArrowLeft = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>,
  );

export const Close = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>,
  );

export const Plus = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>,
  );

export const Trash = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
      <path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
    </>,
  );

export const Edit = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M14 4l6 6-11 11H3v-6z" />
      <path d="M13 5l6 6" />
    </>,
  );

export const ExternalLink = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5" />
    </>,
  );

export const Copy = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </>,
  );

export const Download = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M12 5v12" />
      <path d="M7 13l5 5 5-5" />
      <path d="M5 20h14" />
    </>,
  );

export const Play = (p: IconProps) =>
  base(p, <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />);

export const Pause = (p: IconProps) =>
  base(
    p,
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </>,
  );

export const Eye = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );

export const EyeOff = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M3 3l18 18" />
      <path d="M10.7 6.2A10 10 0 0112 6c6.5 0 10 7 10 7a17 17 0 01-3.3 4.3" />
      <path d="M6.1 6.1A17 17 0 002 13s3.5 7 10 7a10 10 0 004.2-.9" />
      <path d="M9.9 9.9a3 3 0 104.2 4.2" />
    </>,
  );

export const Menu = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>,
  );

export const Logo = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M3 17c3-2 6-5 9-11 3 6 6 9 9 11-3 2-6 3-9 3s-6-1-9-3z" fill="currentColor" stroke="currentColor" />
      <path d="M10 14c.5-2 1-3 2-4.5 1 1.5 1.5 2.5 2 4.5" stroke="var(--color-paper)" />
    </>,
  );

export const Spinner = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M21 12a9 9 0 11-9-9" />
    </>,
  );

export const Refresh = (p: IconProps) =>
  base(
    p,
    <>
      <path d="M4 12a8 8 0 0114-5" />
      <path d="M20 6v5h-5" />
      <path d="M20 12a8 8 0 01-14 5" />
      <path d="M4 18v-5h5" />
    </>,
  );

export const Search = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>,
  );

export const Credit = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6l1.6 4 4 .6-3 2.8.8 4L12 15l-3.4 2 .8-4L6.4 10l4-.6z" />
    </>,
  );

export const Sun = (p: IconProps) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
  );

export const Moon = (p: IconProps) =>
  base(p, <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />);
