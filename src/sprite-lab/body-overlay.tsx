import type { PointerEvent } from "react";
import type { BodyShape } from "@/content";
import type { FeetPoint, Handle } from "./body-handles";
import type { Hand } from "./weapon-pose";

export const HANDLE_COLORS: Record<"box" | "feet" | "head" | Hand, string> = {
  box: "#ff4d4d",
  feet: "#4da6ff",
  head: "#ffd24d",
  right: "#5dff7a",
  left: "#d97aff",
};

/** How big a grabbable handle is, in screen pixels, whatever the zoom. */
const HANDLE_SCREEN_PX = 8;

/**
 * The body's shape and hand points over its frame, every one a handle to drag. Drawn as SVG in the
 * frame's own pixels from the feet, so it stays sharp at any zoom. `onGrab` hears which handle a
 * press started on; the editor follows the pointer from there.
 */
export const BodyOverlay = ({
  shape,
  hands,
  feet,
  size,
  zoom,
  selected,
  onGrab,
}: {
  shape: BodyShape;
  /** The hand points on this frame, from the feet; a hand the body doesn't have is left out. */
  hands: Partial<Record<Hand, FeetPoint>>;
  /** Where the feet are on the frame. */
  feet: FeetPoint;
  size: number;
  zoom: number;
  selected: Handle | undefined;
  onGrab: (handle: Handle, e: PointerEvent<SVGElement>) => void;
}) => {
  const { width, height } = shape.hitBox;
  const left = feet.x - width / 2;
  const top = feet.y + shape.feetRadius - height;
  const headY = feet.y + shape.headY;
  /* Sizes in frame pixels that come out the same on screen at any zoom */
  const grip = HANDLE_SCREEN_PX / zoom;
  const reach = grip * 1.5;
  const lineWidth = (handle: Handle) => (handle === selected ? 2 : 1);
  const grab = (handle: Handle) => ({
    onPointerDown: (e: PointerEvent<SVGElement>) => onGrab(handle, e),
  });
  /* An invisible fat line along an edge, so it's easy to catch */
  const edge = (handle: Handle, x1: number, y1: number, x2: number, y2: number, cursor: string) => (
    <line
      {...{ x1, y1, x2, y2 }}
      stroke="transparent"
      strokeWidth={reach}
      style={{ cursor, pointerEvents: "stroke" }}
      {...grab(handle)}
    />
  );
  const knob = (handle: Handle, x: number, y: number, color: string, cursor: string) => (
    <rect
      x={x - grip / 2}
      y={y - grip / 2}
      width={grip}
      height={grip}
      fill={handle === selected ? color : "#000"}
      stroke={color}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      style={{ cursor, pointerEvents: "all" }}
      {...grab(handle)}
    />
  );
  const lines = { fill: "none", vectorEffect: "non-scaling-stroke" as const };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Body handles"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        stroke={HANDLE_COLORS.box}
        strokeWidth={Math.max(lineWidth("top"), lineWidth("side"))}
        shapeRendering="crispEdges"
        {...lines}
      />
      <circle
        cx={feet.x}
        cy={feet.y}
        r={shape.feetRadius}
        stroke={HANDLE_COLORS.feet}
        strokeWidth={lineWidth("feet")}
        {...lines}
      />
      <line
        x1={left - 4}
        x2={left + width + 4}
        y1={headY}
        y2={headY}
        stroke={HANDLE_COLORS.head}
        strokeWidth={lineWidth("head")}
        strokeDasharray="3 2"
        shapeRendering="crispEdges"
        {...lines}
      />
      {edge("top", left, top, left + width, top, "ns-resize")}
      {edge("side", left, top, left, top + height, "ew-resize")}
      {edge("side", left + width, top, left + width, top + height, "ew-resize")}
      {edge("head", left - 4, headY, left + width + 4, headY, "ns-resize")}
      {knob("top", feet.x, top, HANDLE_COLORS.box, "ns-resize")}
      {knob("side", left + width, top + height / 2, HANDLE_COLORS.box, "ew-resize")}
      {knob("head", left + width + 4, headY, HANDLE_COLORS.head, "ns-resize")}
      {knob("feet", feet.x + shape.feetRadius, feet.y, HANDLE_COLORS.feet, "ew-resize")}
      {(Object.keys(hands) as Hand[]).map((hand) => {
        const point = hands[hand];
        if (!point) return null;
        const x = feet.x + point.x + 0.5;
        const y = feet.y + point.y + 0.5;
        return (
          <circle
            key={hand}
            cx={x}
            cy={y}
            r={grip * 0.6}
            fill={hand === selected ? HANDLE_COLORS[hand] : "rgba(0, 0, 0, 0.4)"}
            stroke={HANDLE_COLORS[hand]}
            strokeWidth={lineWidth(hand)}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: "move", pointerEvents: "all" }}
            {...grab(hand)}
          />
        );
      })}
    </svg>
  );
};
