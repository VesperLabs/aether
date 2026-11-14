import Phaser from "phaser";

/** Drop colours, foam to river blue. */
const DROP_COLORS = [0xffffff, 0xd8f0ff, 0x8ccaf2];
const RIPPLE_COLOR = 0xd8f0ff;
const RIPPLE_DARK = 0x6fb4e8;

/**
 * A ring on the water that spreads out from (x, y) and fades: a step in the shallows or a wading
 * body's wake. Flat, like the water: `flatness` times as wide as it is tall.
 */
export function spawnRipple(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  { from = 2, to = 9, ms = 520, alpha = 0.8, flatness = 2, delay = 0 } = {},
) {
  const ring = scene.add.graphics({ x, y }).setDepth(depth);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay,
    duration: ms,
    ease: "Quad.easeOut",
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      const rx = Math.round(Phaser.Math.Linear(from, to, t));
      const ry = Math.max(1, Math.round(rx / flatness));
      ring.clear();
      /* In single pixels, like the waterline ring: lit along the front, darker at the back */
      const steps = Math.max(8, rx * 6);
      for (let i = 0; i < steps; i++) {
        const angle = (Math.PI * 2 * i) / steps;
        const front = Math.sin(angle) > 0;
        ring.fillStyle(front ? RIPPLE_COLOR : RIPPLE_DARK, alpha * (1 - t) * (front ? 1 : 0.7));
        ring.fillRect(Math.round(Math.cos(angle) * rx), Math.round(Math.sin(angle) * ry), 1, 1);
      }
    },
    onComplete: () => ring.destroy(),
  });
}

/** Single-pixel drops kicked up from (x, y) that arc up and fall back, like water off a boot. */
export function spawnDrops(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  { count = 3, heading = 0, headingY = 0 } = {},
) {
  for (let i = 0; i < count; i++) {
    const color = DROP_COLORS[Phaser.Math.Between(0, DROP_COLORS.length - 1)];
    const drop = scene.add.rectangle(x, y, 1, 1, color).setDepth(depth);
    /* Mostly forward and to the sides of the way it walks, a little up */
    const spreadX = heading * Phaser.Math.Between(2, 6) + Phaser.Math.Between(-3, 3);
    const spreadY = headingY * Phaser.Math.Between(1, 3);
    const height = Phaser.Math.Between(4, 11);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Phaser.Math.Between(260, 420),
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        drop.x = Math.round(x + spreadX * t);
        /* A parabola: up, then back down to the water */
        drop.y = Math.round(y + spreadY * t - height * 4 * t * (1 - t));
        drop.setAlpha(t < 0.7 ? 1 : (1 - t) / 0.3);
      },
      onComplete: () => drop.destroy(),
    });
  }
}

/** Wake foam: pale river blue, never white, and faint, so it sits in the water instead of on it. */
const WAKE_COLORS = [0xa9d6f5, 0x8ccaf2];
const WAKE_ALPHA = 0.5;
/** How far each wake arm angles out from straight behind, radians. */
const WAKE_ARM_ANGLE = 0.6;

/**
 * One beat of the wake a body leaves pushing through water: a short broken dash of foam off each
 * shoulder (`x`, `y` is the middle of its back, `width` from shoulder to shoulder). Each dash lies
 * along an arm of the V and drifts outward as it fades, staying where it was dropped while the body
 * walks on, so the beats line up into two arms spreading apart behind it.
 */
export function spawnWake(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth: number,
  {
    dirX,
    dirY,
    width = 12,
    drift = 8,
    ms = 900,
    flatness = 3,
  }: { dirX: number; dirY: number; width?: number; drift?: number; ms?: number; flatness?: number },
) {
  for (const side of [-1, 1]) {
    /* The arm runs back and out on this side; the dash drifts out perpendicular to the motion */
    const back = Math.atan2(-dirY, -dirX) - side * WAKE_ARM_ANGLE;
    const armX = Math.cos(back);
    const armY = Math.sin(back);
    const outX = -dirY * side;
    const outY = dirX * side;
    const length = Phaser.Math.Between(4, 6);
    /* Broken foam: some pixels missing, and the dash wobbles off its line, fixed for this dash */
    const pixels = Array.from({ length }, (_, i) => ({
      i,
      shown: Math.random() > 0.25,
      wobble: Phaser.Math.Between(-1, 1) * 0.5,
      color: WAKE_COLORS[Phaser.Math.Between(0, WAKE_COLORS.length - 1)],
    })).filter((p) => p.shown);
    const foam = scene.add.graphics({ x, y }).setDepth(depth);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms + Phaser.Math.Between(-150, 150),
      ease: "Sine.easeOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const start = width / 2 + drift * t;
        foam.clear();
        for (const p of pixels) {
          const along = p.i * (1 + t * 0.5);
          const px = outX * start + armX * along + -outY * p.wobble;
          const py = outY * start + armY * along + outX * p.wobble;
          foam.fillStyle(p.color, WAKE_ALPHA * (1 - t) * (1 - p.i / (length + 2)));
          foam.fillRect(Math.round(px), Math.round(py / flatness), 1, 1);
        }
      },
      onComplete: () => foam.destroy(),
    });
  }
}
