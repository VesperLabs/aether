import type { ComponentProps } from "react";
import { Box, Switch as ThemeUiSwitch } from "theme-ui";

/* Thumb size; the track is two thumbs wide plus a 2px gutter (theme-ui's default thumb is 18) */
const THUMB = 12;

export function Switch({ sx, ...props }: ComponentProps<typeof ThemeUiSwitch>) {
  return (
    /* theme-ui's label stretches its children, so the track sits high next to the text */
    <Box sx={{ "& > label": { alignItems: "center" } }}>
      <ThemeUiSwitch
        sx={{
          display: "flex",
          alignItems: "center",
          px: "2px",
          height: THUMB + 4,
          width: THUMB * 2 + 4,
          backgroundColor: "shadow.20",
          "& > div": {
            width: THUMB,
            height: THUMB,
          },
          "input:checked ~ &": {
            backgroundColor: "set",
            transition: ".5s ease all",
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
