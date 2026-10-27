import Phaser from "phaser";
import { playAudio } from "@/client/audio/play-audio";
import type { Point } from "@/shared/rules/world";
import type { Player } from "./player";
import { toTint } from "./tint";
import { getAngleFromDirection, distanceTo } from "@/shared/rules/world";
import {
  BUFF_SPELLS,
  getSpellShape,
  getSpellVelocity,
  isSpellExpired,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "@/shared/rules/spells";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

const SPELL_NAME_ANIM_MAP: Record<string, string> = {
  "attack-melee": "spell-anim-slash-physical",
  "flame-slash": "spell-anim-slash-fire",
};

/** What a spell is cast from: an ability's details, or the plain attack of a swing. */
export interface SpellArgs {
  id?: string | null;
  caster: Player;
  spellName: string;
  action?: string;
  castAngle?: number;
  ilvl?: number;
}

export class Spell extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  declare id: string | null | undefined;
  declare spawnPoint: Point;
  declare caster: Player;
  declare spellName: string;
  declare spellState: { spawnTime: number; isExpired: boolean };
  declare velocityX: number;
  declare velocityY: number;
  declare spell: Phaser.GameObjects.Sprite;
  declare isMeleeAttack?: boolean;
  declare isRangedAttack?: boolean;
  declare layerDepth?: string;
  declare allowedTargets?: readonly string[];
  /** Every spell that is cast defines these, see `getSpellShape`. */
  declare maxVisibleTime: number;
  declare spellSpeed: number;
  declare bodySize: number;
  declare shouldFade: boolean;
  declare maxDistance: number;
  declare action: string;
  declare isMissile: boolean;
  declare stickToCaster?: boolean;
  constructor(
    scene: Phaser.Scene,
    { id, caster, spellName, action, castAngle = 0, ilvl = 1 }: SpellArgs,
  ) {
    const spawnPoint = { x: caster.x, y: caster.y + caster.bodyCenterY };
    super(scene, spawnPoint.x, spawnPoint.y);

    this.spawnPoint = spawnPoint;
    this.id = id;
    this.scene = scene;
    this.caster = caster;
    this.spellName = spellName;
    this.spellState = {
      spawnTime: Date.now(),
      isExpired: false,
    };
    this.velocityX = 0;
    this.velocityY = 0;
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, BLANK_TEXTURE, 0));

    const { details, found } = resolveSpellDetails(spellName);
    if (!found) console.log("❌ Shit, the spell does not exist in spellDetails!");
    const shape = getSpellShape(details, ilvl);

    this.isMeleeAttack = shape.isMeleeAttack;
    this.isRangedAttack = shape.isRangedAttack;
    this.layerDepth = details?.layerDepth;
    this.allowedTargets = shape.allowedTargets;
    this.maxVisibleTime = shape.maxVisibleTime as number;
    this.spellSpeed = shape.spellSpeed as number;
    this.bodySize = shape.bodySize as number;
    this.spell.setTint(toTint(details?.tint || "0xFFFFFF"));
    this.shouldFade = details?.shouldFade || false;
    this.maxDistance = shape.maxDistance; //for ranged attacks
    this.action = action ?? "attack_right";
    this.isMissile = shape.isMissile;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isMeleeAttack) {
      let viewSize = 44;
      let tiltAngle = 48;
      const attackSpellAnim = SPELL_NAME_ANIM_MAP[this.spellName];
      const numFrames = this.scene.anims.get(attackSpellAnim)?.frames?.length;

      this.spell.play(attackSpellAnim);
      this.spell.anims.msPerFrame = Math.floor(this.maxVisibleTime / (numFrames as number));
      this.spell.setAngle(getAngleFromDirection(caster?.direction) - 90);

      this.stickToCaster = true;
      /* Hack: Up range is too long. This hack makes the top-down view more realistic */
      if (caster?.direction === "up") {
        this.y = this.caster.y;
      }

      /* Hack: fixes placement for non-human units .*/
      if (caster.profile.race !== "human") {
        const difference =
          ((this.caster.hitBox.body as Phaser.Physics.Arcade.Body).height -
            this.caster.body.height) /
          2;
        this.y = this.caster.y - difference;
      }

      if (usesLeftHand(this.action)) {
        this.setAngle(tiltAngle);
        const rangeLeft = caster?.equipment?.handLeft?.stats?.range * 2 || caster?.body?.radius / 8;

        this.spell.displayWidth = viewSize * rangeLeft;
        this.spell.displayHeight = viewSize * rangeLeft;
        this.spell.setFlipX(false);
      }

      // npcs without attack animations will stand here
      if (usesRightHand(this.action)) {
        this.setAngle(-tiltAngle);
        const rangeRight =
          caster?.equipment?.handRight?.stats?.range * 2 || caster?.body?.radius / 8;

        this.spell.displayWidth = viewSize * rangeRight;
        this.spell.displayHeight = viewSize * rangeRight;
        this.spell.setFlipX(true);
      }
      this.setScale(this?.caster?.proScale);
    } else {
      this.setScale(shape.scale);
    }

    if (this.isRangedAttack) {
      this.spell.setTexture("icons", "arrow");
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, this.spellSpeed));
      this.spell.setRotation(castAngle + 0.785398163);
      this.maxDistance = this.action.includes("attack_left")
        ? caster?.getWeaponRange("handLeft")
        : caster?.getWeaponRange("handRight");
    }
    if (this.isMissile) {
      this.spell.play(`spell-anim-${spellName}`);
      ({ x: this.velocityX, y: this.velocityY } = getSpellVelocity(castAngle, this.spellSpeed));
      this.spell.setRotation(castAngle);
    }
    if (spellName === "quake") {
      this.body.setSize(this?.bodySize * 4, this?.bodySize * 2);
      this.y = this.caster.y + 6;
      this.body.setOffset(-this.bodySize * 2, -this.bodySize);
      this.spell.play(`spell-anim-${spellName}`);
    }
    if (BUFF_SPELLS.includes(spellName)) {
      this.spell.play("spell-anim-chakra");
      this.stickToCaster = true;
    }

    if (this.shouldFade) {
      scene.tweens.add({
        targets: this.spell,
        props: {
          alpha: {
            value: () => 0,
            ease: "Power4",
          },
        },
        duration: this.maxVisibleTime,
        yoyo: false,
        repeat: 0,
      });
    }

    this.add(this.spell);
    this.adjustSpellPosition();
    playSpellAudio({ scene, spellName, caster, isMeleeAttack: this.isMeleeAttack });
  }
  create() {}
  update() {
    this.spellState.isExpired = isSpellExpired({
      maxDistance: this.maxDistance,
      distanceFromSpawn: distanceTo(this, this.spawnPoint),
      spawnTime: this.spellState.spawnTime,
      lifetime: this.maxVisibleTime,
      now: Date.now(),
    });
    if (!this.scene || this.spellState.isExpired) return this.destroy();
    this.adjustSpellPosition();
  }
  adjustSpellPosition() {
    if (this.layerDepth === "bottom") {
      this.setDepth(this?.caster?.depth - 20);
    }
    if (this.layerDepth === "top") {
      this.setDepth(100 + this.y + this.bodySize);
    }
    if (this.stickToCaster) {
      this.x = this.caster.x;
      this.y = this.caster.y + this.caster.bodyCenterY;
      return;
    }
    this.body.setVelocity(this.velocityX, this.velocityY);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}

const playSpellAudio = ({
  scene,
  spellName,
  caster,
  isMeleeAttack,
}: {
  scene: Phaser.Scene;
  spellName: string;
  caster: Player;
  isMeleeAttack?: boolean;
}) => {
  let audioKey = null;
  if (isMeleeAttack) {
    audioKey = "melee-swing-1";
  }
  if (spellName === "fireball") {
    audioKey = "spell-fireball";
  }
  if (spellName === "waterball") {
    audioKey = "spell-water";
  }
  if (spellName === "lightball") {
    audioKey = "spell-light";
  }
  if (spellName === "quake") {
    audioKey = "spell-earth";
  }
  if (BUFF_SPELLS.includes(spellName)) {
    audioKey = "spell-buff-1";
  }
  return playAudio({ scene, audioKey, caster });
};
