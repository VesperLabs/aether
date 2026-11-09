import Phaser from "phaser";
import { particleSpread, scaledCount } from "./body-effect-size";
import type { Player } from "./player";
import { bakePixelTexture } from "./pixel-texture";

/** Blood reds: a dark edge, the drop, and a wet glint. */
const DARK = 0x4a0808;
const RED = 0xc81e1e;
const GLINT = 0xff8a7a;
/** A splat on the ground: one flat red, between the drop's dark edge and its body. */
const SPLAT = 0x8e1212;
/** A landing spurts this many drops; each bleed tick lets a few fall. */
const LANDING_DROPS = 8;
const TICK_DROPS = 2;
/** The most drops one character has in the air at once: one landing's worth. */
const MAX_DROPS = LANDING_DROPS;
/**
 * Drops land on the shadow: across this share of the body's footprint (its `bodySize`), and
 * between these shares of it below the character's position.
 */
const LAND_SPREAD_X = 1.1;
const LAND_TOP_Y = 0.5;
const LAND_BOTTOM_Y = 1.2;
/** How long a drop takes to fall, and how long its splat lingers. */
const FALL_MS = [380, 600] as const;
const SPURT_MS = [450, 700] as const;
const SPLAT_MS = 1200;
/** Big bodies throw blood as far as a body this wide does, no further. */
const MAX_FOOT = 14;
/** Half the angle of the cone blood sprays in, away from the blow, in radians. */
const SPRAY_CONE = 0.6;
/** Above the map's ground, shadow, overlay and extras layers (0 to 3), below characters (100+). */
const GROUND_DEPTH = 4;

/** A tiny pixel drop: 2 wide, 3 tall, rounder at the bottom, with a glint. */
function drawDrop(scene: Phaser.Scene) {
  const key = bakePixelTexture(scene, "fx-blood-drop", 2, 3, (g) => {
    g.fillStyle(DARK).fillRect(0, 1, 2, 2).fillRect(0, 0, 1, 1);
    g.fillStyle(RED).fillRect(1, 0, 1, 2).fillRect(0, 1, 1, 1);
    g.fillStyle(GLINT).fillRect(1, 0, 1, 1);
  });
  return scene.add.image(0, 0, key).setOrigin(0);
}

/** A splat's texture: a flat stain `width` wide with a fleck two pixels to one side. */
function getSplatTexture(scene: Phaser.Scene, width: number, height: number, isFleckLeft: boolean) {
  const key = `fx-blood-splat-${width}-${isFleckLeft ? "l" : "r"}`;
  return bakePixelTexture(scene, key, width + 2, height, (g) => {
    const bodyX = isFleckLeft ? 2 : 0;
    g.fillStyle(SPLAT).fillRect(bodyX, 0, width, height);
    g.fillRect(isFleckLeft ? 0 : width + 1, height - 1, 1, 1);
  });
}

/** Which way blood sprays: a unit vector on the ground. */
type Direction = { x: number; y: number };

/**
 * One drop leaving the body: a spurt is thrown out (away from the blow, given `away`), a drip just
 * lets it fall. It lands on the ground and leaves a splat that soaks away.
 */
/** Drops each character has in the air (or about to be): a new one is skipped past `MAX_DROPS`. */
const dropCounts = new WeakMap<Player, number>();

