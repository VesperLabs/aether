import Phaser from "phaser";
import { particleSpread, scaledCount } from "./body-effect-size";
import type { Player } from "./player";

/** Bubble greens: dark rim, body, and a pale glint. */
const RIM = 0x1f5a1a;
const BODY = 0x5fd13a;
const GLINT = 0xd8ffb0;
/** A landing bursts this many bubbles; each poison tick lets off a few. */
const LANDING_BUBBLES = 5;
const TICK_BUBBLES = 2;
/** How high they rise, as a share of the body's height, and how long they take. */
const RISE_BODY_RATIO = 0.6;
const RISE_MS = [500, 900] as const;

/** A tiny pixel bubble: a 3x3 (or 4x4) blob with a rim and a glint, drawn on a graphics. */
function drawBubble(scene: Phaser.Scene, size: number) {
  const g = scene.add.graphics();
  g.fillStyle(RIM)
    .fillRect(1, 0, size - 2, size)
    .fillRect(0, 1, size, size - 2);
  g.fillStyle(BODY).fillRect(1, 1, size - 2, size - 2);
  g.fillStyle(GLINT).fillRect(1, 1, 1, 1);
  return g;
}

/** One bubble rising off the body, wobbling, then popping into a few flecks. */
function riseBubble(player: Player, delay: number) {
  const { scene } = player;
  const bodyHeight = player.hitBoxSize?.height ?? 32;
  const spread = particleSpread(player);
  const size = Phaser.Math.Between(3, 4);
  const bubble = drawBubble(scene, size);
  const startX = Math.round(Phaser.Math.Between(-spread / 2, spread / 2) - size / 2);
  const startY = Math.round(player.bodyCenterY + Phaser.Math.Between(-4, bodyHeight / 4));
  bubble.setPosition(startX, startY).setAlpha(0);
  player.add(bubble);
  const rise = Math.round(bodyHeight * RISE_BODY_RATIO * Phaser.Math.FloatBetween(0.6, 1));
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
      popFlecks(player, bubble.x + size / 2, bubble.y + size / 2);
      bubble.destroy();
    },
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
    const fleck = player.scene.add.rectangle(x, y, 1, 1, color);
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
  const count = scaledCount(player, LANDING_BUBBLES);
  /* The burst takes as long whatever the count, so big bodies boil harder rather than longer */
  for (let i = 0; i < count; i++) riseBubble(player, (i * 45 * LANDING_BUBBLES) / count);
}

/** A poison tick: a few bubbles, so you can see it still working. Visual only. */
export function playPoisonTick(player: Player) {
  if (!player?.scene) return;
  const count = scaledCount(player, TICK_BUBBLES);
  for (let i = 0; i < count; i++) riseBubble(player, (i * 90 * TICK_BUBBLES) / count);
}
