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
  showText?: boolean;
};

const Bar = ({
  width = 100,
  height = 12,
  color = "red",
  showText = true,
  min,
  max,
  sx,
  ...props
}: BarProps) => {
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
        {showText && `${min} / ${max}`}
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
      <Box
        data-tooltip-id="hud"
        data-tooltip-content={`Level ${stats?.level} ${hero?.charClass} `}
        sx={{
          textTransform: "capitalize",
          bg: "black",
          position: "absolute",
          borderRadius: 12,
          minWidth: 20,
          textAlign: "center",
          zIndex: 100,
          fontSize: 0,
          top: 42,
          left: 36,
          pointerEvents: "all",
          border: (t) => `1px solid rgba(255,255,255,.85)`,
          boxShadow: `0px 0px 0px 1px #000`,
        }}
      >
        {stats?.level}
      </Box>
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
          <Bar
            data-tooltip-content={`EXP: ${stats?.exp} / ${stats?.maxExp}`}
            color="yellow.50"
            max={stats?.maxExp}
            min={stats?.exp}
            height={6}
            showText={false}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default MenuHud;
