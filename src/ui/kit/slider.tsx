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

/** A range filled up to its value: 0 to 1 unless given a `min` and `max`. */
export const Slider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = (max - min) / 100,
  disabled = false,
  tabIndex,
  color = "white",
  thumbSize = 10,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** The smallest move; a hundredth of the range unless set. */
  step?: number;
  disabled?: boolean;
  tabIndex?: number;
  color?: string;
  thumbSize?: number;
}) => {
  const percent = ((value - min) / (max - min)) * 100;
  const thumb = thumbStyle(thumbSize);
  return (
    <Box
      as="input"
      {...{
        type: "range",
        min,
        max,
        step,
        value,
        disabled,
        tabIndex,
        title: label,
        "aria-label": label,
        /* The handle is a pseudo-element, so its size is read from here (a controller's
           highlight rings it) */
        "data-thumb-size": thumbSize,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value)),
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
