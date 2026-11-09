import Phaser from "phaser";

/**
 * A texture drawn once with a graphics and reused by key, so many small effect particles are cheap,
 * batched images instead of a graphics object each.
 */
export function bakePixelTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
  return key;
}

/** A 1x1 white pixel, for flecks tinted to any colour. */
export function getPixelTexture(scene: Phaser.Scene) {
  return bakePixelTexture(scene, "fx-pixel", 1, 1, (g) =>
    g.fillStyle(0xffffff).fillRect(0, 0, 1, 1),
  );
}
