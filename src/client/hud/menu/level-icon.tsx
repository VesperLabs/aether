import type { ThemeUIStyleObject } from "theme-ui";
import { Box } from "@/ui";
import type { HudCharacter } from "@/client/hud/app/context";

/** A plate's level badge, over its portrait's corner; its tooltip names the level and class. */
export const LevelIcon = ({
  player,
  sx,
}: {
  player?: Partial<HudCharacter> | null;
  sx?: ThemeUIStyleObject;
}) => {
  return (
    <Box
      data-tooltip-place="bottom"
      data-tooltip-id="hud"
      data-tooltip-content={`Level ${player?.stats?.level} ${player?.charClass} `}
      sx={{
        textTransform: "capitalize",
        borderRadius: 6,
        minWidth: 20,
        textAlign: "center",
        lineHeight: "16px",
        fontSize: 0,
        pointerEvents: "all",
        position: "absolute",
        background: "black",
        border: `1px solid white`,
        boxShadow: `0px 0px 0px 1px black`,
        ...sx,
      }}
    >
      {player?.stats?.level}
    </Box>
  );
};
