import Phaser from "phaser";
import { particleSpread, scaledCount } from "./body-effect-size";
import type { Player } from "./player";

/** Blood reds: a dark edge, the drop, and a wet glint. */
const DARK = 0x4a0808;
const RED = 0xc81e1e;
const GLINT = 0xff8a7a;
/** A landing spurts this many drops; each bleed tick lets a few fall. */
const LANDING_DROPS = 6;
const TICK_DROPS = 2;
/**
 * Drops land on the shadow: across this share of the body's footprint (its `bodySize`), and
 * between these shares of it below the character's position.
 */
const LAND_SPREAD_X = 1.1;
const LAND_TOP_Y = 0.5;
const LAND_BOTTOM_Y = 1.2;
/** How long a drop takes to fall, and how long its splat lingers. */
const FALL_MS = [380, 600] as const;
const SPLAT_MS = 3000;
/** Above the map's ground, shadow, overlay and extras layers (0 to 3), below characters (100+). */
const GROUND_DEPTH = 4;

/** A tiny pixel drop: 2 wide, 3 tall, rounder at the bottom, with a glint. */
function drawDrop(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  g.fillStyle(DARK).fillRect(0, 1, 2, 2).fillRect(0, 0, 1, 1);
  g.fillStyle(RED).fillRect(1, 0, 1, 2).fillRect(0, 1, 1, 1);
  g.fillStyle(GLINT).fillRect(1, 0, 1, 1);
  return g;
}

/**
 * One drop leaving the body: a spurt flicks it out sideways first, a drip just lets it fall. It
 * lands at the feet and leaves a splat that soaks away.
 */
function dropBlood(player: Player, delay: number, spurt: boolean) {
  const { scene } = player;
  const bodyHeight = player.hitBoxSize?.height ?? 32;
  const spread = particleSpread(player);
  const drop = drawDrop(scene);
  const startX = Math.round(Phaser.Math.Between(-spread / 2, spread / 2));
  const startY = Math.round(player.bodyCenterY + Phaser.Math.Between(-bodyHeight / 6, 4));
  drop.setPosition(startX, startY).setVisible(false);
  player.add(drop);
  /* It lands on the shadow under the feet; a spurt flicks it outward on the way */
  const foot = player.bodySize || 8;
  const reachX = Math.round(foot * LAND_SPREAD_X);
  const nudge = spurt ? Math.sign(startX || 1) * Phaser.Math.Between(2, 5) : 0;
  const endX = Phaser.Math.Clamp(startX + nudge, -reachX, reachX);
  const groundY = Phaser.Math.Between(
    Math.round(foot * LAND_TOP_Y),
    Math.round(foot * LAND_BOTTOM_Y),
  );
  /* A spurt arcs up a little before gravity takes it */
  const lift = spurt ? Phaser.Math.Between(3, 7) : 0;
  const duration = Phaser.Math.Between(...FALL_MS);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay,
    duration,
    onStart: () => drop.setVisible(true),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      /* Whole pixels, so it stays crisp: straight out sideways, up then down in a parabola */
      drop.x = Math.round(startX + (endX - startX) * t);
      drop.y = Math.round(startY + (groundY - startY) * t * t - lift * 4 * t * (1 - t));
    },
    onComplete: () => {
      splat(player, drop.x, groundY);
      drop.destroy();
    },
  });
}

/**
 * A drop hitting the ground: a small round-cornered puddle, two or three pixels deep, with a dark
 * edge and a fleck thrown beside it. It stays where it fell, then soaks away.
 */
function splat(player: Player, x: number, y: number) {
  if (!player.active) return;
  const { scene } = player;
  const g = scene.add.graphics();
  const width = Phaser.Math.Between(3, 5);
  const height = width > 3 ? 3 : 2;
  /* A rounded blob: dark rim, red middle, corners left off */
  g.fillStyle(DARK)
    .fillRect(1, 0, width - 2, height)
    .fillRect(0, 1, width, height - 2 || 1);
  g.fillStyle(RED).fillRect(1, 1, width - 2, Math.max(1, height - 2));
  if (height === 2) g.fillStyle(RED).fillRect(1, 0, width - 2, 1);
  /* A stray fleck to one side */
  const fleckX = Math.random() < 0.5 ? -2 : width + 1;
  g.fillStyle(DARK).fillRect(fleckX, Phaser.Math.Between(0, height - 1), 1, 1);
  /* Left on the ground where it fell, not carried along: in the world, above the map's tile layers
     and under every character */
  g.setPosition(Math.round(player.x + x - width / 2), Math.round(player.y + y - height / 2));
  g.setDepth(GROUND_DEPTH);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    delay: SPLAT_MS / 2,
    duration: SPLAT_MS / 2,
    onComplete: () => g.destroy(),
  });
}

/** Bleed landing: blood spurts out of the body and spatters at its feet. Visual only. */
export function playBleedLanding(player: Player) {
  if (!player?.scene) return;
  const count = scaledCount(player, LANDING_DROPS);
  for (let i = 0; i < count; i++) dropBlood(player, (i * 30 * LANDING_DROPS) / count, true);
}

/** A bleed tick: a few drops fall, so you can see it still working. Visual only. */
export function playBleedTick(player: Player) {
  if (!player?.scene) return;
  const count = scaledCount(player, TICK_DROPS);
  for (let i = 0; i < count; i++) dropBlood(player, (i * 120 * TICK_DROPS) / count, false);
}
