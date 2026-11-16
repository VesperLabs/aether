import { Button } from "@/ui";

/** The sign's grid: one cell per screen pixel, so its strokes are a single pixel thick. */
const SIGN = 9;
const MINUS = "M0 4h9v1H0z";
const PLUS = `${MINUS}M4 0h1v9H4z`;
/** Square, a little shorter than a select, so it sits in a header without stretching it. */
const SIZE = 22;

/**
 * A window's fold button: a small wood button with a thin minus to fold the window up to its
 * header, a plus to open it again.
 */
export const FoldButton = ({ folded, onClick }: { folded: boolean; onClick: () => void }) => (
  <Button
    aria-label={folded ? "Unfold" : "Fold up"}
    title={folded ? "Unfold" : "Fold up"}
    onClick={onClick}
    sx={{ width: SIZE, height: SIZE, minHeight: SIZE, p: 0, flexShrink: 0 }}
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
      <path d={folded ? PLUS : MINUS} />
    </svg>
  </Button>
);
