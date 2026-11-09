import Phaser from "phaser";
import type { ActiveBuff } from "@/rules/buffs";

const Sprite = Phaser.GameObjects.Sprite;

/** Spell art is 32px; beside the name it shows at this size, in world pixels. */
const BUFF_ICON_SIZE = 12;
/** Scale from spell art to the row: the art is trimmed to its drawn pixels, then shown at this. */
const ICON_SCALE = BUFF_ICON_SIZE / 32;
/** Name of the frame cut to an icon's drawn pixels, added to each spell texture once. */
const TRIMMED_FRAME = "buff-rack-trimmed";
/** Gap between icons, and between the name and the first icon (plus the font's blank last column). */
const ICON_GAP = 1;
const NAME_GAP = 2;
/** A buff listed within this long of its landing is new, not a refresh of one already on them. */
const FRESH_MS = 500;

interface Slot {
  name: string | undefined;
  sprite: Phaser.GameObjects.Sprite;
  /** Scene time it joined the row. */
  addedAt: number;
}

/**
 * A character's buffs as a row of icons right after its name, shown on hover; the name stays
 * centred. A buff landing on the body joins the row only once its landing is over, so it never
 * shows in both places.
 */
export class BuffRack extends Phaser.GameObjects.Container {
  declare buffs: Slot[];
  /** The name the row follows. */
  declare nameText: Phaser.GameObjects.BitmapText;
  /** Whether the row shows (hovered). */
  shown = false;
  /** Buffs still landing on the body, by how many landings: kept out of the row until done. */
  landing = new Map<string, number>();
  constructor(
    scene: Phaser.Scene,
    y: number,
    nameText: Phaser.GameObjects.BitmapText,
    buffs: ActiveBuff[] = [],
  ) {
    super(scene, 0, y);
    this.nameText = nameText;
    this.buffs = [];
    buffs.forEach((buff) => this.addBuff(buff));
    this.layout();
  }

  addBuff(buff: ActiveBuff) {
    const key = `spell-${buff.name}`;
    const sprite = new Sprite(this.scene, 0, 0, key, getTrimmedFrame(this.scene, key));
    sprite.setScale(ICON_SCALE);
    this.buffs.push({ name: buff.name, sprite, addedAt: this.scene.time.now });
    this.add(sprite);
    this.layout();
  }

  removeBuff(buff: Slot) {
    const index = this.buffs.findIndex((b) => b.name === buff.name);
    if (index !== -1) {
      this.remove(this.buffs[index].sprite, true);
      this.buffs.splice(index, 1);
    }
    this.layout();
  }

  /**
   * Lines the icons that are done landing up after the name (centred alone when the name is
   * hidden); the rest wait, hidden.
   */
  layout() {
    const ready = this.buffs.filter((b) => !this.landing.has(b.name as string));
    const { nameText } = this;
    /* Laid out by each icon's drawn width, so they sit close whatever padding the art has */
    const widths = ready.map((slot) => slot.sprite.displayWidth);
    const total = widths.reduce((sum, width) => sum + width, 0) + ICON_GAP * (ready.length - 1);
    let left = nameText.visible ? nameText.x + nameText.width + NAME_GAP : -total / 2;
    for (const slot of this.buffs) slot.sprite.setVisible(false);
    ready.forEach((slot, index) => {
      slot.sprite.setVisible(true);
      slot.sprite.x = Math.round(left + widths[index] / 2);
      left += widths[index] + ICON_GAP;
    });
  }

  /** Shows the row (on hover) or hides it. */
  setShown(shown: boolean) {
    this.shown = shown;
    this.setVisible(shown);
    /* The name may have just shown, hidden or changed */
    if (shown) this.layout();
  }

  /**
   * Keeps a buff out of the row while its landing plays on the body. A buff already listed (a
   * slow on a slow) keeps its icon: returns false then, and there is nothing to release.
   */
  holdSlot(name: string) {
    /* Listed a moment ago is this same landing's buff arriving first, not one already on them */
    const slot = this.buffs.find((buff) => buff.name === name);
    const isRefresh = !!slot && this.scene.time.now - slot.addedAt > FRESH_MS;
    if (isRefresh && !this.landing.has(name)) return false;
    this.landing.set(name, (this.landing.get(name) ?? 0) + 1);
    this.layout();
    return true;
  }

  /** The landing is over: the icon joins the row. */
  releaseSlot(name: string) {
    const count = (this.landing.get(name) ?? 0) - 1;
    if (count > 0) this.landing.set(name, count);
    else this.landing.delete(name);
    if (this.active) this.layout();
  }

  compareBuffs(buffs: ActiveBuff[]) {
    const buffNames = buffs.map((buff) => buff.name);
    [...this.buffs].forEach((buff) => {
      if (!buffNames.includes(buff.name)) this.removeBuff(buff);
    });
    buffs.forEach((buff) => {
      if (!this.buffs.some((b) => b.name === buff.name)) this.addBuff(buff);
    });
  }
}

/**
 * A frame of the spell texture cut to its drawn (non-transparent) pixels, made once per texture.
 * Falls back to the whole image when the pixels can't be read.
 */
function getTrimmedFrame(scene: Phaser.Scene, key: string) {
  const texture = scene.textures.get(key);
  if (texture.has(TRIMMED_FRAME)) return TRIMMED_FRAME;
  const source = texture.getSourceImage() as CanvasImageSource & { width: number; height: number };
  const { width, height } = source;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context || !width || !height) return undefined;
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  let [minX, minY, maxX, maxY] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return undefined;
  texture.add(TRIMMED_FRAME, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
  return TRIMMED_FRAME;
}
