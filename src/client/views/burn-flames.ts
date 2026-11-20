import Phaser from "phaser";
import { particleSpread, scaledCount } from "./body-effect-size";
import type { Player } from "./player";
import { bakePixelTexture, getPixelTexture } from "./pixel-texture";

/** Flame colours: a deep red base, an orange body and a yellow-white core. */
const EMBER = 0xb8260e;
const FLAME = 0xff7a2a;
const CORE = 0xffe27a;
/** A landing flares up this many flames; each burn tick licks up a few. */
const LANDING_FLAMES = 6;
const TICK_FLAMES = 3;
/** The most flames one character has at once. */
const MAX_FLAMES = 8;
/** How far a flame climbs, in pixels, and how long it lives. */
const RISE_PX = [8, 16] as const;
const RISE_MS = [350, 600] as const;

/** A tiny pixel flame: 3 wide, 5 tall, pointed at the top with a bright core. */
function drawFlame(scene: Phaser.Scene) {
  const key = bakePixelTexture(scene, "fx-burn-flame", 3, 5, (g) => {
    g.fillStyle(EMBER).fillRect(0, 2, 3, 3);
    g.fillStyle(FLAME).fillRect(1, 0, 1, 4).fillRect(0, 2, 1, 2).fillRect(2, 1, 1, 2);
    g.fillStyle(CORE).fillRect(1, 2, 1, 2);
  });
  return scene.add.image(0, 0, key).setOrigin(0.5, 1);
}

/** Flames each character has burning (or about to): a new one is skipped past `MAX_FLAMES`. */
const flameCounts = new WeakMap<Player, number>();

/** One flame licking up off the body, flickering side to side, shrinking, then letting off a spark. */
function riseFlame(player: Player, delay: number) {
  const { scene } = player;
  /* However many burns and ticks land at once, it never becomes a bonfire */
  const count = flameCounts.get(player) ?? 0;
  if (count >= MAX_FLAMES) return;
  flameCounts.set(player, count + 1);
  const release = () => flameCounts.set(player, Math.max(0, (flameCounts.get(player) ?? 1) - 1));
  const spread = particleSpread(player);
  const bodyHeight = player.hitBoxSize.height;
  const flame = drawFlame(scene);
  const startX = Math.round(Phaser.Math.FloatBetween(-spread / 2, spread / 2));
  const startY = Math.round(player.bodyCenterY + Phaser.Math.Between(0, bodyHeight / 3));
  flame.setPosition(startX, startY).setAlpha(0);
  player.add(flame);
  const rise = Phaser.Math.Between(...RISE_PX);
  const duration = Phaser.Math.Between(...RISE_MS);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    delay,
    duration,
    onStart: () => flame.setAlpha(1),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      /* Whole pixels, so it stays crisp: a jittery flicker as it climbs, shrinking near the top */
      flame.x = startX + (Math.random() < 0.3 ? Phaser.Math.Between(-1, 1) : 0);
      flame.y = Math.round(startY - rise * t);
      flame.setScale(t > 0.6 ? 0.5 : 1);
      flame.setAlpha(t > 0.8 ? 0.6 : 1);
    },
    onComplete: () => {
      release();
      spark(player, flame.x, flame.y - 4);
      flame.destroy();
    },
    onStop: release,
  });
}

/** A spark leaving a flame's tip: one pixel drifting up and going out. */
function spark(player: Player, x: number, y: number) {
  if (!player.active || Math.random() < 0.5) return;
  const color = Math.random() < 0.5 ? FLAME : CORE;
  const fleck = player.scene.add.image(x, y, getPixelTexture(player.scene)).setTint(color);
  player.add(fleck);
  player.scene.tweens.add({
    targets: fleck,
    x: x + Phaser.Math.Between(-2, 2),
    y: y - Phaser.Math.Between(3, 6),
    alpha: 0,
    duration: 300,
    onComplete: () => fleck.destroy(),
  });
}

/** Burn landing: the body flares up in a burst of flames. Visual only. */
export function playBurnLanding(player: Player) {
  if (!player?.scene) return;
  const count = Math.min(LANDING_FLAMES, scaledCount(player, LANDING_FLAMES));
  for (let i = 0; i < count; i++) riseFlame(player, i * 40);
}

/** A burn tick: a few flames lick up, so you can see it still burning. Visual only. */
export function playBurnTick(player: Player) {
  if (!player?.scene) return;
  const count = Math.min(TICK_FLAMES, scaledCount(player, TICK_FLAMES));
  for (let i = 0; i < count; i++) riseFlame(player, i * 80);
}
