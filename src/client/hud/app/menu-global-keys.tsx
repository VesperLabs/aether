import { Box, KeyboardKey } from "@/ui";
import { MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { isMobile } from "@/ui";
import { useAppContext } from "./context";

export const MenuGlobalKeys = () => {
  const { userSettings, socket } = useAppContext();
  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: MINI_MAP_SIZE + 6,
          right: MINI_MAP_SIZE - 12,
          zIndex: "minimap",
        }}
      >
        <KeyboardKey
          name="M"
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
