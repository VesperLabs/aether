import Phaser from "phaser";
import { resolveAsset } from "@/shared/content";
import type { LootMessage } from "@/shared/network";
import type { SceneMain } from "@/client/scenes/main-scene";
import { toTint } from "./tint";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

export class LootItem extends Phaser.GameObjects.Container {
  declare id: string;
  declare item: Item;
  declare lootShadow: Phaser.GameObjects.Sprite;
  declare lootSprite: Phaser.GameObjects.Sprite;
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
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}
