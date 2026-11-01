import Phaser from "phaser";
import { ELEMENT_EFFECTS } from "@/ui/item/element-effects";
import { ElementSim, type EffectPixel, type ToLayer } from "@/ui/item/element-sim";
import { bladePixels, findEdgePixels } from "@/ui/item/edge-pixels";

const BORDER_OFFSET = 1;
/**
 * How much of the weapon's movement its particles share: they trail behind a swing a little,
 * like physics, but stay close to the blade instead of scattering across the screen.
 */
const PARTICLE_FOLLOW = 0.8;

/**
 * Blade edge pixels per frame and grip, relative to the centre of the untrimmed frame the sprite
 * draws.
 */
const EDGE_PIXELS = new Map<string, { x: number; y: number }[]>();

function getEdgePixels(frame: Phaser.Textures.Frame, grip: { x: number; y: number }) {
  const cacheKey = `${frame.texture.key}:${frame.name}:${grip.x},${grip.y}`;
  const cached = EDGE_PIXELS.get(cacheKey);
  if (cached) return cached;

  let edges: { x: number; y: number }[] = [];
  const { cutX, cutY, cutWidth: w, cutHeight: h } = frame;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx && w > 0 && h > 0) {
    ctx.drawImage(frame.source.image as CanvasImageSource, cutX, cutY, w, h, 0, 0, w, h);
    // Trimmed atlas frames sit at frame.x/y inside the untrimmed size the sprite draws at
    edges = findEdgePixels(ctx.getImageData(0, 0, w, h).data, w, h).map(({ x, y }) => ({
      x: frame.x + x + 0.5 - frame.realWidth / 2,
      y: frame.y + y + 0.5 - frame.realHeight / 2,
    }));
    edges = bladePixels(edges, grip);
  }
  EDGE_PIXELS.set(cacheKey, edges);
  return edges;
}

/**
 * A held weapon. Weapons with elemental damage get a 1px outline (four tinted copies behind
 * the sprite) and the pixels of `ElementSim` (flames, drips, bolts, vines, twinkles), the same
 * simulation the inventory and wiki draw. With several elements they take turns.
 */
export class WeaponSprite extends Phaser.GameObjects.Container {
  declare borderSprites: Phaser.GameObjects.Sprite[];
  declare mainSprite: Phaser.GameObjects.Sprite;
  declare elements: string[];
  declare sim: ElementSim;
  /** The sim's light, added to what's behind it. */
  declare glowGraphics: Phaser.GameObjects.Graphics;
  /** The sim's solid pixels. */
  declare solidGraphics: Phaser.GameObjects.Graphics;
  /** Where the weapon is held, from the frame's centre: effects come off the blade, away from it. */
  declare grip: { x: number; y: number };
  /** Where the weapon was last frame, to carry its particles along with it. */
  declare lastPosition: { x: number; y: number } | null;
  constructor(scene: Phaser.Scene, x: number, y: number, key: string, frame?: string | number) {
    super(scene, x, y);

    this.borderSprites = [];
    this.elements = [];
    this.sim = new ElementSim([]);
    this.grip = { x: 0, y: 0 };
    this.lastPosition = null;

    const offsets = [
      [0, -BORDER_OFFSET],
      [BORDER_OFFSET, 0],
      [0, BORDER_OFFSET],
      [-BORDER_OFFSET, 0],
    ];
    for (const [ox, oy] of offsets) {
      const borderSprite = this.scene.add.sprite(ox, oy, key, frame);
      borderSprite.setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0);
      this.borderSprites.push(borderSprite);
      this.add(borderSprite);
    }

