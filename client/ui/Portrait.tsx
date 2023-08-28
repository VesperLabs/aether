import { Box, PlayerRender } from "@aether/ui";
import { memo } from "react";

const Portrait = memo(
  ({
    player,
    size = 54,
    topOffset = 10,
    scale = 1,
    filteredSlots = [],
    sx,
  }: {
    player: FullCharacterState;
    size?: integer;
    topOffset?: integer;
    scale?: number;
    filteredSlots?: string[];
    sx?: any;
  }) => {
    return (
      <Box
        sx={{
          border: `1px solid #000`,
          borderRadius: size,
          width: size + 2,
          height: size + 2,
          ...sx,
        }}
      >
        <Box
          sx={{
            border: `1px solid #FFF`,
            borderRadius: size,
            width: size,
            height: size,
            bg: "shadow.30",
            position: "relative",
            overflow: "hidden",
            clipPath: `circle(${size / 2}px at ${size / 2}px ${size / 2}px)`,
          }}
        >
          <PlayerRender
            player={player}
            filteredSlots={filteredSlots}
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%,-50%) scale(${scale})`,
              mt: topOffset,
            }}
          />
        </Box>
      </Box>
    );
  },
  (prev, next) => {
    return prev?.player?.activeItemSlots === next?.player?.activeItemSlots;
  }
);

export default Portrait;
