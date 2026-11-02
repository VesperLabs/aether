import { useEffect } from "react";
import { ELEMENT_EFFECTS, ElementSim, outlineFilter, theme } from "@/ui";
import type { LootFlyDetail } from "@/client/window-events";

/** The element picked-up loot flies into. */
export const LOOT_TARGET_ID = "loot-target";

const POP_MS = 90;
const FLIGHT_MS = 430;
const ARC_STEPS = 14;

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

/** One random arc per pickup. */
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

/** Pop, then an eased-in toss over the arc. */
function flightKeyframes({ a, b, control, spin, endScale }: FlightPath) {
  const popOffset = POP_MS / (POP_MS + FLIGHT_MS);
  const frames: Keyframe[] = [
    { offset: 0, transform: "translate(0px, 0px) scale(1)" },
    { offset: popOffset * 0.6, transform: "translate(0px, 0px) scale(1.35, 1.15)" },
    { offset: popOffset, transform: "translate(0px, -4px) scale(1.2, 1.3)" },
  ];
  for (let i = 1; i <= ARC_STEPS; i++) {
    const t = i / ARC_STEPS;
    const p = bezier(a, control, b, t * t);
    const scale = 1.25 + (endScale - 1.25) * t;
    frames.push({
      offset: popOffset + (1 - popOffset) * t,
      transform: `translate(${p.x - a.x}px, ${p.y - a.y}px) rotate(${spin * t}deg) scale(${scale})`,
    });
  }
  return frames;
}

/**
 * Keeps a weapon's element outline alive in flight: the same `ElementSim` outline the game and
 * the bag draw, element turns and all. Returns the function that stops it.
 */
function animateOutline(img: HTMLImageElement, { elements = [], pixelSize = 1 }: LootFlyDetail) {
  const effects = elements.map((element) => ELEMENT_EFFECTS[element]).filter(Boolean);
  if (effects.length === 0) return () => {};
  const sim = new ElementSim(effects);
  let frame = 0;
  let last = 0;
  const draw = (time: number) => {
    sim.step(time, last ? time - last : 16, (pixel) => pixel);
    last = time;
    img.style.filter = outlineFilter(sim.outline(), pixelSize);
    frame = requestAnimationFrame(draw);
  };
  draw(performance.now());
  return () => cancelAnimationFrame(frame);
}

function spawnImage(detail: LootFlyDetail) {
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
  const path = flightPath(detail.rect, to);
  const timing = { duration: POP_MS + FLIGHT_MS, easing: "linear", fill: "forwards" as const };

  const img = spawnImage(detail);
  const stopOutline = animateOutline(img, detail);
  img.animate(flightKeyframes(path), timing).finished.finally(() => {
    stopOutline();
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
