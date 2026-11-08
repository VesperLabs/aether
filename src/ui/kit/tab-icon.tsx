import { Box } from "theme-ui";
import { Icon } from "./icon";

const ICON_SIZE = 22;

const ICON_MOTION = ".2s ease all";

/* The book opens up on the active tab, and the feather pops onto it. */
export const TabIcon = ({ active }: { active: boolean }) => (
  <Box
    sx={{
      position: "relative",
      width: active ? ICON_SIZE : 0,
      height: ICON_SIZE,
      transition: ICON_MOTION,
    }}
  >
    <Icon
      size={ICON_SIZE}
      icon={`./assets/icons/book.png`}
      sx={{ transform: active ? "scale(1)" : "scale(0)", transition: ICON_MOTION }}
    />
    <Icon
      size={ICON_SIZE}
      icon={`./assets/icons/pen.png`}
      sx={{
        position: "absolute",
        top: "-13.5px",
        left: "-12px",
        transform: active ? "scale(1)" : "scale(0)",
        transition: ICON_MOTION,
      }}
    />
  </Box>
);
