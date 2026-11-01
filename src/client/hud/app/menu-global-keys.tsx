import { Box, KeyboardKey } from "@/ui";
import { MINI_MAP_MARGIN, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { isMobile } from "@/ui";
import { useAppContext } from "./context";

export const MenuGlobalKeys = () => {
  const { userSettings, socket, zoom } = useAppContext();
  /* Match the player portrait frame, whose 1px lines are drawn inside the HUD's scale. */
  const line = Number((1.25 * parseFloat(String(zoom))).toFixed(1)) || 1;
  return (
    <>
      <Box
        sx={{
          display: !userSettings?.showMinimap || isMobile ? "none" : "block",
          position: "fixed",
          top: MINI_MAP_MARGIN - line * 2,
          right: MINI_MAP_MARGIN - line * 2,
          width: MINI_MAP_SIZE + line * 4,
          height: MINI_MAP_SIZE + line * 4,
          borderRadius: "50%",
          border: `${line}px solid #000`,
          boxShadow: `inset 0 0 0 ${line}px #FFF`,
          pointerEvents: "none",
          zIndex: "minimap",
        }}
      />
      <Box
        sx={{
          position: "fixed",
          /* Centered on the circle's edge at its bottom-right (45°). */
          top: MINI_MAP_MARGIN + (MINI_MAP_SIZE / 2) * (1 + Math.SQRT1_2),
          right: MINI_MAP_MARGIN + (MINI_MAP_SIZE / 2) * (1 - Math.SQRT1_2),
          zIndex: "minimap",
        }}
      >
        <KeyboardKey
          name="M"
          /* The key hangs up-left of this point by its bottom-right corner; shift it to sit centered. */
          sx={{ transform: "translate(50%, 50%)" }}
          hidden={!userSettings?.showMinimap || isMobile}
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
