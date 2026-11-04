import type { ChangeEvent, PointerEvent } from "react";
import type { ThemeUICSSObject } from "theme-ui";
import { Box } from "theme-ui";

const thumbStyle = (size: number): ThemeUICSSObject => ({
  appearance: "none",
  boxSizing: "border-box",
  width: size,
  height: size,
  border: "1px solid rgba(0, 0, 0, 0.7)",
  borderRadius: "50%",
  bg: "white",
});

/** A range from 0 to 1, filled up to its value. */
export const Slider = ({
  label,
  value,
  onChange,
  disabled = false,
  tabIndex,
  color = "white",
  thumbSize = 10,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  tabIndex?: number;
  color?: string;
  thumbSize?: number;
}) => {
  const percent = value * 100;
  const thumb = thumbStyle(thumbSize);
  return (
    <Box
      as="input"
      {...{
        type: "range",
        min: 0,
        max: 100,
        value: Math.round(percent),
        disabled,
        tabIndex,
        title: label,
        "aria-label": label,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value) / 100),
        /* Never keep focus, or the slider eats the game's movement keys */
        onPointerUp: (e: PointerEvent<HTMLInputElement>) => {
          e.currentTarget.blur();
        },
      }}
      sx={{
        appearance: "none",
        flex: 1,
        minWidth: 0,
        height: 3,
        m: 0,
        borderRadius: 999,
        outline: "none",
        cursor: disabled ? "default" : "pointer",
        background: `linear-gradient(to right, ${color} ${percent}%, rgba(255, 255, 255, 0.25) ${percent}%)`,
        "&::-webkit-slider-thumb": thumb,
        "&::-moz-range-thumb": thumb,
      }}
    />
  );
};
