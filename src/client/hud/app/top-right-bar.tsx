import { Flex, isMobile } from "@/ui";
import { MINI_MAP_MARGIN, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { useAppContext } from "@/client/hud/app/context";
import { MusicPlayer } from "@/client/hud/music/music-player";
import { NetStatsButton } from "@/client/hud/net-stats/net-stats-button";

/** Gap between the bar and the minimap's left edge. */
const MINIMAP_GAP = 6;

/** The row of glass buttons beside the minimap's top left: net stats, then music. */
export const TopRightBar = () => {
  const { userSettings, zoom } = useAppContext();
  const scale = isMobile ? 1 : Number(zoom) || 1;
  const right =
    MINI_MAP_MARGIN + (!isMobile && userSettings?.showMinimap ? MINI_MAP_SIZE + MINIMAP_GAP : 0);
  return (
    <Flex
      sx={{
        position: "fixed",
        top: MINI_MAP_MARGIN,
        right,
        transform: `scale(${scale})`,
        transformOrigin: "top right",
        /* Under the menus, which open over it */
        zIndex: "minimap",
        flexDirection: "row-reverse",
        alignItems: "flex-start",
        gap: "4px",
        pointerEvents: "none",
      }}
    >
      <NetStatsButton />
      <MusicPlayer />
    </Flex>
  );
};