function dropBlood(player: Player, delay: number, spurt: boolean, away?: Direction) {
  const { scene } = player;
  /* However many bleeds and ticks land at once, it never gushes */
  const count = dropCounts.get(player) ?? 0;
  if (count >= MAX_DROPS) return;
  dropCounts.set(player, count + 1);
  const release = () => dropCounts.set(player, Math.max(0, (dropCounts.get(player) ?? 1) - 1));
  const bodyHeight = player.hitBoxSize?.height ?? 32;
  const spread = particleSpread(player);
  const drop = drawDrop(scene);
  const startX = Math.round(Phaser.Math.Between(-spread / 2, spread / 2));
  const startY = Math.round(player.bodyCenterY + Phaser.Math.Between(-bodyHeight / 6, 4));
  drop.setPosition(startX, startY).setVisible(false);
  player.add(drop);
  /* A spurt is thrown well clear of the body; a drip only leaves it a little */
  const foot = Math.min(MAX_FOOT, player.bodySize || 8);
  const side = startX === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(startX);
  let endX: number;
  let groundY = Phaser.Math.Between(
    Math.round(foot * LAND_TOP_Y),
    Math.round(foot * LAND_BOTTOM_Y),
  );
  if (spurt && away) {
    /* A cone behind the victim, opposite the attacker */
    const angle = Math.atan2(away.y, away.x) + Phaser.Math.FloatBetween(-SPRAY_CONE, SPRAY_CONE);
    const distance = Phaser.Math.FloatBetween(foot * 0.8, foot * 2.4);
    endX = Math.round(startX + Math.cos(angle) * distance);
    groundY = Math.round(groundY + Math.sin(angle) * distance * 0.6);
  } else if (spurt) {
    endX = startX + side * Phaser.Math.Between(Math.round(foot * 0.8), Math.round(foot * 2.2));
  } else {
    const reachX = Math.round(foot * LAND_SPREAD_X);
    endX = Phaser.Math.Clamp(startX + side * Phaser.Math.Between(1, 4), -reachX, reachX);
  }
  /* It arcs up before gravity takes it: high for a spurt, a small hop for a drip */
  const lift = spurt ? Phaser.Math.Between(10, 20) : Phaser.Math.Between(2, 5);
  const [shortest, longest] = spurt ? SPURT_MS : FALL_MS;
  const duration = Phaser.Math.Between(shortest, longest);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay,
    duration,
    onStart: () => drop.setVisible(true),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      /* Whole pixels, so it stays crisp: steady sideways, up then down in a parabola */
      drop.x = Math.round(startX + (endX - startX) * t);
      drop.y = Math.round(startY + (groundY - startY) * t * t - lift * 4 * t * (1 - t));
    },
    onStop: release,
    onComplete: () => {
      release();
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
  const width = Phaser.Math.Between(2, 4);
  const height = width > 2 ? 2 : 1;
  /* Flat: one colour, no rim or shine, so it reads as a stain on the ground and not a bead. A
     stray fleck sits to one side. */
  const isFleckLeft = Math.random() < 0.5;
  const g = scene.add.image(0, 0, getSplatTexture(scene, width, height, isFleckLeft)).setOrigin(0);
  /* Left on the ground where it fell, not carried along: in the world, above the map's tile layers
     and under every character */
  const left = Math.round(player.x + x - width / 2) - (isFleckLeft ? 2 : 0);
  g.setPosition(left, Math.round(player.y + y - height / 2));
  g.setDepth(GROUND_DEPTH);
  scene.tweens.add({
    targets: g,
    alpha: 0,
    delay: SPLAT_MS / 2,
    duration: SPLAT_MS / 2,
    onComplete: () => g.destroy(),
  });
}

/**
 * Bleed landing: blood spurts out of the body and spatters around it, away from `attacker` when
 * known. Visual only.
 */
export function playBleedLanding(player: Player, attacker?: { x: number; y: number }) {
  if (!player?.scene) return;
  const dx = attacker ? player.x - attacker.x : 0;
  const dy = attacker ? player.y - attacker.y : 0;
  const length = Math.hypot(dx, dy);
  const away = length > 0 ? { x: dx / length, y: dy / length } : undefined;
  /* Fewer for a small body, never more than a human's */
  const count = Math.min(LANDING_DROPS, scaledCount(player, LANDING_DROPS));
  for (let i = 0; i < count; i++) dropBlood(player, (i * 30 * LANDING_DROPS) / count, true, away);
}

/** A bleed tick: a few drops fall, so you can see it still working. Visual only. */
export function playBleedTick(player: Player) {
  if (!player?.scene) return;
  const count = Math.min(TICK_DROPS, scaledCount(player, TICK_DROPS));
  for (let i = 0; i < count; i++) dropBlood(player, (i * 120 * TICK_DROPS) / count, false);
}
