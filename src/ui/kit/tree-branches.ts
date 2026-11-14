import type { ThemeUIStyleObject } from "theme-ui";

/** Space the branches keep from what they join, the same as a row's dotted leader keeps. */
const GAP = 4;

/** How far below a row's middle its text's baseline sits, where the dotted leaders run. */
const BASELINE = "0.35em";

/**
 * Styles a box of rows as the branches of what sits above them (a buff's chance and effects
 * under its icon): a dotted stem drops from the icon's centre, `stem` pixels in, and each row
 * gets a dotted elbow into it. The box is indented `indent` pixels; its rows are its children.
 */
export function treeBranches({
  indent,
  stem,
  color,
}: {
  indent: number;
  stem: number;
  color: string;
}): ThemeUIStyleObject {
  const line = `1px dotted ${color}`;
  const reach = { left: stem - indent, width: indent - stem - GAP };
  return {
    pl: `${indent}px`,
    "& > *": { position: "relative" },
    /* Down from the row above to this row's baseline, then across into it, level with its dots */
    "& > *::before": {
      content: '""',
      position: "absolute",
      top: 0,
      height: `calc(50% + ${BASELINE})`,
      ...reach,
      borderLeft: line,
      borderBottom: line,
    },
    /* The stem starts a little below the icon, not touching it */
    "& > :first-of-type::before": {
      top: `${GAP}px`,
      height: `calc(50% + ${BASELINE} - ${GAP}px)`,
    },
    /* On past this row to the next */
    "& > *:not(:last-child)::after": {
      content: '""',
      position: "absolute",
      top: `calc(50% + ${BASELINE})`,
      bottom: 0,
      left: reach.left,
      borderLeft: line,
    },
  };
}
