import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Box, DIRECTIONS, Flex, loadSheet } from "@/ui";
import type { ActiveDraw, Frame } from "./lab-state";
import { getSheetCell, type HumanLayer, type Sheet } from "./sheets";
import { CHECKER_SX } from "./checker";
import { sortForDirection, withPending } from "./frame-stack";
import type { PendingCandidate } from "./use-pending-candidates";

const drawSheet = (
  canvas: HTMLCanvasElement,
  base: HTMLCanvasElement,
  layers: { layer: HumanLayer; image: HTMLCanvasElement }[],
  baseHidden: boolean,
) => {
  const { width, height } = base;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const rowHeight = height / DIRECTIONS.length;
  DIRECTIONS.forEach((direction, row) => {
    const skin = baseHidden ? [] : [{ layer: "skin", image: base }];
    const stack = sortForDirection(direction, [...skin, ...layers]);
    const y = row * rowHeight;
    stack.forEach(({ image }) => {
      ctx.drawImage(image, 0, y, width, rowHeight, 0, y, width, rowHeight);
    });
  });
};

const SHEET_RADIUS = 6;
const SPINNER_SIZE = 18;
/** Marks unmerged draws, on the sheet and on its layer. */
export const PENDING_COLOR = "#ffc83d";
/** The dot on an unmerged frame, as measured on screen. */
const PENDING_DOT = 8;
const PENDING_INSET = 3;

/** The frame under a point on screen, if any. Measured on screen, so it holds at every zoom. */
export const getFrameAtPoint = (
  canvas: HTMLCanvasElement,
  cell: number,
  x: number,
  y: number,
): Frame | undefined => {
  const rect = canvas.getBoundingClientRect();
  if (x < rect.left || y < rect.top || x >= rect.right || y >= rect.bottom) return undefined;
  const scale = rect.width / canvas.width;
  return {
    column: Math.floor((x - rect.left) / scale / cell),
    row: Math.floor((y - rect.top) / scale / cell),
  };
};

/** The finished sheet and its cell size. */
export type DrawnSheet = { sheet: HTMLCanvasElement; cell: number };

/** The whole sheet with the chosen layers stacked over it; click a frame to select it. */
export const SheetCanvas = ({
  onDrawn,
  base,
  baseHidden,
  layers,
  targetSrc,
  zoom,
  frame,
  pending,
  draws,
  dropFrame,
  onSelectFrame,
}: {
  /** Called after every redraw; must be stable. */
  onDrawn: (drawn: DrawnSheet) => void;
  base: Sheet;
  baseHidden: boolean;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  /** The sheet being edited. Only its open draws get a dot, matching its candidate list. */
  targetSrc?: string;
  zoom: number;
  frame?: Frame;
  /** Open draws to show in place, marked as not merged yet. */
  pending: PendingCandidate[];
  /** The frames Gemini is drawing right now. */
  draws: ActiveDraw[];
  /** Where a dragged candidate would land. */
  dropFrame?: Frame;
  onSelectFrame: (frame?: Frame) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cell, setCell] = useState<number>();
  const visibleDraws = draws.filter(({ src }) =>
    [base, ...layers.map(({ sheet }) => sheet)].some((sheet) => sheet.src === src),
  );
  const dottedPending = pending.filter(({ generation: { src } }) => src === targetSrc);

  useEffect(() => {
    let live = true;
    Promise.all([loadSheet(base), ...layers.map(({ sheet }) => loadSheet(sheet))]).then(
      ([baseImage, ...images]) => {
        if (!live || !baseImage || !canvasRef.current) return;
        const loaded = layers.flatMap(({ layer }, i) => {
          const image = images[i];
          return image ? [{ layer, image: withPending(layers[i].sheet, image, pending) }] : [];
        });
        drawSheet(canvasRef.current, withPending(base, baseImage, pending), loaded, baseHidden);
        const drawnCell = getSheetCell(base.src, baseImage.height);
        setCell(drawnCell);
        onDrawn({ sheet: canvasRef.current, cell: drawnCell });
      },
    );
    return () => {
      live = false;
    };
  }, [base, baseHidden, layers, onDrawn, pending]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!cell) return;
    const canvas = e.currentTarget as unknown as HTMLCanvasElement;
    const clicked = getFrameAtPoint(canvas, cell, e.clientX, e.clientY);
    if (!clicked) return;
    const isSelected = frame?.column === clicked.column && frame.row === clicked.row;
    onSelectFrame(isSelected ? undefined : clicked);
  };

  return (
    <Box sx={{ position: "relative", zoom }}>
      <Box
        as="canvas"
        ref={canvasRef}
        onClick={handleClick}
        sx={{
          display: "block",
          imageRendering: "pixelated",
          cursor: "pointer",
          ...CHECKER_SX,
          /* Divided by the zoom this sits inside, to stay the same on screen. */
          borderRadius: `${SHEET_RADIUS / zoom}px`,
        }}
      />
      {cell &&
        dottedPending.map(
          ({
            generation: {
              id,
              frame: { column, row },
            },
          }) => (
            <Box
              key={id}
              style={{
                left: (column + 1) * cell - (PENDING_DOT + PENDING_INSET) / zoom,
                top: row * cell + PENDING_INSET / zoom,
                width: PENDING_DOT / zoom,
                height: PENDING_DOT / zoom,
              }}
              sx={{
                position: "absolute",
                pointerEvents: "none",
                boxSizing: "border-box",
                borderRadius: "50%",
                bg: PENDING_COLOR,
                boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.7)",
              }}
            />
          ),
        )}
      {cell &&
        visibleDraws.map(({ src, frame: { column, row } }) => (
          <Flex
            key={`${src}:${column},${row}`}
            sx={{
              position: "absolute",
              pointerEvents: "none",
              alignItems: "center",
              justifyContent: "center",
              bg: "rgba(0, 0, 0, 0.55)",
            }}
            style={{
              left: column * cell,
              top: row * cell,
              width: cell,
              height: cell,
            }}
          >
            <svg
              aria-label="Drawing"
              viewBox="0 0 24 24"
              width={SPINNER_SIZE / zoom}
              height={SPINNER_SIZE / zoom}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="white"
                strokeOpacity="0.3"
                strokeWidth="3"
              />
              <path
                d="M12 2 A10 10 0 0 1 22 12"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </Flex>
        ))}
      {dropFrame && cell && (
        <Box
          sx={{
            position: "absolute",
            pointerEvents: "none",
            boxSizing: "border-box",
            border: "1px dashed #ffc83d",
          }}
          style={{
            left: dropFrame.column * cell,
            top: dropFrame.row * cell,
            width: cell,
            height: cell,
          }}
        />
      )}
      {frame && cell && (
        <Box
          sx={{
            position: "absolute",
            pointerEvents: "none",
            boxSizing: "border-box",
            border: "1px solid",
            borderColor: "blue.200",
          }}
          style={{
            left: frame.column * cell,
            top: frame.row * cell,
            width: cell,
            height: cell,
          }}
        />
      )}
    </Box>
  );
};
