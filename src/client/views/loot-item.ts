import Phaser from "phaser";
import { getPreviewGrip, resolveAsset } from "@/content";
import type { LootMessage } from "@/network";
import type { SceneMain } from "@/client/scenes/main-scene";
import { tintCanvas } from "@/ui/kit/image-tint";
import type { LootFlyDetail } from "@/client/window-events";
import { deriveElements } from "@/ui/item/weapon-elements";
import { toTint } from "./tint";
import { WeaponSprite } from "./weapon-sprite";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

export class LootItem extends Phaser.GameObjects.Container {
  declare id: string;
  declare item: Item;
  declare lootShadow: Phaser.GameObjects.Sprite;
  declare lootSprite: Phaser.GameObjects.Sprite;
  /** Elemental weapons on the ground glow and give off their elements as when held. */
  declare elementalSprite: WeaponSprite | undefined;
  declare texture: string | undefined;
  declare scene: SceneMain;
  constructor(scene: SceneMain, loot: LootMessage) {
    super(scene, loot.x, loot.y);
    this.scene = scene;
    this.item = loot.item;
    this.id = loot.id;
    this.texture = loot?.texture;
    this.lootSprite = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.scale || 1);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(bodySize, -bodySize, -bodySize);
    this.addLootSprite(loot);
    this.setDepth(95 + this.y + (this?.body as Phaser.Physics.Arcade.Body)?.height);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  addLootSprite(loot: LootMessage) {
    const { scene } = this ?? {};
    // sparkle texture
    if (this.texture) {
      this.lootSprite.play(this.texture);
    } else {
      // otherwise its an actual item
      let asset = resolveAsset(loot.item, scene.hero);
      this.lootShadow = new Sprite(scene, 0, 4, asset.texture, "preview");
      this.lootShadow.setTint(0x000000).setAlpha(0.1);
      this.lootSprite.setTexture(asset.texture, "preview");
      if (this.item.tint) this.lootSprite.setTint(toTint(this.item.tint));
      this.add(this.lootShadow);
    }

    this.add(this.lootSprite);
    if (!this.texture) this.addElementalSprite();
  }
  /** Swaps the plain sprite for a WeaponSprite when the item is a weapon with elements. */
  addElementalSprite() {
    const elements = this.item.type === "weapon" ? deriveElements(this.item.stats) : [];
    if (elements.length === 0) return;
    const asset = resolveAsset(this.item, this.scene.hero);
    const rect = asset.previewRect as readonly number[];
    const grip = getPreviewGrip(rect);
    this.elementalSprite = new WeaponSprite(this.scene, 0, 0, asset.texture, "preview")
      // The preview is cropped, so the grip is wherever the crop left it, not at the centre
      .setGrip(grip.x - rect[2] / 2, grip.y - rect[3] / 2);
    this.elementalSprite.setElements(elements);
    if (this.item.tint) this.elementalSprite.setTint(toTint(this.item.tint));
    // Kept for its bounds and frame, which the HUD reads when the loot flies to a bag
    this.lootSprite.setVisible(false);
    this.add(this.elementalSprite);
  }
  /** The item's art and where the loot is drawn on the page, so the HUD can replace it exactly.
   * Sparkling loot flies its hidden item, not a frame of the sparkle. */
  screenSnapshot(): LootFlyDetail | undefined {
    const { scene, lootSprite } = this;
    const frame = this.texture
      ? scene?.textures.getFrame(resolveAsset(this.item, scene.hero).texture, "preview")
      : lootSprite?.frame;
    if (!scene?.game || !frame) return;
    const canvas = document.createElement("canvas");
    canvas.width = frame.cutWidth;
    canvas.height = frame.cutHeight;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      frame.source.image as CanvasImageSource,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      frame.cutWidth,
      frame.cutHeight,
    );
    const src = (this.item?.tint ? tintCanvas(canvas, this.item.tint) : canvas).toDataURL();

    const cam = scene.cameras.main;
    const page = scene.game.canvas.getBoundingClientRect();
    const scale = (page.width / scene.scale.width) * cam.zoom;
    const bounds = lootSprite.getBounds();
    /* Centred on the sprite but sized to the art, since a sparkle is smaller than its item */
    const width = frame.cutWidth * scale;
    const height = frame.cutHeight * scale;
    return {
      src,
      rarity: this.item?.rarity,
      elements: this.elementalSprite?.elements,
      pixelSize: scale,
      rect: {
        x: page.left + (bounds.centerX - cam.worldView.x) * scale - width / 2,
        y: page.top + (bounds.centerY - cam.worldView.y) * scale - height / 2,
        width,
        height,
      },
    };
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
