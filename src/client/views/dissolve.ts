import Phaser from "phaser";
import type { Player } from "./player";

/** Size of the snapshot around the character, in pixels. Big enough for bosses. */
const SNAPSHOT_SIZE = 128;
const FLASH_MS = 70;
const DISSOLVE_MS = 750;
/** How much the top of the body leads the dissolve (0 = pure dither, 1 = a straight wipe). */
const HEIGHT_BIAS = 0.35;
const MOTE_COUNT = 14;

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
  const half = SNAPSHOT_SIZE / 2;
  const snapshot = scene.add.renderTexture(player.x, player.y, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
  snapshot.setDepth(player.depth + 1);
  /* WebGL adds the offset to each layer's own position, so this places them as in the rig */
  snapshot.draw(getBodyLayers(player), half + player.rig.x, half + player.rig.y);
  snapshot.render();
  snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);

  const order = getDissolveOrder();
  const eraser = scene.make.graphics({}, false).fillStyle(0xffffff);
  let erased = 0;

  scene.time.delayedCall(FLASH_MS, () => {
    snapshot.setTint(0xffffff).setTintMode(Phaser.TintModes.MULTIPLY);
    spawnMotes(scene, player.x, player.y + player.bodyOffsetY, snapshot.depth + 1);
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
          eraser.fillRect(index % SNAPSHOT_SIZE, Math.floor(index / SNAPSHOT_SIZE), 1, 1);
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

/** Single pixels that float up out of the body as it dissolves. */
function spawnMotes(scene: Phaser.Scene, x: number, y: number, depth: number) {
  for (let i = 0; i < MOTE_COUNT; i++) {
    const mote = scene.add.rectangle(
      x + Phaser.Math.Between(-8, 8),
      y + Phaser.Math.Between(-10, 8),
      1,
      1,
      0xffffff,
    );
    mote.setDepth(depth);
    scene.tweens.add({
      targets: mote,
      y: mote.y - Phaser.Math.Between(10, 22),
      x: mote.x + Phaser.Math.Between(-3, 3),
      alpha: 0,
      delay: Phaser.Math.Between(0, DISSOLVE_MS / 2),
      duration: Phaser.Math.Between(400, 800),
      onComplete: () => mote.destroy(),
    });
  }
}
