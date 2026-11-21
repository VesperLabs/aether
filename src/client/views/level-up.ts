import Phaser from "phaser";
import { playAudio } from "@/client/audio/play-audio";
import { feetOffsetOf } from "./feet";
import { addLight } from "./lights";
import { bakePixelTexture, getPixelTexture } from "./pixel-texture";
import type { Player } from "./player";

const PILLAR_TEXTURE = "level-up-pillar";
const RING_TEXTURE = "level-up-ring";
const SPARK_TEXTURE = "level-up-spark";

const GOLD = 0xffd84a;
const PALE_GOLD = 0xfff2b0;

/** The whole effect, from the first ring to the last spark, in ms. */
const DURATION_MS = 2200;
const PILLAR_HEIGHT = 150;
const PILLAR_WIDTH = 30;
const SPARK_COUNT = 28;
const LIGHT_RADIUS = 90;

/** Beam and pool are drawn at this many texels per world pixel, so gradients stay smooth. */
const TEXTURE_DETAIL = 4;
const POOL_TEXTURE = "level-up-pool";

/** A texture painted with canvas gradients once per game and reused by key. */
function bakeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return key;
  draw(texture.getContext(), width, height);
  texture.refresh().setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/**
 * A column of light: a white-hot core in a soft gold body, brightest at the feet and easing to
 * nothing well before the top, so it never ends in a cut.
 */
