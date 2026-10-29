import Phaser from "phaser";
import type { Player } from "./player";

/** Size of the snapshot around the character, in pixels. Big enough for bosses. */
const SNAPSHOT_SIZE = 128;
const FLASH_MS = 70;
const DISSOLVE_MS = 750;
/** How much the top of the body leads the dissolve (0 = pure dither, 1 = a straight wipe). */
const HEIGHT_BIAS = 0.35;
/** Share of the body's pixels that float away as they vanish; the rest just disappear. */
const FLOAT_CHANCE = 0.25;
const SPAWN_MS = 650;

/** A 4x4 ordered-dither matrix: pixels vanish in a checkered, retro pattern instead of fading. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** The body layers that make up a character's look, without the bars, name or shadow. */
function getBodyLayers(player: Player) {
  const { handLeft, handRight, helmet } = player;
  const layers: Phaser.GameObjects.GameObject[] = [
    player.chest,
    player.skin,
    player.face,
    player.whiskers,
    player.hair,
  ];
  layers.push(player.accessory, player.armor, player.boots, player.gloves, player.pants);
  layers.push(helmet, handLeft, handRight);
  return layers.filter(
    (layer): layer is Phaser.GameObjects.Sprite => !!(layer as Phaser.GameObjects.Sprite)?.visible,
  );
}

/**
 * Snapshots a dying character's body and dissolves it pixel by pixel in an ordered dither,
 * flashing first. Call before the body is hidden. Visual only.
 */
export function playDeathDissolve(player: Player) {
  const { scene } = player;
  if (!scene) return;
  const snapshot = scene.add.renderTexture(player.x, player.y, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
  snapshot.setDepth(player.depth + 1);
  drawBody(snapshot, player);
  let pixels: Uint8ClampedArray | undefined;
  snapshot.snapshot((image) => {
    if (image instanceof HTMLImageElement) pixels = readPixels(image);
  });
  snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);

  const order = getDissolveOrder();
  const eraser = scene.make.graphics({}, false).fillStyle(0xffffff);
  let erased = 0;

  scene.time.delayedCall(FLASH_MS, () => {
    snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
    scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: DISSOLVE_MS,
      onUpdate: (tween) => {
        const target = Math.floor(tween.progress * order.length);
        if (target <= erased) return;
        eraser.clear().fillStyle(0xffffff);
        for (; erased < target; erased++) {
          const index = order[erased];
          const x = index % SNAPSHOT_SIZE;
          const y = Math.floor(index / SNAPSHOT_SIZE);
          eraser.fillRect(x, y, 1, 1);
          if (pixels && pixels[index * 4 + 3] > 0 && Math.random() < FLOAT_CHANCE) {
            floatPixel(snapshot, x, y, pixels, index);
          }
        }
        snapshot.erase(eraser).render();
      },
      onComplete: () => {
        eraser.destroy();
        snapshot.destroy();
      },
    });
  });
}

/** Every pixel index, sorted by when it vanishes: dither threshold, top rows a little earlier. */
let dissolveOrder: number[] | undefined;
function getDissolveOrder() {
  if (dissolveOrder) return dissolveOrder;
  const thresholds: { index: number; at: number }[] = [];
  for (let y = 0; y < SNAPSHOT_SIZE; y++) {
    for (let x = 0; x < SNAPSHOT_SIZE; x++) {
      const dither = BAYER[(y % 4) * 4 + (x % 4)] / 16;
      const height = y / SNAPSHOT_SIZE;
      const at = dither * (1 - HEIGHT_BIAS) + height * HEIGHT_BIAS + Math.random() * 0.04;
      thresholds.push({ index: y * SNAPSHOT_SIZE + x, at });
    }
  }
  thresholds.sort((a, b) => a.at - b.at);
  dissolveOrder = thresholds.map((threshold) => threshold.index);
  return dissolveOrder;
}

