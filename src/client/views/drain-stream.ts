import Phaser from "phaser";
import type { DrainResource } from "@/rules/combat";
import type { Player } from "./player";

/** Tether color for each drained resource: blood, mana, stamina. */
export const DRAIN_COLORS: Record<DrainResource, number> = {
  hp: 0xdc2626,
  mp: 0x3b82f6,
  sp: 0x4ade80,
};
/** The tether whips out from the victim to the drainer, in ms. */
const REACH_MS = 120;
/** The pulse then rides it into the drainer while it fades, in ms. */
const PULL_MS = 300;
/** How far the tether sags to one side, in pixels. */
const SAG_PIXELS = 10;
const SEGMENTS = 14;
/** Line width at the victim's end and at the drainer's end, in pixels. */
const START_WIDTH = 1;
const END_WIDTH = 3;
const PULSE_RADIUS = 3.5;
/** The drainer's absorb ring grows to this radius, in pixels. */
const ABSORB_RADIUS = 14;
const ABSORB_MS = 260;
/** Above every character, like the damage numbers. */
const DRAIN_DEPTH = 99998;

/**
 * A tether from `source` to `target` that pulls a pulse of the drained resource into `target`,
 * which flashes a ring as it absorbs it. Both ends follow the characters as they move. Visual
 * only; any drain (steal stats, a future drain-over-time buff) can play it.
 */
export function playDrainStream(
  source: Player | undefined,
  target: Player | undefined,
  resource: DrainResource,
) {
  const scene = target?.scene;
  if (!scene || !source?.scene || source === target) return;
  /* Don't give away a stealthed drainer */
  if (!target.visible || target.alpha === 0) return;

  const color = DRAIN_COLORS[resource];
  const tether = scene.add.graphics().setDepth(DRAIN_DEPTH);
  const sag = (Math.random() < 0.5 ? -1 : 1) * SAG_PIXELS;
  const progress = { reach: 0, pull: 0 };

  const draw = () => {
    if (!source.active || !target.active) return tether.destroy();
    const points = tetherPoints(source, target, sag);
    tether.clear();
    /* The tether fades from the victim's end as the pulse leaves it */
    const tip = Math.round(progress.reach * SEGMENTS);
    const tail = Math.round(progress.pull * SEGMENTS);
    for (let i = tail; i < tip; i++) {
      const width = Phaser.Math.Linear(START_WIDTH, END_WIDTH, i / SEGMENTS);
      tether.lineStyle(width, color, 0.85 * (1 - progress.pull * 0.5));
      tether.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
    if (progress.pull > 0) {
      const at = points[Math.min(tail, SEGMENTS)];
      tether.fillStyle(color, 1).fillCircle(at.x, at.y, PULSE_RADIUS);
      tether.fillStyle(0xffffff, 0.9).fillCircle(at.x, at.y, PULSE_RADIUS * 0.45);
    }
  };

  scene.tweens.chain({
    tweens: [
      { targets: progress, reach: 1, duration: REACH_MS, ease: "Quad.easeOut", onUpdate: draw },
      { targets: progress, pull: 1, duration: PULL_MS, ease: "Sine.easeIn", onUpdate: draw },
    ],
    onComplete: () => {
      tether.destroy();
      playAbsorbRing(scene, target, color);
    },
  });
}

/** Points along the sagging curve from the victim's body to the drainer's body. */
function tetherPoints(source: Player, target: Player, sag: number) {
  const sx = source.x;
  const sy = source.y + source.bodyCenterY;
  const ex = target.x;
  const ey = target.y + target.bodyCenterY;
  const angle = Math.atan2(ey - sy, ex - sx);
  const points: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const bow = Math.sin(t * Math.PI) * sag;
    points.push({
      x: Phaser.Math.Linear(sx, ex, t) - Math.sin(angle) * bow,
      y: Phaser.Math.Linear(sy, ey, t) + Math.cos(angle) * bow,
    });
  }
  return points;
}

/** A ring of the resource's color bursts from the drainer's body as it absorbs the drain. */
function playAbsorbRing(scene: Phaser.Scene, target: Player, color: number) {
  if (!target.active) return;
  const ring = scene.add
    .circle(0, target.bodyCenterY, ABSORB_RADIUS)
    .setStrokeStyle(2, color, 1)
    .setScale(0.3);
  target.add(ring);
  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: 0,
    duration: ABSORB_MS,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}
