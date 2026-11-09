import Phaser from "phaser";
import { particleSpread } from "./body-effect-size";
import type { Player } from "./player";
import { bakePixelTexture, getPixelTexture } from "./pixel-texture";

/** Bubble greens: dark rim, body, and a pale glint. */
const RIM = 0x1f5a1a;
const BODY = 0x5fd13a;
const GLINT = 0xd8ffb0;
/** A landing bursts this many bubbles; each poison tick lets off a few. */
const LANDING_BUBBLES = 3;
const TICK_BUBBLES = 1;
/** The most bubbles one character has at once. */
const MAX_BUBBLES = 3;
/** How far they rise off the head, in pixels, and how long they take. */
const RISE_PX = [6, 12] as const;
const RISE_MS = [500, 900] as const;
/** Where they start: just below the top of the head, this far either side. */
const HEAD_OFFSET_Y = 9;
const HEAD_SPREAD_X = 5;

/** A small pixel bubble: a 4x4 blob with a rim and a glint. */
function drawBubble(scene: Phaser.Scene, size: number) {
  const key = bakePixelTexture(scene, `fx-poison-bubble-${size}`, size, size, (g) => {
    g.fillStyle(RIM)
      .fillRect(1, 0, size - 2, size)
      .fillRect(0, 1, size, size - 2);
    g.fillStyle(BODY).fillRect(1, 1, size - 2, size - 2);
    g.fillStyle(GLINT).fillRect(1, 1, 1, 1);
  });
  return scene.add.image(0, 0, key).setOrigin(0);
}

/** Bubbles each character has rising (or about to): a new one is skipped past `MAX_BUBBLES`. */
const bubbleCounts = new WeakMap<Player, number>();

/** One bubble rising off the top of the head, wobbling, then popping into a few flecks. */
function riseBubble(player: Player, delay: number) {
  const { scene } = player;
  /* However many poison hits and ticks land at once, it never boils over */
  const count = bubbleCounts.get(player) ?? 0;
  if (count >= MAX_BUBBLES) return;
  bubbleCounts.set(player, count + 1);
  const release = () => bubbleCounts.set(player, Math.max(0, (bubbleCounts.get(player) ?? 1) - 1));
  const scale = player.proScale || 1;
  const spread = Math.min(HEAD_SPREAD_X * scale, particleSpread(player) / 2);
  const size = 4;
  const bubble = drawBubble(scene, size);
  const startX = Math.round(Phaser.Math.FloatBetween(-spread, spread) - size / 2);
  const headTop = player.headY + HEAD_OFFSET_Y * scale;
  const startY = Math.round(headTop + Phaser.Math.Between(-2, 3));
  bubble.setPosition(startX, startY).setAlpha(0);
  player.add(bubble);
  const rise = Phaser.Math.Between(...RISE_PX);
  const wobble = Phaser.Math.Between(2, 4) * (Math.random() < 0.5 ? -1 : 1);
  const duration = Phaser.Math.Between(...RISE_MS);
  scene.tweens.add({
    targets: bubble,
    y: startY - rise,
    delay,
    duration,
    ease: "Sine.easeOut",
    onStart: () => bubble.setAlpha(1),
    onUpdate: (tween) => {
      /* Whole pixels side to side, so it stays crisp */
      bubble.x = startX + Math.round(Math.sin(tween.progress * Math.PI * 2) * wobble);
    },
    onComplete: () => {
      release();
      popFlecks(player, bubble.x + size / 2, bubble.y + size / 2);
      bubble.destroy();
    },
    onStop: release,
  });
}

/** A popped bubble's flecks: a few pixels flicking out and fading. */
function popFlecks(player: Player, x: number, y: number) {
  if (!player.active) return;
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const color = Math.random() < 0.5 ? BODY : GLINT;
    const fleck = player.scene.add.image(x, y, getPixelTexture(player.scene)).setTint(color);
    player.add(fleck);
    player.scene.tweens.add({
      targets: fleck,
      x: x + dx * 2,
      y: y + dy * 2,
      alpha: 0,
      duration: 180,
      onComplete: () => fleck.destroy(),
    });
  }
}

/** Poison landing: a burst of bubbles boils up off the body and pops. Visual only. */
export function playPoisonLanding(player: Player) {
  if (!player?.scene) return;
  for (let i = 0; i < LANDING_BUBBLES; i++) riseBubble(player, i * 45);
}

/** A poison tick: a few bubbles, so you can see it still working. Visual only. */
export function playPoisonTick(player: Player) {
  if (!player?.scene) return;
  for (let i = 0; i < TICK_BUBBLES; i++) riseBubble(player, i * 90);
}
