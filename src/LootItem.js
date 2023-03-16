import { resolveAsset } from "./Assets";
class LootItem extends Phaser.GameObjects.Container {
  constructor(scene, loot) {
    super(scene, loot.x, loot.y);
    this.scene = scene;
    this.item = loot.item;
    this.id = loot.id;
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.scale || 1);
    this.body.setCircle(bodySize, -bodySize, -bodySize);
    this.addLootSprite(loot);
    this.setDepth(5);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  addLootSprite(loot) {
    let asset = resolveAsset(loot.item, this.scene.hero);
    this.lootSprite = new Phaser.GameObjects.Sprite(this.scene, 0, 0, asset.texture, "preview");
    if (this.item.tint) this.lootSprite.setTint(this.item.tint);
    this.add(this.lootSprite);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    super.destroy();
  }
}

export default LootItem;
