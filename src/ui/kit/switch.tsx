import type { ComponentProps } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Switch as ThemeUiSwitch } from "theme-ui";

/* Thumb size; the track is two thumbs wide plus a 2px gutter (theme-ui's default thumb is 18) */
const THUMB = 12;

type SwitchProps = ComponentProps<typeof ThemeUiSwitch> & {
  /** A settings row: label on the left, switch against the right edge. */
  spread?: boolean;
  /** Small pill after the label, such as why the switch is disabled. */
  hint?: string;
};

const SPREAD_LABEL: ThemeUIStyleObject = {
  flexDirection: "row-reverse",
  /* The bar ties the label to its far-off switch. */
  px: 2,
  py: 1,
  borderRadius: 2,
  bg: "shadow.10",
  "& > span": { flex: 1 },
};

const hintPill = (hint: string): ThemeUIStyleObject => ({
  "& > span": { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" },
  "& > span::after": {
    content: JSON.stringify(hint),
    ml: 2,
    px: 1,
    py: "2px",
    borderRadius: 2,
    bg: "shadow.25",
    lineHeight: 1,
    fontSize: "9px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
});

export function Switch({ sx, spread, hint, ...props }: SwitchProps) {
  return (
    /* theme-ui's label stretches its children, so the track sits high next to the text */
    <Box
      sx={{
        "& > label": {
          alignItems: "center",
          ...(spread && SPREAD_LABEL),
          ...(hint && hintPill(hint)),
          /* Fades the text's own colour, which stays readable on any panel. */
          "&:has(input:disabled)": { cursor: "not-allowed", "& > span": { opacity: 0.6 } },
        },
      }}
    >
      <ThemeUiSwitch
        aria-label={hint ? `${props.label} (${hint})` : props.label}
        sx={{
          display: "flex",
          alignItems: "center",
          px: "2px",
          height: THUMB + 4,
          width: THUMB * 2 + 4,
          backgroundColor: "shadow.20",
          ...(spread && { mr: 0, ml: 2 }),
          "& > div": {
            width: THUMB,
            height: THUMB,
          },
          "input:checked ~ &": {
            backgroundColor: "set",
            transition: "background-color .5s ease",
          },
          "& > span": {
            width: "auto",
          },
          ...sx,
        }}
        {...props}
      />
    </Box>
  );
}
