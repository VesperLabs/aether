import Phaser from "phaser";
import type { Player } from "./player";

/** Smallest snapshot around a character, in pixels; bigger bodies get one that fits them. */
const MIN_SNAPSHOT_SIZE = 128;
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
 * Side of a square, centred on the character, that holds every body layer (a 150px abomination,
 * a scaled-up wyrm), rounded up to the dither grid.
 */
function getSnapshotSize(player: Player) {
  let reach = 0;
  for (const layer of getBodyLayers(player)) {
    const x = Math.abs(player.rig.x + layer.x) + layer.displayWidth / 2;
    const y = Math.abs(player.rig.y + layer.y) + layer.displayHeight / 2;
    reach = Math.max(reach, x, y);
  }
  return Math.max(MIN_SNAPSHOT_SIZE, Math.ceil((reach * 2) / 4) * 4);
}

/** A snapshot of a character's body, drawn where it stands, above it. Visual only. */
export function snapshotBody(player: Player) {
  const size = getSnapshotSize(player);
  const snapshot = player.scene.add.renderTexture(player.x, player.y, size, size);
  snapshot.setDepth(player.depth + 1);
  drawBody(snapshot, player);
  return snapshot;
}

/**
 * Snapshots a dying character's body and dissolves it pixel by pixel in an ordered dither,
 * flashing first. Call before the body is hidden. Visual only.
 */
export function playDeathDissolve(player: Player) {
  if (!player.scene) return;
  dissolveSnapshot(snapshotBody(player));
}

/**
 * The same dissolve for any one image (a ball, an effect), without the hit flash: it is swapped for
 * a snapshot of itself that pixelates away, in `durationMs`. With `follow`, it keeps moving to where that says, e.g. on
 * the creature a ball rides. Visual only.
 */
export function playObjectDissolve(
  object: Phaser.GameObjects.Image,
  durationMs = DISSOLVE_MS,
  follow?: () => { x: number; y: number },
) {
  const { scene } = object;
  if (!scene) return;
  const size = Math.max(
    MIN_SNAPSHOT_SIZE,
    Math.ceil(Math.max(object.displayWidth, object.displayHeight) / 4) * 4,
  );
  const half = size / 2;
  const snapshot = scene.add.renderTexture(object.x, object.y, size, size);
  snapshot.setDepth(object.depth);
  /* WebGL adds the offset to the object's own position, so this centres it */
  snapshot.draw(object, half - object.x, half - object.y);
  snapshot.render();
  object.destroy();
  if (follow) {
    const move = () => {
      const at = follow();
      snapshot.setPosition(at.x, at.y);
    };
    scene.events.on("update", move);
    snapshot.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off("update", move));
  }
  dissolveSnapshot(snapshot, durationMs, false);
}

/**
 * Erases a snapshot pixel by pixel, some pixels floating off as they go. A body flashes white
 * first, as it is hit; an object just goes.
 */
function dissolveSnapshot(
  snapshot: Phaser.GameObjects.RenderTexture,
  durationMs = DISSOLVE_MS,
  shouldFlash = true,
) {
  const { scene } = snapshot;
  const size = snapshot.width;
  let pixels: Uint8ClampedArray | undefined;
  snapshot.snapshot((image) => {
    if (image instanceof HTMLImageElement) pixels = readPixels(image, size);
  });
  if (shouldFlash) snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);

  const order = getDissolveOrder(size);
  const eraser = scene.make.graphics({}, false).fillStyle(0xffffff);
  let erased = 0;

  scene.time.delayedCall(shouldFlash ? FLASH_MS : 0, () => {
    snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
    scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: durationMs,
      onUpdate: (tween) => {
        const target = Math.floor(tween.progress * order.length);
        if (target <= erased) return;
        eraser.clear().fillStyle(0xffffff);
        for (; erased < target; erased++) {
          const index = order[erased];
          const x = index % size;
          const y = Math.floor(index / size);
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

/**
 * Every pixel index of a `size` square, sorted by when it vanishes: dither threshold, top rows a
 * little earlier. Kept per size, since each takes a moment to build.
 */
const dissolveOrders = new Map<number, number[]>();
function getDissolveOrder(size: number) {
  const cached = dissolveOrders.get(size);
  if (cached) return cached;
  const thresholds: { index: number; at: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dither = BAYER[(y % 4) * 4 + (x % 4)] / 16;
      const height = y / size;
      const at = dither * (1 - HEIGHT_BIAS) + height * HEIGHT_BIAS + Math.random() * 0.04;
      thresholds.push({ index: y * size + x, at });
    }
  }
  thresholds.sort((a, b) => a.at - b.at);
  const order = thresholds.map((threshold) => threshold.index);
  dissolveOrders.set(size, order);
  return order;
}

/** The snapshot's RGBA bytes, row by row, so dissolving pixels keep their colour. */
function readPixels(image: HTMLImageElement, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, size, size).data;
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
  const half = snapshot.width / 2;
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
  const half = target.width / 2;
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
    const size = getSnapshotSize(player);
    const half = size / 2;
    const id = Phaser.Utils.String.UUID();
    /* The finished body, and a cover over the pixels not revealed yet */
    const body = scene.textures.addDynamicTexture(`spawn-body-${id}`, size, size);
    const cover = scene.textures.addDynamicTexture(`spawn-cover-${id}`, size, size);
    if (!body || !cover) return void player.rig.setAlpha(1);
    cover.fill(0xffffff).render();

    const shown = scene.add.renderTexture(player.x, player.y, size, size);
    shown.setDepth(player.depth + 1);

    const order = getDissolveOrder(size);
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
            eraser.fillRect(index % size, Math.floor(index / size), 1, 1);
          }
          cover.erase(eraser).render();
        }
        /* Redrawn each frame, so a character walking out of the reveal walks instead of gliding */
        body.clear();
        drawBody(body, player);
        shown.setPosition(player.x, player.y).setDepth(player.depth + 1);
        shown.clear().stamp(body.key, undefined, half, half).erase(cover.key, half, half).render();
      },
      onComplete: finish,
    });
  });
}
