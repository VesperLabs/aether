import { useState } from "react";
import { Box } from "@/ui";

/** A rise (regen, heals) glides over about one SP regen tick, so ticks blend into a steady fill. */
const RISE_TRANSITION = "width .6s linear";
const DROP_TRANSITION = "width .12s ease-out";
/** After a drop the ghost waits a beat, then drains to the new value. */
const GHOST_DRAIN_TRANSITION = "width .3s ease-in .25s";

type BarProps = {
  width?: number;
  height?: number;
  color?: string;
  min: number;
  max: number;
  sx?: object;
  showText?: boolean;
};

export const Bar = ({
  width = 100,
  height = 12,
  color = "red",
  showText = true,
  min,
  max,
  sx,
  ...props
}: BarProps) => {
  const value = Math.round((min / max) * 100);
  const percent = value + "%";
  /* The ghost drains after a beat when the value drops, and rises together with the bar */
  const [lastValue, setLastValue] = useState(value);
  const [isDraining, setIsDraining] = useState(false);
  if (value !== lastValue) {
    setIsDraining(value < lastValue);
    setLastValue(value);
  }
  return (
    <Box
      data-tooltip-id="hud"
      data-tooltip-place="bottom"
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
          zIndex: 1,
          lineHeight: 1,
          fontSize: 0,
          textAlign: "center",
        }}
      >
        {showText && `${min} / ${max}`}
      </Box>
      <Box
        sx={{
          position: "absolute",
          bg: "rgba(255,240,180,.75)",
          height: "100%",
          width: percent,
          transition: isDraining ? GHOST_DRAIN_TRANSITION : RISE_TRANSITION,
        }}
      />
      <Box
        sx={{
          position: "relative",
          bg: color,
          height: "100%",
          width: percent,
          transition: isDraining ? DROP_TRANSITION : RISE_TRANSITION,
        }}
      />
    </Box>
  );
};
