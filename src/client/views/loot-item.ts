import Phaser from "phaser";
import { resolveAsset } from "@/shared/content";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

export class LootItem extends Phaser.GameObjects.Container {
  declare id: any;
  declare item: any;
  declare lootShadow: any;
  declare lootSprite: any;
  declare texture: any;
  constructor(scene, loot) {
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
  addLootSprite(loot) {
    const { scene } = this ?? {};
    // sparkle texture
    if (this.texture) {
      this.lootSprite.play(this.texture);
    } else {
      // otherwise its an actual item
      let asset = resolveAsset(loot.item, (scene as any).hero);
      this.lootShadow = new Sprite(scene, 0, 4, asset.texture, "preview");
      this.lootShadow.setTint(0x000000).setAlpha(0.1);
      this.lootSprite.setTexture(asset.texture, "preview");
      if (this.item.tint) this.lootSprite.setTint(this.item.tint);
      this.add(this.lootShadow);
    }

    this.add(this.lootSprite);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