    this.mainSprite = scene.add.sprite(0, 0, key, frame);
    this.add(this.mainSprite);
    this.glowGraphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.solidGraphics = scene.add.graphics();
    scene.add.existing(this);

    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  setElements(elements: string[] = []) {
    const known = elements.filter((element) => ELEMENT_EFFECTS[element]);
    if (known.join() === this.elements.join()) return;
    this.elements = known;
    this.sim = new ElementSim(known.map((element) => ELEMENT_EFFECTS[element]));
    if (known.length === 0) this.borderSprites.forEach((borderSprite) => borderSprite.setAlpha(0));
  }
  /** Held-weapon frames have the grip at their centre; a cropped frame (a preview) says where. */
  setGrip(x: number, y: number) {
    this.grip = { x, y };
    return this;
  }
  setTint(tint: number) {
    this.mainSprite.setTint(tint);
  }
  setFlipX(flip: boolean) {
    this.mainSprite.setFlipX(flip);
    this.borderSprites.forEach((borderSprite) => borderSprite.setFlipX(flip));
  }
  setTexture(texture: string) {
    this.mainSprite.setTexture(texture);
    this.borderSprites.forEach((borderSprite) => borderSprite.setTexture(texture));
  }
  setFlipY(flip: boolean) {
    this.mainSprite.setFlipY(flip);
    this.borderSprites.forEach((borderSprite) => borderSprite.setFlipY(flip));
  }
  /**
   * Keeps the effect pixels just behind the weapon and in front of everything else: in the
   * weapon's own container (a player's rig, the loot), right before the weapon, wherever the rig
   * reorders its layers. They're drawn in that container's space, so they move with the player
   * but still trail behind a swing. Returns the container, or null when there's none.
   */
  placeEffects() {
    const parent = this.parentContainer;
    const effects = [this.glowGraphics, this.solidGraphics];
    if (!parent) {
      effects.forEach((effect) => effect.setDepth(this.depth - 0.001));
      return null;
    }
    for (const effect of effects) {
      if (effect.parentContainer === parent && parent.getIndex(effect) < parent.getIndex(this))
        continue;
      effect.parentContainer?.remove(effect);
      parent.addAt(effect, parent.getIndex(this));
    }
    return parent;
  }
  /** Whether the weapon is on screen and drawn: hidden or off-screen weapons don't emit. */
  isShown() {
    let obj: Phaser.GameObjects.Container | null = this;
    while (obj) {
      if (!obj.visible || obj.alpha === 0) return false;
      obj = obj.parentContainer;
    }
    const { tx: x, ty: y } = this.mainSprite.getWorldTransformMatrix();
    return this.scene.cameras.main.worldView.contains(x, y);
  }
  update(time: number, delta: number) {
    this.glowGraphics.clear();
    this.solidGraphics.clear();
    if (this.elements.length === 0) return;

    const shown = this.isShown();
    if (!shown) this.lastPosition = null;
    const matrix = this.mainSprite.getWorldTransformMatrix();
    const rootMatrix = this.placeEffects()?.getWorldTransformMatrix();
    const flipX = this.mainSprite.flipX ? -1 : 1;
    const flipY = this.mainSprite.flipY ? -1 : 1;
    const toLayer: ToLayer = (pixel) => {
      const world = matrix.transformPoint(pixel.x * flipX, pixel.y * flipY);
      if (!rootMatrix) return { x: world.x, y: world.y };
      const { x, y } = rootMatrix.applyInverse(world.x, world.y);
      return { x, y };
    };

    if (shown) {
      this.sim.setBlade(getEdgePixels(this.mainSprite.frame, this.grip), this.grip);
      // Live particles share most of the weapon's movement, so they trail but stay close
      const at = toLayer({ x: 0, y: 0 });
      const last = this.lastPosition ?? at;
      this.sim.shift((at.x - last.x) * PARTICLE_FOLLOW, (at.y - last.y) * PARTICLE_FOLLOW);
      this.lastPosition = at;
    }
    this.sim.step(time, delta, toLayer, shown);

    this.sim.outline().forEach((frame, side) => {
      this.borderSprites[side]
        .setTint(frame.color)
        .setTintMode(Phaser.TintModes.FILL)
        .setAlpha(frame.alpha);
    });
    if (shown) this.sim.pixels(toLayer).forEach((pixel) => this.drawPixel(pixel));
  }
  drawPixel({ x, y, width, height, color, alpha, glow }: EffectPixel) {
    (glow ? this.glowGraphics : this.solidGraphics)
      .fillStyle(color, alpha)
      .fillRect(x, y, width, height);
  }
  destroy(fromScene?: boolean) {
    if (this.scene) this.scene.events.off("update", this.update, this);
    this.glowGraphics?.destroy();
    this.solidGraphics?.destroy();
    super.destroy(fromScene);
  }
}
