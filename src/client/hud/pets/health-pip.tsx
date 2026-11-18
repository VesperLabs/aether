import { Box, theme } from "@/ui";

/** How far the pip sits in from the slot's left and bottom edges, in px. */
const INSET = 2;
/** Its height, black edge to black edge, as a share of the slot's. */
const HEIGHT_SHARE = 0.4;
/** Its red fill's width, in px, between 1px of white either side: wide enough to read. */
const FILL_WIDTH = 2;

/**
 * A pet's health as a thin upright bar in its slot's lower-left corner, under half the slot tall:
 * edged as the HUD's bars are (black outside, white just inside), on a solid black back, its
 * red fill draining from the top as it's hurt.
 */
export const HealthPip = ({ share, slotSize }: { share: number; slotSize: number }) => (
  <Box
    sx={{
      position: "absolute",
      /* The black edge is a shadow outside the box: in by one more, so the edge sits at the inset */
      left: `${INSET + 1}px`,
      bottom: `${INSET + 1}px`,
      boxSizing: "content-box",
      width: FILL_WIDTH,
      /* Less the white border and black edge, top and bottom */
      height: Math.round(slotSize * HEIGHT_SHARE) - 4,
      /* Rounded as the HUD's bars are, the fill clipped to the curve */
      borderRadius: 3,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,.85)",
      boxShadow: "0 0 0 1px #000",
      /* Solid, as a plate's pies are: a see-through back is lost over the pet's art */
      bg: "#000",
      pointerEvents: "none",
      zIndex: 1,
    }}
  >
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: `${Math.max(0, Math.min(1, share)) * 100}%`,
        backgroundColor: theme.colors.red[700],
      }}
    />
  </Box>
);
