import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Box, Text } from "@/ui";
import { CHECKER_SX } from "./checker";
import { FloatingPanel } from "./floating-panel";
import { IconButton } from "./icon-button";

/** Room for the big panel's title bar and padding, so the whole frame fits on screen. */
const PANEL_CHROME = 100;
const SCREEN_MARGIN = 32;
const MAX_PANEL_WIDTH = 900;

const FRAME_SX = {
  position: "relative",
  width: "100%",
  aspectRatio: "1",
  ...CHECKER_SX,
  borderRadius: 2,
  overflow: "hidden",
} as const;

const CANVAS_SX = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  imageRendering: "pixelated",
} as const;

const getBigPanelWidth = () =>
  Math.min(MAX_PANEL_WIDTH, window.innerWidth - SCREEN_MARGIN, window.innerHeight - PANEL_CHROME);

/** Stays in the panel while the frame is in the big window. Repaints constantly, as edits there change the draw in place without rendering. */
const FrameMirror = ({
  cell,
  paint,
}: {
  cell: number;
  paint: (ctx: CanvasRenderingContext2D) => void;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const latestPaint = useRef(paint);

  useEffect(() => {
    latestPaint.current = paint;
  });

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let request = 0;
    const repaint = () => {
      ctx.clearRect(0, 0, cell, cell);
      latestPaint.current(ctx);
      request = requestAnimationFrame(repaint);
    };
    repaint();
    return () => cancelAnimationFrame(request);
  }, [cell]);

  return (
    <Box sx={{ ...FRAME_SX, flexShrink: 0 }}>
      <Box as="canvas" ref={ref} aria-hidden {...{ width: cell, height: cell }} sx={CANVAS_SX} />
    </Box>
  );
};

/** One frame, as wide as the panel, with a button to also open it in a big window of its own. */
export const FramePreview = ({
  cell,
  paint,
  label,
  children,
}: {
  cell: number;
  paint: (ctx: CanvasRenderingContext2D) => void;
  label: string;
  /** Laid over the frame, such as the drawing tools; told whether it's in the big window. */
  children?: (expanded: boolean) => ReactNode;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  /* The frame lives here and this moves between spots, so the tools keep their undo history. */
  const [frameHome] = useState(() => document.createElement("div"));
  const placeFrame = useCallback(
    (slot: HTMLElement | null) => {
      slot?.appendChild(frameHome);
    },
    [frameHome],
  );

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cell, cell);
    paint(ctx);
  });

  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  const width = getBigPanelWidth();

  return (
    <>
      {expanded ? (
        <>
          <FrameMirror cell={cell} paint={paint} />
          <FloatingPanel
            id="frame-preview"
            title={<Text sx={{ fontWeight: "bold" }}>{label}</Text>}
            width={width}
            start={{
              x: Math.max(0, (window.innerWidth - width) / 2),
              y: Math.max(0, (window.innerHeight - width - PANEL_CHROME) / 2),
            }}
            onClose={() => setExpanded(false)}
            behind
          >
            <Box ref={placeFrame} />
          </FloatingPanel>
        </>
      ) : (
        <Box ref={placeFrame} sx={{ flexShrink: 0 }} />
      )}
      {createPortal(
        <Box sx={FRAME_SX}>
          <Box
            as="canvas"
            ref={ref}
            aria-label={label}
            {...{ width: cell, height: cell }}
            sx={CANVAS_SX}
          />
          {children?.(expanded)}
          {!expanded && (
            <Box sx={{ position: "absolute", top: 1, right: 1 }}>
              <IconButton label="Open big" icon="⛶" onClick={() => setExpanded(true)} />
            </Box>
          )}
        </Box>,
        frameHome,
      )}
    </>
  );
};
