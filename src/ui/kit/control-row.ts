import type { ThemeUIStyleObject } from "theme-ui";

/**
 * A labelled row holding a control (a toggle, a slider): a dark band, its text inset as a
 * field's is (padding plus border), tall enough that a controller badge on its corner clears
 * the text, and cornered like fields and buttons.
 */
export const CONTROL_ROW: ThemeUIStyleObject = {
  px: "9px",
  py: "6px",
  borderRadius: "4px",
  bg: "shadow.10",
};
