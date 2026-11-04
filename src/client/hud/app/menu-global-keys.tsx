import { Box, KeyboardKey } from "@/ui";
import { MINI_MAP_MARGIN, MINI_MAP_OPEN_VAR, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { isMobile } from "@/ui";
import { useAppContext } from "./context";

/* Read from the minimap's own tween, so the frame's edge stays on the map's edge every frame. */
const open = `var(${MINI_MAP_OPEN_VAR}, 0)`;

export const MenuGlobalKeys = () => {
  const { userSettings, socket, zoom } = useAppContext();
  /* From the middle of the circle, whose edge moves in by this much as it closes */
  const closedInset = `calc(${MINI_MAP_SIZE / 2}px * (1 - ${open}))`;
  /* Match the player portrait frame, whose 1px lines are drawn inside the HUD's scale. */
  const line = Number((1.25 * parseFloat(String(zoom))).toFixed(1)) || 1;
  return (
    <>
      <Box
        sx={{
          display: isMobile ? "none" : "block",
          position: "fixed",
          top: `calc(${MINI_MAP_MARGIN - line * 2}px + ${closedInset})`,
          right: `calc(${MINI_MAP_MARGIN - line * 2}px + ${closedInset})`,
          width: `calc(${MINI_MAP_SIZE}px * ${open} + ${line * 4}px)`,
          height: `calc(${MINI_MAP_SIZE}px * ${open} + ${line * 4}px)`,
          borderRadius: "50%",
          border: `${line}px solid #000`,
          boxShadow: `inset 0 0 0 ${line}px #FFF`,
          pointerEvents: "none",
          zIndex: "minimap",
          opacity: open,
        }}
      />
      <Box
        sx={{
          position: "fixed",
          /* Centered on the circle's edge at its bottom-right (45°). */
          top: MINI_MAP_MARGIN + (MINI_MAP_SIZE / 2) * (1 + Math.SQRT1_2),
          right: MINI_MAP_MARGIN + (MINI_MAP_SIZE / 2) * (1 - Math.SQRT1_2),
          zIndex: "minimap",
          opacity: open,
          transform: `scale(${open})`,
        }}
      >
        <KeyboardKey
          name="M"
          /* The key hangs up-left of this point by its bottom-right corner; shift it to sit centered. */
          sx={{ transform: "translate(50%, 50%)" }}
          hidden={isMobile}
          onKeyUp={() =>
            socket.emit("updateUserSetting", {
              name: "showMinimap",
              value: !userSettings.showMinimap,
            })
          }
        />
      </Box>
    </>
  );
};