function ensurePillarTexture(scene: Phaser.Scene) {
  const width = PILLAR_WIDTH * TEXTURE_DETAIL;
  const height = PILLAR_HEIGHT * TEXTURE_DETAIL;
  return bakeCanvasTexture(scene, PILLAR_TEXTURE, width, height, (ctx) => {
    const across = ctx.createLinearGradient(0, 0, width, 0);
    across.addColorStop(0, "rgba(201,138,26,0)");
    across.addColorStop(0.2, "rgba(201,138,26,0.35)");
    across.addColorStop(0.38, "rgba(255,216,74,0.8)");
    across.addColorStop(0.47, "rgba(255,250,225,1)");
    across.addColorStop(0.53, "rgba(255,250,225,1)");
    across.addColorStop(0.62, "rgba(255,216,74,0.8)");
    across.addColorStop(0.8, "rgba(201,138,26,0.35)");
    across.addColorStop(1, "rgba(201,138,26,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, width, height);
    /* Fade up the column: solid low down, gone by the top */
    const up = ctx.createLinearGradient(0, height, 0, 0);
    up.addColorStop(0, "rgba(0,0,0,0.6)");
    up.addColorStop(0.06, "rgba(0,0,0,1)");
    up.addColorStop(0.35, "rgba(0,0,0,0.75)");
    up.addColorStop(0.75, "rgba(0,0,0,0.2)");
    up.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = up;
    ctx.fillRect(0, 0, width, height);
  });
}

/** A round pool of light on the ground, soft-edged, that the column rises out of. */
function ensurePoolTexture(scene: Phaser.Scene) {
  const size = 64 * TEXTURE_DETAIL;
  return bakeCanvasTexture(scene, POOL_TEXTURE, size, size, (ctx) => {
    const half = size / 2;
    const glow = ctx.createRadialGradient(half, half, 0, half, half, half);
    glow.addColorStop(0, "rgba(255,250,225,1)");
    glow.addColorStop(0.25, "rgba(255,216,74,0.8)");
    glow.addColorStop(0.6, "rgba(201,138,26,0.3)");
    glow.addColorStop(1, "rgba(201,138,26,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  });
}

/** A flat pixel ring on the ground: an ellipse outline with a bright inner edge. */
function ensureRingTexture(scene: Phaser.Scene) {
  return bakePixelTexture(scene, RING_TEXTURE, 48, 16, (g) => {
    g.lineStyle(2, GOLD).strokeEllipse(24, 8, 44, 13);
    g.lineStyle(1, PALE_GOLD).strokeEllipse(24, 8, 40, 10);
  });
}

/** A 5x5 four-pointed sparkle. */
function ensureSparkTexture(scene: Phaser.Scene) {
  return bakePixelTexture(scene, SPARK_TEXTURE, 5, 5, (g) => {
    g.fillStyle(GOLD).fillRect(2, 0, 1, 5).fillRect(0, 2, 5, 1);
    g.fillStyle(0xffffff).fillRect(2, 1, 1, 3).fillRect(1, 2, 3, 1);
  });
}

/** Where the character's feet are drawn, in its container: the bottom of the body art. */
function feetOf(player: Player) {
  return { x: Math.round(player.rig.x), y: Math.round(player.rig.y + feetOffsetOf(player)) };
}

/** Expanding rings at the feet, under the body. */
function spawnRings(scene: Phaser.Scene, player: Player, scale: number) {
  const key = ensureRingTexture(scene);
  const feet = feetOf(player);
  [0, 220, 440].forEach((delay, index) => {
    const ring = scene.add
      .image(feet.x, feet.y, key)
      .setScale(0.2 * scale)
      .setAlpha(0);
    player.addAt(ring, 0);
    scene.tweens.add({
      targets: ring,
      delay,
      scale: (1.3 + index * 0.35) * scale,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  });
}

/** The column of light: shoots up, holds, then narrows and fades. Behind and in front of the body. */
function spawnPillar(scene: Phaser.Scene, player: Player, scale: number) {
  const key = ensurePillarTexture(scene);
  const full = scale / TEXTURE_DETAIL;
  const add = Phaser.BlendModes.ADD;
  const feet = feetOf(player);
  const back = scene.add.image(feet.x, feet.y, key).setOrigin(0.5, 1).setBlendMode(add);
  const front = scene.add.image(feet.x, feet.y, key).setOrigin(0.5, 1).setBlendMode(add);
  player.addAt(back, 0);
  player.add(front);
  for (const [image, alpha] of [
    [back, 0.95],
    [front, 0.3],
  ] as const) {
    image.setScale(0.3 * full, 0).setAlpha(alpha);
    scene.tweens.chain({
      targets: image,
      tweens: [
        { scaleY: full, scaleX: full, duration: 320, ease: "Cubic.easeOut" },
        { scaleX: 0.8 * full, duration: 650, yoyo: true, ease: "Sine.easeInOut" },
        { scaleX: 0, alpha: 0, duration: 600, ease: "Cubic.easeIn" },
      ],
      onComplete: () => image.destroy(),
    });
  }
  /* The pool at the feet: squashed flat on the ground, flares then settles and fades */
  const pool = scene.add
    .image(feet.x, feet.y, ensurePoolTexture(scene))
    .setBlendMode(add)
    .setAlpha(0);
  pool.setScale(0.2 * full, 0.07 * full);
  player.addAt(pool, 0);
  scene.tweens.chain({
    targets: pool,
    tweens: [
      { scaleX: 1.1 * full, scaleY: 0.38 * full, alpha: 1, duration: 260, ease: "Back.easeOut" },
      {
        scaleX: 0.85 * full,
        scaleY: 0.3 * full,
        alpha: 0.75,
        duration: 1100,
        ease: "Sine.easeInOut",
      },
      { alpha: 0, duration: 600, ease: "Cubic.easeIn" },
    ],
    onComplete: () => pool.destroy(),
  });
}

/** Sparks and motes spiralling up around the body, the near half in front of it. */
function spawnSparks(scene: Phaser.Scene, player: Player, scale: number) {
  const spark = ensureSparkTexture(scene);
  const mote = getPixelTexture(scene);
  const feet = feetOf(player);
  for (let index = 0; index < SPARK_COUNT; index++) {
    const isSpark = index % 3 === 0;
    const image = scene.add.image(0, 0, isSpark ? spark : mote).setAlpha(0);
    if (!isSpark) image.setTint(index % 2 ? GOLD : PALE_GOLD).setScale(scale);
    else image.setScale(scale);
    const startAngle = (index / SPARK_COUNT) * Math.PI * 2 * 3;
    const radius = (10 + Math.random() * 6) * scale;
    const rise = (50 + Math.random() * 40) * scale;
    const delay = 150 + Math.random() * 900;
    const duration = 900 + Math.random() * 500;
    const turns = 0.6 + Math.random() * 0.5;
    player.add(image);
    scene.tweens.addCounter({
      delay,
      duration,
      onStart: () => image.setAlpha(1),
      onUpdate: (tween) => {
        const t = tween.getValue() as number;
        const angle = startAngle + t * turns * Math.PI * 2;
        const isFront = Math.sin(angle) > 0;
        /* Whole pixels, so they stay crisp */
        image.setPosition(
          feet.x + Math.round(Math.cos(angle) * radius * (1 - t * 0.5)),
          feet.y + Math.round(Math.sin(angle) * radius * 0.3 - rise * t),
        );
        image.setAlpha((1 - t * t) * (isFront ? 1 : 0.5));
        /* Pass behind the body on the far side of the circle */
        const index = player.getIndex(image);
        if (isFront && index !== player.length - 1) player.bringToTop(image);
        else if (!isFront && index !== 0) player.sendToBack(image);
      },
      onComplete: () => image.destroy(),
    });
  }
}

/** "LEVEL UP!" that pops in over the head and floats away. */
function spawnBanner(scene: Phaser.Scene, player: Player, level?: number) {
  const text = scene.add
    .bitmapText(0, player.headY - 14, "nin-light", level ? `LEVEL ${level}!` : "LEVEL UP!", 20)
    .setOrigin(0.5, 1)
    .setTint(GOLD)
    .setScale(0);
  player.add(text);
  scene.tweens.chain({
    targets: text,
    tweens: [
      { scale: 1, duration: 260, ease: "Back.easeOut" },
      { y: text.y - 18, duration: 1300, ease: "Sine.easeOut" },
      { y: text.y - 26, alpha: 0, duration: 400, ease: "Cubic.easeIn" },
    ],
    onComplete: () => text.destroy(),
  });
}

/** A warm light that swells and fades with the pillar, so the effect lights up the night too. */
function spawnLight(scene: Phaser.Scene, player: Player) {
  const light = { intensity: 0 };
  const removeLight = addLight({
    position: () => (player.active ? { x: player.x, y: player.y - 16 } : undefined),
    radius: LIGHT_RADIUS,
    color: GOLD,
    get intensity() {
      return light.intensity;
    },
  });
  scene.tweens.chain({
    targets: light,
    tweens: [
      { intensity: 1, duration: 300, ease: "Cubic.easeOut" },
      { intensity: 0, delay: 700, duration: 1000, ease: "Sine.easeIn" },
    ],
    onComplete: removeLight,
  });
  scene.time.delayedCall(DURATION_MS + 500, removeLight);
}

/**
 * The level-up effect every player in the room sees: rings burst at the feet, a column of gold light
 * shoots up, sparks spiral up the body and the new level pops over the head. Visual only.
 */
export function playLevelUp(player: Player, level?: number) {
  const { scene } = player;
  if (!scene || !player.active) return;
  const scale = player.proScale || 1;
  spawnRings(scene, player, scale);
  spawnPillar(scene, player, scale);
  spawnSparks(scene, player, scale);
  spawnBanner(scene, player, level);
  spawnLight(scene, player);
  playAudio({ scene, audioKey: "spell-holy", caster: player });
}
