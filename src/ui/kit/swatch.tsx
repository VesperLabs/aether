import { Box } from "theme-ui";

/** Every swatch is this many pixels square, wherever it's shown. */
const SWATCH_SIZE = 12;

/** A small square of one colour, to tell options apart at a glance, such as in a dropdown. */
export const Swatch = ({ color }: { color: string }) => (
  <Box
    aria-hidden
    sx={{
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
      flexShrink: 0,
      boxSizing: "border-box",
      bg: color,
      border: "1px solid #000",
    }}
  />
);
