import { Button, theme } from "@/ui";

/** The sign's grid: one cell per screen pixel, so its strokes are a single pixel thick. */
const SIGN = 9;
/** Line height of a control's text (`CONTROL_TEXT` in the theme). */
const CONTROL_LINE = 1.25;
/**
 * Square, exactly as tall as a wood text button (Save, Saved): its line of text, its padding and
 * its border, from the same theme values, so a row of them lines up.
 */
const SIZE = theme.fontSizes[1] * CONTROL_LINE + theme.space[1] * 2 + 2;

const MINUS = "M0 4h9v1H0z";
const PLUS = `${MINUS}M4 0h1v9H4z`;

/** A chevron two pixels thick, stepping one pixel a row, pointing left. */
const CHEVRON_ROWS = [5, 4, 3, 2, 3, 4, 5];
const LEFT = CHEVRON_ROWS.map((x, i) => `M${x} ${i + 1}h2v1h-2z`).join("");
const RIGHT = CHEVRON_ROWS.map((x, i) => `M${SIGN - x - 2} ${i + 1}h2v1h-2z`).join("");

/** A hooked arrow turning back to the left, as rows of [first, last] pixels. */
const UNDO_ROWS: [number, number][][] = [
  [[2, 2]],
  [[1, 6]],
  [
    [0, 2],
    [7, 7],
  ],
  [
    [1, 2],
    [8, 8],
  ],
  [
    [2, 2],
    [8, 8],
  ],
  [[8, 8]],
  [[7, 7]],
  [[4, 6]],
];
const toPath = (mirror: boolean) =>
  UNDO_ROWS.flatMap((runs, y) =>
    runs.map(([from, to]) => {
      const x = mirror ? SIGN - 1 - to : from;
      return `M${x} ${y}h${to - from + 1}v1h-${to - from + 1}z`;
    }),
  ).join("");

/** A cross corner to corner, one pixel a step, like the plus's strokes. */
const CROSS = Array.from({ length: SIGN }, (_, i) =>
  i === SIGN - 1 - i ? `M${i} ${i}h1v1h-1z` : `M${i} ${i}h1v1h-1zM${SIGN - 1 - i} ${i}h1v1h-1z`,
).join("");

/** The signs a `SignButton` can show, as paths on its grid. */
export const SIGNS = {
  minus: MINUS,
  plus: PLUS,
  left: LEFT,
  right: RIGHT,
  undo: toPath(false),
  redo: toPath(true),
  close: CROSS,
};

/**
 * A small square wood button with a crisp pixel sign on it: the window's fold button, the body
 * editor's frame arrows, undo and redo, a window's close. One size and
 * one pixel grid for all, so they match wherever they sit. `label` is spoken and shown on hover.
 */
export const SignButton = ({
  sign,
  label,
  disabled,
  onClick,
}: {
  sign: keyof typeof SIGNS;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Button
    disabled={disabled}
    aria-label={label}
    title={label}
    onClick={onClick}
    sx={{
      width: SIZE,
      height: SIZE,
      minHeight: SIZE,
      p: 0,
      flexShrink: 0,
      boxSizing: "border-box",
    }}
  >
    <svg
      width={SIGN}
      height={SIGN}
      viewBox={`0 0 ${SIGN} ${SIGN}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d={SIGNS[sign]} />
    </svg>
  </Button>
);
