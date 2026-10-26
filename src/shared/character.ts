import Phaser from "phaser";
import { BLANK_TEXTURE } from "./utils";
import { BODY_SIZE, withCharacterModel } from "./character-model";

/**
 * The Phaser side of a character, used by the client. The data and rules are in the shared
 * character model; this adds the physics body and the hit box sprite.
 */
export class Character extends withCharacterModel(Phaser.GameObjects.Container) {
  hitBox: any;
  declare body: Phaser.Physics.Arcade.Body;
  constructor(scene: Phaser.Scene, args) {
    super(scene, args.x, args.y, []);
    this.initCharacter(args);
    scene.physics.add.existing(this);
    this.body.setCircle(BODY_SIZE, -BODY_SIZE, -BODY_SIZE);
    this.createHitBox(scene, this.hitBoxSize);
  }

  createHitBox(scene, hitBoxSize) {
    const { width, height } = hitBoxSize ?? {};
    // scaling works wierd on body, so we need to undo it for the right coords
    this.hitBox = scene.add.sprite(0, this.bodySize, BLANK_TEXTURE);
    scene.physics.add.existing(this.hitBox);
    this.hitBox.setOrigin(0.5, 1);
    this.hitBox.displayWidth = width;
    this.hitBox.displayHeight = height;
    this.add(this.hitBox);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}
