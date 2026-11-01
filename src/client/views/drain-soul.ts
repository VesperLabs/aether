import Phaser from "phaser";
import type { DrainResource } from "@/rules/combat";
import type { Player } from "./player";

/** Soul color for each drained resource: life, mana, stamina. */
const SOUL_COLORS: Record<DrainResource, number> = {
  hp: 0x86efac,
  mp: 0x93c5fd,
  sp: 0xfde047,
};
/** A drainer gets at most one soul per this many ms, so fast hits don't spam them. */
const SOUL_COOLDOWN_MS = 500;
const lastSoul = new WeakMap<Player, number>();
/** The soul rises out of the victim this high before it zips to the drainer, in pixels. */
const RISE_PIXELS = 6;
const FLIGHT_MS = 240;
const SOUL_RADIUS = 2;
/** The absorb ring grows to this radius, in pixels. */
const RING_RADIUS = 9;
const RING_MS = 220;
/** Above every character, like the damage numbers. */
const SOUL_DEPTH = 99998;

/**
 * A small glowing soul flies fast from `source` into `target`, which absorbs it with a thin ring. Visual only; any drain (steal stats, a future drain-over-time buff) can
 * play it.
 */
export function playDrainSoul(
  source: Player | undefined,
  target: Player | undefined,
  resource: DrainResource,
) {
  const scene = target?.scene;
  if (!scene || !source?.scene || source === target) return;
  /* Don't give away a stealthed drainer */
  if (!target.visible || target.alpha === 0) return;
  const now = scene.time.now;
  if (now - (lastSoul.get(target) ?? -Infinity) < SOUL_COOLDOWN_MS) return;
  lastSoul.set(target, now);

  const color = SOUL_COLORS[resource];
  const start = { x: source.x, y: source.y + source.bodyCenterY };
  const rise = { x: start.x, y: start.y - RISE_PIXELS };
  const soul = scene.add.graphics().setDepth(SOUL_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
  const progress = { t: 0 };

  scene.tweens.add({
    targets: progress,
    t: 1,
    duration: FLIGHT_MS,
    ease: "Quad.easeIn",
    onUpdate: () => {
      if (!target.active) return soul.destroy();
      /* A curve that pops up out of the victim, then dives into the drainer wherever it is */
      const end = { x: target.x, y: target.y + target.bodyCenterY };
      const { t } = progress;
      const u = 1 - t;
      const x = u * u * start.x + 2 * u * t * rise.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * rise.y + t * t * end.y;
      soul.clear();
      soul.fillStyle(color, 0.45).fillCircle(x, y, SOUL_RADIUS * 1.6);
      soul.fillStyle(0xffffff, 0.9).fillCircle(x, y, SOUL_RADIUS * 0.6);
    },
    onComplete: () => {
      soul.destroy();
      absorb(scene, target, color);
    },
  });
}

/** A thin ring of the soul's color pulses out of the drainer's body. */
function absorb(scene: Phaser.Scene, target: Player, color: number) {
  if (!target.active || target.state?.isDead) return;
  const ring = scene.add
    .circle(0, target.bodyCenterY, RING_RADIUS)
    .setStrokeStyle(1, color, 0.8)
    .setScale(0.3);
  target.add(ring);
  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: 0,
    duration: RING_MS,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}
