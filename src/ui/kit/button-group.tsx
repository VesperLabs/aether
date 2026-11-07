import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Box, Button as ThemeButton, Flex, type ThemeUIStyleObject } from "theme-ui";
import { CONTROL_GOLD } from "./modal-gilding";

interface ButtonGroupOption<Value> {
  value: Value;
  label: ReactNode;
  /** Spoken and shown on hover, for options whose label is only an icon or swatch. */
  title?: string;
}

interface ThumbBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A wooden plate under the chosen option, matching the wood buttons, filling its segment to the
 * track's edges. It slides in steps, not smoothly, to keep the pixel feel.
 */
const THUMB_SX: ThemeUIStyleObject = {
  position: "absolute",
  top: 0,
  left: 0,
  borderRadius: 3,
  pointerEvents: "none",
  /* The wood buttons' plank and light inner edge. Their black outer border is left off: the
     plate sits against the track's own dark edge, which already draws that line. */
  bg: "yellow.900",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, .25)",
  transition: "transform 120ms steps(4), width 120ms steps(4), height 120ms steps(4)",
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
};

/**
 * One choice from a few, as joined segments in the field look. A gold plate slides under the
 * chosen one.
 */
export const ButtonGroup = <Value extends string | number>({
  label,
  value,
  options,
  onChange,
  sx,
}: {
  /** What the group picks, for screen readers. */
  label: string;
  value: Value;
  options: readonly ButtonGroupOption<Value>[];
  onChange: (value: Value) => void;
  sx?: ThemeUIStyleObject;
}) => {
  const buttons = useRef(new Map<Value, HTMLButtonElement>());
  const [thumb, setThumb] = useState<ThumbBox>();

  useLayoutEffect(() => {
    const measure = () => {
      const chosen = buttons.current.get(value);
      setThumb(
        chosen && {
          left: chosen.offsetLeft,
          top: chosen.offsetTop,
          width: chosen.offsetWidth,
          height: chosen.offsetHeight,
        },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // Labels and wrapping change sizes after fonts load or the panel resizes.
    const observer = new ResizeObserver(measure);
    buttons.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <Flex
      role="radiogroup"
      aria-label={label}
      variant="forms.input"
      sx={{
        position: "relative",
        p: 0,
        gap: 0,
        borderRadius: 4,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
        width: "auto",
        flexWrap: "wrap",
        ...sx,
      }}
    >
      {thumb && (
        <Box
          sx={THUMB_SX}
          style={{
            width: thumb.width,
            height: thumb.height,
            transform: `translate(${thumb.left}px, ${thumb.top}px)`,
          }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <ThemeButton
            key={String(option.value)}
            ref={(element) => {
              if (element) buttons.current.set(option.value, element);
              else buttons.current.delete(option.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            sx={{
              position: "relative",
              flex: "1 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              px: 2,
              py: 1,
              /* The wood buttons' padding, inside the track's 1px edge as theirs sits inside their
                 border, so both come out the same size. */
              font: "inherit",
              whiteSpace: "nowrap",
              cursor: "pointer",
              borderRadius: 3,
              bg: "transparent",
              color: "text",
              "&:hover": { bg: selected ? "transparent" : "shadow.25" },
              "&:focus-visible": { outline: `1px solid ${CONTROL_GOLD}` },
            }}
          >
            {option.label}
          </ThemeButton>
        );
      })}
    </Flex>
  );
};
