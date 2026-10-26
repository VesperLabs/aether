import Phaser from "phaser";
import type { FullCharacterWire } from "@/shared/network";
import { BODY_SIZE, withCharacterModel } from "@/shared/rules/character";

const BLANK_TEXTURE = "human-blank";

/** What a character sprite is built from: a character off the wire, flagged if it is the hero. */
export type CharacterArgs = FullCharacterWire & { isHero?: boolean };

/**
 * The Phaser side of a character, used by the client. The data and rules are in the shared
 * character model; this adds the physics body and the hit box sprite.
 */
export class Character extends withCharacterModel(Phaser.GameObjects.Container) {
  declare hitBox: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  constructor(scene: Phaser.Scene, args: CharacterArgs) {
    super(scene, args.x, args.y, []);
    this.initCharacter(args);
    scene.physics.add.existing(this);
    this.body.setCircle(BODY_SIZE, -BODY_SIZE, -BODY_SIZE);
    this.createHitBox(scene, this.hitBoxSize);
  }

  createHitBox(scene: Phaser.Scene, hitBoxSize: { width: number; height: number }) {
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
