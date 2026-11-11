import { useEffect, useState } from "react";
import { mapTitle } from "@/content";
import { Box, isMobile } from "@/ui";
import { MINI_MAP_MARGIN, MINI_MAP_OPEN_VAR, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { ROOM_CHANGED_EVENT, currentRoomName } from "@/client/scenes/room-changed";
import { useAppContext } from "./context";
import { GLASS_PILL } from "./glass-disc";

/* Grows and fades with the minimap, like its frame. */
const open = `var(${MINI_MAP_OPEN_VAR}, 0)`;
/** Space between the minimap's ring and the plaque. */
const RING_GAP = 6;

const useRoomName = () => {
  const [roomName, setRoomName] = useState(currentRoomName);
  useEffect(() => {
    const onChange = (event: Event) => setRoomName((event as CustomEvent<string>).detail);
    window.addEventListener(ROOM_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(ROOM_CHANGED_EVENT, onChange);
  }, []);
  return roomName;
};

/** A small nameplate on the bottom edge of the minimap, naming the map you're on. */
export const MapPlaque = () => {
  const { userSettings } = useAppContext();
  const roomName = useRoomName();
  if (isMobile || !userSettings?.showMinimap || !roomName) return null;
  return (
    <Box
      sx={{
        position: "fixed",
        /* Centered just under the circle, clear of its ring */
        top: MINI_MAP_MARGIN + MINI_MAP_SIZE + RING_GAP,
        right: MINI_MAP_MARGIN + MINI_MAP_SIZE / 2,
        transform: `translateX(50%) scale(${open})`,
        transformOrigin: "top center",
        opacity: open,
        zIndex: "minimap",
        /* A fixed height with the text centered in it: the pixel font's own line box sits off-center */
        display: "flex",
        alignItems: "center",
        height: "16px",
        px: "8px",
        pt: "1px",
        /* The same dark glass as the buttons beside the minimap */
        ...GLASS_PILL,
        p: undefined,
        pointerEvents: "none",
        color: "white",
        fontSize: "10px",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {mapTitle(roomName)}
    </Box>
  );
};
