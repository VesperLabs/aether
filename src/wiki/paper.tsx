import { Box, Flex, Text } from "@/ui";

/** Parchment palette shared by the wiki's paper cards and plaque. */
export const PAPER = {
  fill: "#fbf7ee",
  rule: "#e2d6bf",
  ornament: "#d3c3a3",
  frame: "#e9dfcc",
  ink: "#4a3826",
  muted: "#7a6650",
  accent: "#2f7fd8",
};

/** The paper sheet itself. Its contents sit above `PaperFrame` when they are positioned. */
export const PAPER_STYLE = {
  position: "relative",
  background: PAPER.fill,
  border: `1px solid ${PAPER.rule}`,
  borderRadius: 2,
  boxShadow: "0 6px 16px rgba(0, 0, 0, .25)",
  color: PAPER.ink,
  fontWeight: "body",
  "&, & *": { textShadow: "none" },
  "& > :not([aria-hidden])": { position: "relative", zIndex: 1 },
} as const;

/** How far the ornament frame sits inside the paper's edge, in pixels. */
const INSET = 6;

/**
 * The decorations inside a paper sheet: fret corners joined by a rule. Cards get a double rule and
 * a diamond at the bottom; `simple` keeps just the corners and a single rule.
 */
export const PaperFrame = ({ simple = false }: { simple?: boolean }) => (
  <>
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: `${INSET + 2}px`,
        border: `1px solid ${PAPER.frame}`,
        pointerEvents: "none",
        "&::after": simple
          ? {}
          : {
              content: '""',
              position: "absolute",
              inset: "3px",
              border: `1px dotted ${PAPER.frame}`,
            },
      }}
    />
    {!simple && (
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: "50%",
          bottom: `${INSET - 1}px`,
          width: 7,
          height: 7,
          background: PAPER.fill,
          border: `1px solid ${PAPER.ornament}`,
          transform: "translateX(-50%) rotate(45deg)",
        }}
      />
    )}
    <Corner sx={{ top: `${INSET}px`, left: `${INSET}px` }} />
    <Corner sx={{ top: `${INSET}px`, right: `${INSET}px`, transform: "scaleX(-1)" }} />
    <Corner sx={{ bottom: `${INSET}px`, left: `${INSET}px`, transform: "scaleY(-1)" }} />
    <Corner sx={{ bottom: `${INSET}px`, right: `${INSET}px`, transform: "scale(-1)" }} />
  </>
);

/**
 * A fret-and-curl ornament for a corner, drawn for the top-left and mirrored for the rest.
 * Its paper fill hides the frame line where the two cross.
 */
const Corner = ({ sx }: { sx: object }) => (
  <Box
    as="svg"
    aria-hidden
    {...{ viewBox: "0 0 28 28", width: 28, height: 28 }}
    sx={{ position: "absolute", pointerEvents: "none", background: PAPER.fill, ...sx }}
  >
    <g fill="none" stroke={PAPER.ornament} strokeWidth="1.5" strokeLinecap="square">
      <path d="M6 20V6h10v8h-6v-4h2" />
      <path d="M18 6c4 0 6 1.5 6 4s-2.5 3-3.5 1.5" />
      <path d="M6 22c0 3 1.5 4 4 4s3-2.5 1.5-3.5" />
    </g>
  </Box>
);

/**
 * A thin rule in the card's trim colour. With a `label` it doubles as the section's heading,
 * set in small caps in the middle of the rule; without one, a small diamond sits there instead.
 */
export const Divider = ({ label }: { label?: string }) => (
  <Flex sx={{ alignItems: "center", gap: 2, my: 3 }}>
    <Box aria-hidden sx={{ flex: 1, height: "1px", bg: PAPER.frame }} />
    {label ? (
      <Text sx={{ fontSize: 0, color: PAPER.muted, letterSpacing: "0.12em", lineHeight: 1 }}>
        {label.toUpperCase()}
      </Text>
    ) : (
      <Box
        aria-hidden
        sx={{
          width: 5,
          height: 5,
          border: `1px solid ${PAPER.ornament}`,
          transform: "rotate(45deg)",
        }}
      />
    )}
    <Box aria-hidden sx={{ flex: 1, height: "1px", bg: PAPER.frame }} />
  </Flex>
);
