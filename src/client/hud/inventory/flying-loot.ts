import { useEffect } from "react";
import { ELEMENT_SWING_COLORS, theme } from "@/ui";
import type { LootFlyDetail } from "@/client/window-events";

/** The element picked-up loot flies into. */
export const LOOT_TARGET_ID = "loot-target";

const POP_MS = 90;
const FLIGHT_MS = 430;
const ARC_STEPS = 14;
const TRAIL = [0.45, 0.25, 0.12];
const PLAIN_RARITIES = ["common", undefined];

type Point = { x: number; y: number };
const colors = theme.colors as unknown as Record<string, string>;

function center(r: { x: number; y: number; width: number; height: number }): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

function bezier(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/** Pop, then an eased-in toss over an arc that shrinks into the target. */
interface FlightPath {
  a: Point;
  b: Point;
  control: Point;
  spin: number;
  endScale: number;
}

/** One random arc per pickup, shared by the item and its trail so they never diverge. */
function flightPath(from: LootFlyDetail["rect"], to: DOMRect): FlightPath {
  const a = center(from);
  const b = center(to);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return {
    a,
    b,
    control: {
      x: (a.x + b.x) / 2 + (Math.random() - 0.5) * 120,
      y: Math.min(a.y, b.y) - Math.max(80, dist * 0.35),
    },
    spin: (Math.random() - 0.5) * 40,
    endScale: Math.min(1, (to.width * 0.7) / Math.max(from.width, 1)),
  };
}

/**
 * Pop, then an eased-in toss over the arc. A trail ghost uses the same timeline but sits `lag`
 * behind along the arc, hidden during the pop, so it hugs the item and lands with it.
 */
function flightKeyframes(path: FlightPath, lag = 0, alpha = 1) {
  const { a, b, control, spin, endScale } = path;
  const popOffset = POP_MS / (POP_MS + FLIGHT_MS);
  const shown = lag ? 0 : alpha;

  const frames: Keyframe[] = [
    {
      offset: 0,
      transform: "translate(0px, 0px) scale(1)",
      opacity: shown,
    },
    {
      offset: popOffset * 0.6,
      transform: "translate(0px, 0px) scale(1.35, 1.15)",
      opacity: shown,
    },
    {
      offset: popOffset,
      transform: "translate(0px, -4px) scale(1.2, 1.3)",
      opacity: shown,
    },
  ];
  for (let i = 1; i <= ARC_STEPS; i++) {
    const t = i / ARC_STEPS;
    // Ghosts close the gap over the last stretch so the whole trail lands together.
    const tt = Math.max(0, t - lag * (1 - t * t));
    const p = bezier(a, control, b, tt * tt);
    const scale = 1.25 + (endScale - 1.25) * tt;
    frames.push({
      offset: popOffset + (1 - popOffset) * t,
      transform: `translate(${p.x - a.x}px, ${p.y - a.y}px) rotate(${spin * tt}deg) scale(${scale})`,
      opacity: lag && i === ARC_STEPS ? 0 : alpha,
    });
  }
  return frames;
}

/** The outline's alpha, as hex: see-through like the glowing outline in the world. */
const OUTLINE_ALPHA = "70";

/** A 1-art-pixel outline in the weapon's element colors, as it has in the world. */
function elementOutline({ elements = [], pixelSize = 1 }: LootFlyDetail) {
  const colors = elements.map((element) => ELEMENT_SWING_COLORS[element]).filter(Boolean);
  if (colors.length === 0) return "none";
  const css = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
  const offsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  return offsets
    .map(([x, y], side) => {
      const color = css(colors[side % colors.length]);
      return `drop-shadow(${x * pixelSize}px ${y * pixelSize}px 0 ${color}${OUTLINE_ALPHA})`;
    })
    .join(" ");
}

function spawnImage(detail: LootFlyDetail, opacity: number) {
  const img = document.createElement("img");
  img.src = detail.src;
  Object.assign(img.style, {
    position: "fixed",
    left: `${detail.rect.x}px`,
    top: `${detail.rect.y}px`,
    width: `${detail.rect.width}px`,
    height: `${detail.rect.height}px`,
    imageRendering: "pixelated",
    pointerEvents: "none",
    zIndex: String(theme.zIndices.draggable),
    opacity: String(opacity),
    filter: elementOutline(detail),
    willChange: "transform",
  });
  document.body.appendChild(img);
  return img;
}

/** One soft bubble in the rarity colour: a filled glow reads as a colour better than a thin outline. */
function spawnBubble(r: DOMRect, color: string) {
  const bubble = document.createElement("div");
  Object.assign(bubble.style, {
    position: "fixed",
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: "50%",
    border: `1px solid ${color}`,
    background: `radial-gradient(circle, ${color}aa 0%, ${color}55 45%, ${color}00 72%)`,
    pointerEvents: "none",
    zIndex: String(theme.zIndices.draggable),
  });
  document.body.appendChild(bubble);
  bubble
    .animate(
      [
        { transform: "scale(0.7)", opacity: 0.9 },
        { transform: "scale(1.35)", opacity: 0 },
      ],
      { duration: 380, easing: "ease-out" },
    )
    .finished.finally(() => bubble.remove());
}

/** The bag bounces once and a single bubble in the item's rarity colour shows what you got. */
function landOn(target: HTMLElement, color: string) {
  target.animate(
    [
      { transform: "scale(1)", filter: "none" },
      { transform: "scale(1.15)", filter: `drop-shadow(0 0 6px ${color})` },
      { transform: "scale(1)", filter: "none" },
    ],
    { duration: 280, easing: "ease-out" },
  );
  spawnBubble(target.getBoundingClientRect(), color);
}

function flyLoot(detail: LootFlyDetail) {
  const target = document.getElementById(LOOT_TARGET_ID);
  const to =
    target?.getBoundingClientRect() ??
    new DOMRect(window.innerWidth - 60, window.innerHeight - 60, 40, 40);
  const color = (detail.rarity && colors[detail.rarity]) || colors.white;
  const fancy = !PLAIN_RARITIES.includes(detail.rarity);
  const path = flightPath(detail.rect, to);
  const timing = { duration: POP_MS + FLIGHT_MS, easing: "linear", fill: "forwards" as const };

  const ghosts = fancy ? TRAIL : [];
  ghosts.forEach((opacity, i) => {
    const ghost = spawnImage(detail, 0);
    ghost
      .animate(flightKeyframes(path, (i + 1) * 0.06, opacity), timing)
      .finished.finally(() => ghost.remove());
  });

  const img = spawnImage(detail, 1);
  img.animate(flightKeyframes(path), timing).finished.finally(() => {
    img.remove();
    if (target) landOn(target, color);
  });
}

/** Flies picked-up loot from where it lay in the world into the bag button. Renders nothing itself. */
export const FlyingLoot = () => {
  useEffect(() => {
    const onFly = (e: CustomEvent<LootFlyDetail>) => flyLoot(e.detail);
    window.addEventListener("LOOT_FLY", onFly);
    return () => window.removeEventListener("LOOT_FLY", onFly);
  }, []);
  return null;
};
