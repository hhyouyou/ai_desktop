import type { SVGProps } from "react";
import type { IconKey } from "@/lib/site";

type P = SVGProps<SVGSVGElement>;

const paths: Record<IconKey, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5 9.4 14.6 2.5 12l6.9-2.6Z" />
      <circle cx="19" cy="5" r="1.6" />
    </>
  ),
  brush: (
    <>
      <path d="M4 20c3.5 0 4.5-2 4.5-4.5C8.5 13 10 11.5 12 11.5s3.5 1.5 3.5 4C15.5 18 16.5 20 20 20" />
      <path d="M14 3.5 20.5 10 12 18.5 5.5 12Z" />
    </>
  ),
  flame: (
    <>
      <path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-4.4-4-6.3-4.7-11.8-2.2 1.7-3 4-3 5.6-1-.5-1.6-1.6-1.8-2.6C7.2 7.7 5.5 10.6 5.5 14.8 5.5 18.4 8 21 12 21Z" />
    </>
  ),
  check: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="m8 12.2 2.8 2.8L16.2 9" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16Z" />
      <path d="m14 5 4 4" />
      <path d="M4 20v-4" />
    </>
  ),
  calc: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="4" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="3.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <circle cx="12" cy="15.8" r="1.4" />
    </>
  ),
  house: (
    <>
      <path d="M3.5 11 12 3.5 20.5 11" />
      <path d="M5.5 10v10h13V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l4 2" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
      <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 20.5h1" />
    </>
  ),
  braces: (
    <>
      <path d="M9 4c-2.5 0-2.5 3-2.5 5S5.5 12 4.5 12c1 0 2 1 2 3s0 5 2.5 5" />
      <path d="M15 4c2.5 0 2.5 3 2.5 5s1 3 2 3c-1 0-2 1-2 3s0 5-2.5 5" />
    </>
  ),
  hash: (
    <>
      <path d="M9 3 7.5 21M16.5 3 15 21M4 8.5h16M3.5 15.5h16" />
    </>
  ),
  code: (
    <>
      <path d="m8 8-4.5 4L8 16" />
      <path d="m16 8 4.5 4L16 16" />
      <path d="M13.5 5 10.5 19" />
    </>
  ),
  compress: (
    <>
      <path d="M9 3v4.5H4.5" />
      <path d="M15 21v-4.5h4.5" />
      <path d="M3.5 3.5 9 9" />
      <path d="M20.5 20.5 15 15" />
      <path d="M15 3v4.5h4.5" />
      <path d="M9 21v-4.5H4.5" />
      <path d="M20.5 3.5 15 9" />
      <path d="M3.5 20.5 9 15" />
    </>
  ),
  crop: (
    <>
      <path d="M6.5 2.5v15h15" />
      <path d="M2.5 6.5h15v15" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.6 0 2.4-1 2.4-2.2 0-1.4-1.1-1.9-1.1-3 0-.9.8-1.6 1.8-1.6H17c2.2 0 4-1.8 4-4A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="11" cy="6.8" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="8.4" r="1.2" fill="currentColor" />
    </>
  ),
  diff: (
    <>
      <path d="M5 3.5v17M19 3.5v17" />
      <path d="M9 7h6M9 12h6M9 17h6" />
    </>
  ),
  text: (
    <>
      <path d="M4 6h16M4 12h10M4 18h13" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="3" />
      <path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-8a2 2 0 0 0-2 2v8a1 1 0 0 0 1 1h1" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l1 13h9l1-13" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4.5h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20Z" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="3.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m3.8 17 5-5 4 4 3-3 4.4 4.4" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 2.1,
  ...rest
}: { name: IconKey; size?: number; strokeWidth?: number } & Omit<P, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      role="img"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#14110F" />
      <rect x="9" y="9" width="12" height="12" rx="3" fill="#FF5A36" />
      <rect x="24" y="9" width="15" height="12" rx="3" fill="#FFC93C" />
      <rect x="9" y="24" width="12" height="15" rx="3" fill="#2F5BFF" />
      <rect x="24" y="24" width="15" height="15" rx="3" fill="#00C48C" />
    </svg>
  );
}
