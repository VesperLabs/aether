import type { ReactNode } from "react";

const SIZE = 16;

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    aria-hidden
    viewBox="0 0 16 16"
    width={SIZE}
    height={SIZE}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block" }}
  >
    {children}
  </svg>
);

export const PencilIcon = () => (
  <Icon>
    <path d="M2.5 13.5 L3.3 10.2 L10.8 2.7 Q11.5 2 12.2 2.7 L13.3 3.8 Q14 4.5 13.3 5.2 L5.8 12.7 Z" />
    <path d="M9.5 4 L12 6.5" />
  </Icon>
);

export const DropperIcon = () => (
  <Icon>
    <path d="M9 4.5 L11.5 7 L5 13.5 L2.5 13.5 L2.5 11 Z" />
    <path d="M8 3.5 L12.5 8" />
    <path d="M10.2 5.8 L12 4 Q13 3 14 4 Q14.2 5 12.5 6.5 L10.8 8" />
  </Icon>
);

export const MarqueeIcon = () => (
  <Icon>
    <rect x="2.5" y="2.5" width="11" height="11" strokeDasharray="2.5 2" />
  </Icon>
);

export const EraserIcon = () => (
  <Icon>
    <path d="M6 13.5 L2.8 10.3 Q2 9.5 2.8 8.7 L8.7 2.8 Q9.5 2 10.3 2.8 L13.2 5.7 Q14 6.5 13.2 7.3 L7 13.5 Z" />
    <path d="M5.5 6 L10 10.5" />
    <path d="M6 13.5 L14 13.5" />
  </Icon>
);

export const AdjustIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 2.5 A5.5 5.5 0 0 1 8 13.5 Z" fill="currentColor" />
  </Icon>
);

export const MoveIcon = () => (
  <Icon>
    <path d="M8 2 L8 14 M2 8 L14 8" />
    <path d="M6.5 3.5 L8 2 L9.5 3.5 M6.5 12.5 L8 14 L9.5 12.5 M3.5 6.5 L2 8 L3.5 9.5 M12.5 6.5 L14 8 L12.5 9.5" />
  </Icon>
);

export const FlipXIcon = () => (
  <Icon>
    <path d="M8 2 L8 14" strokeDasharray="2 2" />
    <path d="M6 4.5 L2 11.5 L6 11.5 Z M10 4.5 L14 11.5 L10 11.5 Z" />
  </Icon>
);

export const FlipYIcon = () => (
  <Icon>
    <path d="M2 8 L14 8" strokeDasharray="2 2" />
    <path d="M4.5 6 L11.5 2 L11.5 6 Z M4.5 10 L11.5 14 L11.5 10 Z" />
  </Icon>
);

export const RotateIcon = () => (
  <Icon>
    <path d="M3 8 A5 5 0 1 1 8 13" />
    <path d="M10.5 1.5 L13 3.5 L10.5 5.5" transform="rotate(50 8 8)" />
  </Icon>
);

export const UndoIcon = () => (
  <Icon>
    <path d="M5.5 3 L2.5 6 L5.5 9" />
    <path d="M2.5 6 L10 6 Q13.5 6 13.5 9.5 Q13.5 13 10 13 L6 13" />
  </Icon>
);
