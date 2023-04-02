import React from "react";
import { Box, useAppContext, Flex, TOOLTIP_STYLE, Portrait } from "./";
import { Tooltip } from "react-tooltip";

const UserName = ({ sx }: { sx?: object }) => {
  const { hero } = useAppContext();
  return <Box sx={{ ...sx }}>{hero?.profile?.userName}</Box>;
};

type BarProps = {
  width?: number;
  height?: number;
  color?: string;
  min: number;
  max: number;
  sx?: object;
};

const Bar = ({ width = 100, height = 12, color = "red", min, max, sx, ...props }: BarProps) => {
  const percent = Math.round((min / max) * 100) + "%";
  return (
    <Box
      data-tooltip-id="hud"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        bg: "shadow.25",
        border: (t) => `1px solid rgba(255,255,255,.85)`,
        boxShadow: `0px 0px 0px 1px #000`,
        width,
        height,

        ...sx,
      }}
      {...props}
    >
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          lineHeight: 1,
          fontSize: 0,
          textAlign: "center",
        }}
      >
        {`${min} / ${max}`}
      </Box>
      <Box sx={{ bg: color, height: "100%", width: percent }} />
    </Box>
  );
};

const MenuHud = () => {
  const { hero } = useAppContext();
  const { stats } = hero ?? {};
  return (
    <Box sx={{ top: 2, left: 2, position: "absolute" }}>
      <Tooltip id="hud" style={TOOLTIP_STYLE} />
      <Flex sx={{ gap: 1 }}>
        <Portrait user={hero} filterKeys={["boots", "pants"]} />
        <Flex sx={{ flexDirection: "column", gap: "1px", pointerEvents: "all" }}>
          <UserName />
          <Bar
            data-tooltip-content={`HP: ${stats?.hp} / ${stats?.maxHp}`}
            color="red.700"
            max={stats?.maxHp}
            min={stats?.hp}
          />
          <Bar
            data-tooltip-content={`MP: ${stats?.mp} / ${stats?.maxMp}`}
            color="blue.500"
            max={stats?.maxMp}
            min={stats?.mp}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default MenuHud;
