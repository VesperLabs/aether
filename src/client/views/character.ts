import Phaser from "phaser";
import type { FullCharacterWire } from "@/network";
import { withCharacterModel } from "@/rules/character";
import type { RoomData } from "@/rules/world";
import { characterHitBox } from "@/rules/spells";

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
  /** The client only builds characters that are in the room it shows. */
  declare roomName: string;
  declare room: RoomData;
  constructor(scene: Phaser.Scene, args: CharacterArgs) {
    super(scene, args.x, args.y, []);
    this.initCharacter(args, Date.now);
    scene.physics.add.existing(this);
    /* The server collides and hits feet with the scaled body, so match it */
    this.body.setCircle(this.bodySize, -this.bodySize, -this.bodySize);
    this.createHitBox(scene);
  }

  /** The box spells hit, the same one the server checks (relative to the character). */
  createHitBox(scene: Phaser.Scene) {
    const { bodySize, hitBoxSize, hitBoxInset } = this;
    const box = characterHitBox({ x: 0, y: 0, bodySize, hitBoxSize, hitBoxInset });
    this.hitBox = scene.add.sprite(box.x, box.y, BLANK_TEXTURE);
    scene.physics.add.existing(this.hitBox);
    this.hitBox.displayWidth = box.halfWidth * 2;
    this.hitBox.displayHeight = box.halfHeight * 2;
    this.add(this.hitBox);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}
