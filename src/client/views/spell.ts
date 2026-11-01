import Phaser from "phaser";
import { getOneWayLatency } from "@/client/net/latency";
import { playAudio } from "@/client/audio/play-audio";
import type { Point } from "@/rules/world";
import type { Player } from "./player";
import { toTint } from "./tint";
import { SwingArc } from "./swing-arc";
import { getAngleFromDirection, distanceTo } from "@/rules/world";
import {
  BUFF_SPELLS,
  getMeleeSwing,
  getSpellShape,
  getSpellFlight,
  isSpellExpired,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "@/rules/spells";
import { HAND_REACH, WEAPON_GRIP, getWeaponTip } from "@/content";
const Sprite = Phaser.GameObjects.Sprite;
const BLANK_TEXTURE = "human-blank";

/** Which way a weapon's art points, in degrees on screen, from its tip. */
function getBladeDegrees(texture: string | undefined) {
  const tip = getWeaponTip(texture);
  return Phaser.Math.RadToDeg(Math.atan2(tip.y - WEAPON_GRIP.y, tip.x - WEAPON_GRIP.x));
}

/** The colour of each melee swing's arc. */
const SWING_COLORS: Record<string, number> = {
  "attack-melee": 0xdfe8ff,
  "flame-slash": 0xff7a2a,
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
      const isLeft = usesLeftHand(this.action);
      const isRight = usesRightHand(this.action);
      this.stickToCaster = true;
      /* npcs without attack animations use neither hand: they still swing, at body reach */
      const hand = isLeft && !isRight ? "handLeft" : "handRight";
      /* Characters without attack animations swing no weapon: their arc is their body's reach */
      const isWielded = isLeft || isRight;
      const bladeDegrees = getBladeDegrees(caster.visibleEquipment?.[hand]?.texture);
      /* The weapon's range stat is the hit radius from body centre; the arc turns around the hand */
      const reach = caster.getWeaponRange(hand);
      this.setMeleeBody(shape.scale);
      this.add(
        new SwingArc(scene, {
          reach:
            isWielded && caster.visibleEquipment?.[hand]?.stats?.range ? reach - HAND_REACH : reach,
          /* Turns around the hand holding the weapon, which this spell follows from body centre */
          pivot: isWielded
            ? () => ({ x: caster[hand].x, y: caster[hand].y - caster.bodyCenterY })
            : undefined,
          facing: getAngleFromDirection(caster?.direction),
          /* Matches the sword animations: right-hand swings sweep counter-clockwise */
          clockwise: isLeft && !isRight,
          wielder: isWielded ? { character: caster, hand, artDegrees: bladeDegrees } : undefined,
          color: SWING_COLORS[this.spellName] ?? SWING_COLORS["attack-melee"],
          duration: this.maxVisibleTime,
        }),
      );
    } else {
      this.setScale(shape.scale);
    }

    const flight = getSpellFlight(shape, castAngle, this.action, (hand) =>
      caster.getWeaponRange(hand),
    );
    if (flight) {
      ({ x: this.velocityX, y: this.velocityY } = flight.velocity);
      this.maxDistance = flight.maxDistance ?? this.maxDistance;
    }
    if (this.isRangedAttack) {
      this.spell.setTexture("icons", "arrow");
      this.spell.setRotation(castAngle + Math.PI / 4);
    }
    if (this.isMissile) {
      this.spell.play(`spell-anim-${spellName}`);
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
    this.catchUpToServer();
    this.adjustSpellPosition();
    playSpellAudio({ scene, spellName, caster, isMeleeAttack: this.isMeleeAttack });
  }
  /**
   * Shapes the physics body like the swing the server checks, so the debug view shows its real
   * reach. This spell stays on the caster's body centre for the arc, so the body is offset instead.
   */
  setMeleeBody(scale: number) {
    const { caster } = this;
    const swing = getMeleeSwing(
      {
        y: caster.y,
        bodyCenterY: caster.bodyCenterY,
        direction: caster.direction,
        race: caster.profile?.race,
      },
      this.action,
      (hand) => caster.getWeaponRange(hand),
    );
    const radius = Math.floor((swing.reach ?? this.bodySize) * scale);
    const offsetY = swing.y - (caster.y + caster.bodyCenterY);
    this.body.setCircle(radius, -radius, -radius + offsetY);
  }
  /**
   * Someone else's projectile left the server about half a ping ago, so start it that far along
   * its flight. Otherwise it is drawn behind where it really is and seems to hit from afar.
   */
  catchUpToServer() {
    if (this.caster.isHero || this.stickToCaster) return;
    if (!this.velocityX && !this.velocityY) return;
    const leadMs = getOneWayLatency();
    this.x += (this.velocityX * leadMs) / 1000;
    this.y += (this.velocityY * leadMs) / 1000;
    this.spellState.spawnTime -= leadMs;
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
      this.x = this.caster.x + this.caster.rig.x;
      this.y = this.caster.y + this.caster.bodyCenterY + this.caster.rig.y;
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
