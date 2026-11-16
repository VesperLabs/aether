import { useEffect, useRef } from "react";
import { Box, DIRECTIONS, Field } from "@/ui";
import { CHECKER_SX } from "./checker";
import type { Frame } from "./lab-state";

/** One frame of the sheet, drawn small. */
const FrameThumb = ({
  sheet,
  frame,
  cell,
}: {
  sheet: HTMLCanvasElement;
  frame: Frame;
  cell: number;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cell, cell);
    ctx.drawImage(sheet, frame.column * cell, frame.row * cell, cell, cell, 0, 0, cell, cell);
  }, [sheet, frame.column, frame.row, cell]);
  return (
    <Box
      as="canvas"
      ref={ref}
      aria-hidden
      {...{ width: cell, height: cell }}
      sx={{ display: "block", width: "100%", imageRendering: "pixelated" }}
    />
  );
};

/**
 * Every frame of the sheet in its grid, to pick the one a draw starts from. The frame being drawn
 * is outlined dashed; the picked one solid.
 */
export const ReferenceFramePicker = ({
  sheet,
  cell,
  frame,
  value,
  onChange,
}: {
  sheet: HTMLCanvasElement;
  cell: number;
  /** The frame being drawn. */
  frame: Frame;
  value: Frame;
  onChange: (frame: Frame) => void;
}) => {
  const columns = Math.floor(sheet.width / cell);
  const isAt = (a: Frame, column: number, row: number) => a.column === column && a.row === row;
  return (
    <Field label="Draw from">
      <Box
        sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "2px" }}
        role="radiogroup"
        aria-label="Draw from"
      >
        {DIRECTIONS.flatMap((direction, row) =>
          Array.from({ length: columns }, (_, column) => (
            <Box
              key={`${column},${row}`}
              as="button"
              role="radio"
              aria-checked={isAt(value, column, row)}
              aria-label={`${direction} frame ${column + 1}`}
              onClick={() => onChange({ column, row })}
              sx={{
                ...CHECKER_SX,
                p: 0,
                border: "1px solid transparent",
                borderRadius: 2,
                cursor: "pointer",
                ...(isAt(frame, column, row) && { borderStyle: "dashed", borderColor: "text" }),
                ...(isAt(value, column, row) && { borderColor: "primary", borderStyle: "solid" }),
              }}
            >
              <FrameThumb sheet={sheet} frame={{ column, row }} cell={cell} />
            </Box>
          )),
        )}
      </Box>
    </Field>
  );
};