/** The snapshot's RGBA bytes, row by row, so dissolving pixels keep their colour. */
function readPixels(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SNAPSHOT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, SNAPSHOT_SIZE, SNAPSHOT_SIZE).data;
}

/** Lifts one of the body's own pixels off the snapshot and floats it up as it fades. */
function floatPixel(
  snapshot: Phaser.GameObjects.RenderTexture,
  x: number,
  y: number,
  pixels: Uint8ClampedArray,
  index: number,
) {
  const { scene } = snapshot;
  const [r, g, b] = pixels.subarray(index * 4, index * 4 + 3);
  const half = SNAPSHOT_SIZE / 2;
  const color = Phaser.Display.Color.GetColor(r, g, b);
  const mote = scene.add.rectangle(
    snapshot.x - half + x + 0.5,
    snapshot.y - half + y + 0.5,
    1,
    1,
    color,
  );
  mote.setDepth(snapshot.depth + 1);
  scene.tweens.add({
    targets: mote,
    y: mote.y - Phaser.Math.Between(6, 18),
    x: mote.x + Phaser.Math.Between(-2, 2),
    alpha: 0,
    duration: Phaser.Math.Between(350, 700),
    ease: "Sine.easeOut",
    onComplete: () => mote.destroy(),
  });
}

/** Draws the character's visible body layers, centred, into a snapshot. */
function drawBody(
  target: Phaser.GameObjects.RenderTexture | Phaser.Textures.DynamicTexture,
  player: Player,
) {
  const half = SNAPSHOT_SIZE / 2;
  /* WebGL adds the offset to each layer's own position, so this places them as in the rig */
  target.draw(getBodyLayers(player), half + player.rig.x, half + player.rig.y);
  target.render();
}

/**
 * The death dissolve in reverse: a (re)spawning character's body fills in pixel by pixel, from the
 * feet up. Visual only.
 */
export function playSpawnDissolve(player: Player) {
  const { scene } = player;
  if (!scene) return;
  /* Hidden straight away, so the body never shows whole before the reveal */
  player.rig.setAlpha(0);
  /* Wait a frame so the body has its textures and pose before the snapshot */
  scene.events.once("postupdate", () => {
    if (!player.active) return void player.rig.setAlpha(1);
    const half = SNAPSHOT_SIZE / 2;
    const id = Phaser.Utils.String.UUID();
    /* The finished body, and a cover over the pixels not revealed yet */
    const body = scene.textures.addDynamicTexture(`spawn-body-${id}`, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
    const cover = scene.textures.addDynamicTexture(
      `spawn-cover-${id}`,
      SNAPSHOT_SIZE,
      SNAPSHOT_SIZE,
    );
    if (!body || !cover) return void player.rig.setAlpha(1);
    drawBody(body, player);
    cover.fill(0xffffff).render();

    const shown = scene.add.renderTexture(player.x, player.y, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
    shown.setDepth(player.depth + 1);

    const order = getDissolveOrder();
    const eraser = scene.make.graphics({}, false);
    let revealed = 0;
    const finish = () => {
      player.rig.setAlpha(1);
      eraser.destroy();
      shown.destroy();
      body.destroy();
      cover.destroy();
    };

    scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: SPAWN_MS,
      onUpdate: (tween) => {
        if (!player.active || player.state.isDead) return tween.complete();
        const target = Math.floor(tween.progress * order.length);
        if (target > revealed) {
          eraser.clear().fillStyle(0xffffff);
          /* Reveal in reverse of the death order, so the feet come in first */
          for (; revealed < target; revealed++) {
            const index = order[order.length - 1 - revealed];
            eraser.fillRect(index % SNAPSHOT_SIZE, Math.floor(index / SNAPSHOT_SIZE), 1, 1);
          }
          cover.erase(eraser).render();
        }
        shown.setPosition(player.x, player.y).setDepth(player.depth + 1);
        shown.clear().stamp(body.key, undefined, half, half).erase(cover.key, half, half).render();
      },
      onComplete: finish,
    });
  });
}
