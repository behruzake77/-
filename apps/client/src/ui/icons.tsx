import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconBook = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 5.5c2.6-1 5.4-1 8 0v13c-2.6-1-5.4-1-8 0z" />
    <path d="M20 5.5c-2.6-1-5.4-1-8 0v13c2.6-1 5.4-1 8 0z" />
  </Base>
);

export const IconPhone = (props: IconProps) => (
  <Base {...props}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
    <path d="M10 5.5h4" />
    <circle cx="12" cy="18.4" r="0.7" fill="currentColor" stroke="none" />
  </Base>
);

export const IconSound = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
    <path d="M15 8.5c1.6 1.8 1.6 5.2 0 7" />
    <path d="M18 6c3 3.4 3 8.6 0 12" />
  </Base>
);

export const IconMute = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Base>
);

export const IconClose = (props: IconProps) => (
  <Base {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconPin = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </Base>
);

export const IconClock = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

export const IconWalk = (props: IconProps) => (
  <Base {...props}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M11 9l-2 5 3 2 1 5M11 9l4 1 2 3M9 14l-3 1" />
  </Base>
);

export const IconTalk = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 6.5h16v9H9l-5 4z" />
    <path d="M8 10h8M8 12.5h5" />
  </Base>
);

export const IconSpeaker = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 10h3l4-3v10l-4-3H5z" />
    <path d="M15 9c1.3 1.6 1.3 4.4 0 6" />
  </Base>
);

export const IconEye = (props: IconProps) => (
  <Base {...props}>
    <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.4" />
  </Base>
);

export const IconArrow = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const IconBack = (props: IconProps) => (
  <Base {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Base>
);

export const IconCheck = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Base>
);

export const IconCoin = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M9 9.5h5M9 12h5M12 9.5V16" />
  </Base>
);

export const IconSpark = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </Base>
);

export const IconPause = (props: IconProps) => (
  <Base {...props}>
    <path d="M9 5v14M15 5v14" />
  </Base>
);

export const IconMoon = (props: IconProps) => (
  <Base {...props}>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
  </Base>
);

export const IconNote = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 4h14v16H5z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Base>
);

export const IconBag = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 8h14l-1.2 12H6.2z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Base>
);

export const IconLock = (props: IconProps) => (
  <Base {...props}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);

export const IconHint = (props: IconProps) => (
  <Base {...props}>
    <path d="M9 17.5h6M10 20.5h4" />
    <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.2 1.7h5l.2-1.7c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3.5z" />
  </Base>
);
