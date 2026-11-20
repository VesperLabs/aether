import Phaser from "phaser";

/** Under the surface the body fades out in these steps, each `FADE_BAND` px tall at scale 1, then is gone. */
const FADE_ALPHAS = [0.6, 0.35, 0.15];
const FADE_BAND = 3;

/** The faded copies of each body layer, one per step, made the first time it wades. */
const bands = new WeakMap<Phaser.GameObjects.Sprite, Phaser.GameObjects.Sprite[]>();

/** What each layer last looked like when its bands were drawn, so an unchanged frame skips the work. */
const lastLook = new WeakMap<Phaser.GameObjects.Sprite, string>();

/** Everything about `layer` and its waterline that the cut and the bands depend on. */
function lookOf(layer: Phaser.GameObjects.Sprite, waterline: number, scale: number) {
  return [
    layer.texture.key,
    layer.frame.name,
    layer.x,
    layer.y,
    layer.scaleX,
    layer.scaleY,
    layer.originX,
    layer.originY,
    layer.flipX,
    layer.flipY,
    layer.angle,
    layer.tintTopLeft,
    layer.alpha,
    layer.visible,
    waterline,
    scale,
  ].join("|");
}

/** Shows only the rows of `sprite` between `from` and `to` (in its container's coordinates). */
function cropRows(sprite: Phaser.GameObjects.Sprite, from: number, to: number) {
  const { width, height } = sprite.frame;
  const top = sprite.y - sprite.displayOriginY * sprite.scaleY;
  const start = Phaser.Math.Clamp((from - top) / sprite.scaleY, 0, height);
  const end = Phaser.Math.Clamp((to - top) / sprite.scaleY, 0, height);
  sprite.setCrop(0, start, width, Math.max(end - start, 0));
}

function bandsOf(layer: Phaser.GameObjects.Sprite) {
  let copies = bands.get(layer);
  if (!copies) {
    const rig = layer.parentContainer;
    copies = FADE_ALPHAS.map(() => {
      const copy = layer.scene.add.sprite(0, 0, layer.texture.key, layer.frame.name);
      rig?.add(copy);
      return copy;
    });
    layer.once(Phaser.GameObjects.Events.DESTROY, () => copies?.forEach((c) => c.destroy()));
    bands.set(layer, copies);
  }
  return copies;
}

/** Makes `copy` draw exactly like `layer`: same frame, place, size, facing and tint. */
function mirror(copy: Phaser.GameObjects.Sprite, layer: Phaser.GameObjects.Sprite, alpha: number) {
  if (copy.texture.key !== layer.texture.key) copy.setTexture(layer.texture.key);
  if (copy.frame.name !== layer.frame.name) copy.setFrame(layer.frame.name);
  copy
    .setPosition(layer.x, layer.y)
    .setScale(layer.scaleX, layer.scaleY)
    .setOrigin(layer.originX, layer.originY)
    .setFlip(layer.flipX, layer.flipY)
    .setAngle(layer.angle)
    .setTint(layer.tintTopLeft)
    .setAlpha(layer.alpha * alpha)
    .setVisible(layer.visible);
  /* Right above its layer, so the stacking of the body's layers carries over */
  const rig = layer.parentContainer;
  if (rig && rig.getIndex(copy) !== rig.getIndex(layer) + 1) rig.moveAbove(copy, layer);
}

/** The faded copies under `layer`'s waterline that are showing, so a snapshot of the body has them. */
export function getShownBands(layer: Phaser.GameObjects.Sprite) {
  return (bands.get(layer) ?? []).filter((copy) => copy.visible);
}

/**
 * Cuts a body layer off at the waterline and fades what's under it out in a few pixel steps,
 * erasing it so the real water shows through instead of painting over it. Undefined puts the
 * whole layer back.
 */
export function fadeBelow(
  layer: Phaser.GameObjects.Sprite,
  waterline: number | undefined,
  scale: number,
) {
  if (waterline === undefined) {
    if (!lastLook.has(layer)) return;
    lastLook.delete(layer);
    if (layer.isCropped) layer.setCrop();
    bands.get(layer)?.forEach((copy) => copy.setVisible(false));
    return;
  }
  const look = lookOf(layer, waterline, scale);
  if (lastLook.get(layer) === look) return;
  lastLook.set(layer, look);
  cropRows(layer, -Infinity, waterline);
  const band = FADE_BAND * scale;
  bandsOf(layer).forEach((copy, i) => {
    mirror(copy, layer, FADE_ALPHAS[i]);
    cropRows(copy, waterline + band * i, waterline + band * (i + 1));
  });
}
