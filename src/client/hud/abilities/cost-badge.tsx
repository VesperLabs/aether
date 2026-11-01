import { useLayoutEffect, useRef, useState } from "react";
import { Box, Text } from "@/ui";

export interface ResourceCosts {
  hp?: number;
  mp?: number;
  sp?: number;
}

/** Each cost is coloured like its bar in the hero HUD. */
const COST_COLORS = [
  ["hp", "red.500"],
  ["mp", "blue.400"],
  ["sp", "yellow.400"],
] as const;

/** Where the pills sit on the button's rim: centred on its top-right, in degrees up from the right. */
const RIM_CENTER_DEGREES = 45;
/** Pixels of rim between neighbouring pills' centres: a pill's height plus a small gap. */
const PILL_SPACING = 16;
const PILL_HEIGHT = 14;
/** A pill is this wide for one digit and grows by `DIGIT_WIDTH` for each more. */
const PILL_MIN_WIDTH = 14;
const DIGIT_WIDTH = 6;
/** How far the glass may reach past the button's box, so pills on the rim fit inside it. */
const GLASS_PAD = 12;

/** The costs worth showing, in rim order (lowest first). */
function getShownCosts(costs: ResourceCosts) {
  return COST_COLORS.filter(([key]) => (costs[key] ?? 0) > 0);
}

export function hasCosts(costs: ResourceCosts | undefined) {
  return !!costs && getShownCosts(costs).length > 0;
}

interface Pill {
  key: string;
  color: string;
  amount: number;
  /** Centre, in the glass's frame. */
  x: number;
  y: number;
  width: number;
  /** Clockwise tilt so it lies along the rim, in degrees. */
  turn: number;
}

interface Layout {
  width: number;
  height: number;
  /** The glass outline: the button's circle and every pill as one shape, as an SVG mask. */
  mask: string;
  pills: Pill[];
}

function layOut(costs: ResourceCosts, buttonWidth: number, buttonHeight: number): Layout {
  const shown = getShownCosts(costs);
  const width = buttonWidth + GLASS_PAD * 2;
  const height = buttonHeight + GLASS_PAD * 2;
  const cx = GLASS_PAD + buttonWidth / 2;
  const cy = GLASS_PAD + buttonHeight / 2;
  const r = Math.min(buttonWidth, buttonHeight) / 2;
  /* Spread evenly by arc length; the first pill is the lowest, the last nearest the top */
  const step = PILL_SPACING / r;
  const pills = shown.map(([key, color], index) => {
    const amount = costs[key] ?? 0;
    const angle = (RIM_CENTER_DEGREES * Math.PI) / 180 + (index - (shown.length - 1) / 2) * step;
    return {
      key,
      color,
      amount,
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
      width: PILL_MIN_WIDTH + (String(amount).length - 1) * DIGIT_WIDTH,
      /* Tangent to the rim: flat at the top, tilted 45° at the top-right */
      turn: 90 - (angle * 180) / Math.PI,
    };
  });
  const shapes = [
    `<circle cx="${cx}" cy="${cy}" r="${r}"/>`,
    ...pills.map(
      (p) =>
        `<rect x="${p.x - p.width / 2}" y="${p.y - PILL_HEIGHT / 2}" width="${p.width}" height="${PILL_HEIGHT}" rx="${PILL_HEIGHT / 2}" transform="rotate(${p.turn} ${p.x} ${p.y})"/>`,
    ),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join("")}</svg>`;
  return { width, height, mask: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, pills };
}

/**
 * The glass of a skill button with costs: the round button and a pill per cost on its top-right
 * rim, drawn as one shape so they read as fused. The button turns its own background off when it
 * has costs (see `SkillButton`). Sized from the real button (layout sizes, so the HUD's zoom
 * transform doesn't throw it off).
 */
export const CostBadge = ({ costs }: { costs: ResourceCosts }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const button = ref.current?.parentElement;
    if (!button) return;
    const measure = () => setSize({ width: button.clientWidth, height: button.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);
  const layout = size && hasCosts(costs) ? layOut(costs, size.width, size.height) : null;

  return (
    <Box
      ref={ref}
      sx={{
        position: "absolute",
        left: -GLASS_PAD,
        top: -GLASS_PAD,
        width: layout?.width ?? 0,
        height: layout?.height ?? 0,
        zIndex: -2,
        pointerEvents: "none",
      }}
    >
      {layout && (
        <>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              /* Same glass as a plain skill button */
              backgroundColor: "shadow.30",
              backdropFilter: "blur(2px)",
              maskImage: layout.mask,
              maskSize: "100% 100%",
            }}
          />
          {layout.pills.map((p) => (
            <Text
              key={p.key}
              sx={{
                position: "absolute",
                left: p.x,
                top: p.y,
                transform: "translate(-50%, -50%)",
                fontSize: 0,
                lineHeight: 1,
                color: p.color,
                textShadow: "0 0 2px #000, 0 0 2px #000",
              }}
            >
              {p.amount}
            </Text>
          ))}
        </>
      )}
    </Box>
  );
};
