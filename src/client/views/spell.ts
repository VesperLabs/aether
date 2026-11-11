import Phaser from "phaser";
import { getOneWayLatency } from "@/client/net/latency";
import { playAudio } from "@/client/audio/play-audio";
import type { Point } from "@/rules/world";
import type { Player } from "./player";
import { toTint } from "./tint";
import { endOnDeath } from "./end-on-death";
import { addLight } from "./lights";
import { PunchBurst } from "./punch-burst";
import { SwingArc } from "./swing-arc";
import { SwingDebug } from "./swing-debug";
import { deriveElements } from "@/ui/item/weapon-elements";
import { ELEMENT_SWING_COLORS } from "@/ui/item/element-effects";
import { getAngleFromDirection, distanceTo } from "@/rules/world";
import {
  getMeleeSwing,
  getSpell,
  getSpellShape,
  getSpellFlight,
  isSpellExpired,
  isSwingClockwise,
  planSwing,
  ridesCaster,
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

/** A swing's arc when neither the spell nor the weapon's element colours it. */
const PLAIN_SWING_COLOR = 0xdfe8ff;

/** What a spell is cast from: an ability's details, or the plain attack of a swing. */
export interface SpellArgs {
  id?: string | null;
  caster: Player;
  spellName: string;
  action?: string;
  castAngle?: number;
  rank?: number;
  /** Where it left its caster, when the server says (they may have moved since). */
  spawnPoint?: Point;
  /** How long ago it was cast, in ms: it starts that far along (see `sync/effects`). */
  ageMs?: number;
}

export class Spell extends Phaser.GameObjects.Container {
  /** Takes its light back out of the light map. */
  declare removeLight?: () => void;
  declare body: Phaser.Physics.Arcade.Body;
  declare id: string | null | undefined;
  declare spawnPoint: Point;
  declare caster: Player;
  declare spellName: string;
  declare spellState: { spawnTime: number; isExpired: boolean };
  declare velocityX: number;
  declare velocityY: number;
  declare spell: Phaser.GameObjects.Sprite;
  declare isMeleeAttack: boolean;
  /** Drawn under the caster, over the world, or (a punch) just over the caster. */
  declare layer: "below" | "above" | "aboveCaster";
  declare maxVisibleTime: number;
  declare bodySize: number;
  declare maxDistance: number;
  declare action: string;
  declare stickToCaster: boolean;
  declare ageMs: number;
  constructor(
    scene: Phaser.Scene,
    { id, caster, spellName, action, castAngle = 0, rank = 1, ...rest }: SpellArgs,
  ) {
    const spawnPoint = rest.spawnPoint ?? { x: caster.x, y: caster.y + caster.bodyCenterY };
    super(scene, spawnPoint.x, spawnPoint.y);

    this.spawnPoint = spawnPoint;
    this.ageMs = rest.ageMs ?? 0;
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

    const spell = getSpell(spellName);
    const { delivery, look } = spell;
    const shape = getSpellShape(spell, rank);

    this.isMeleeAttack = delivery.type === "swing";
    this.stickToCaster = ridesCaster(spell);
    this.layer = look.layer;
    this.maxVisibleTime = shape.visibleMs;
    this.bodySize = shape.size;
    this.maxDistance = shape.maxDistance;
    this.action = action ?? "attack_right";
    this.spell.setTint(toTint(look.tint ?? "0xFFFFFF"));
    if (look.light) {
      const { color, radius } = look.light;
      /* Fades with the spell, and goes dark once it's spent */
      this.removeLight = addLight({
        position: () => (this.active && this.visible && this.spell.alpha > 0 ? this : undefined),
        radius,
        color: toTint(color),
      });
    }

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);

    if (this.isMeleeAttack) {
      const isLeft = usesLeftHand(this.action);
      const isRight = usesRightHand(this.action);
      /* npcs without attack animations use neither hand: they still swing, at body reach */
      const hand = isLeft && !isRight ? "handLeft" : "handRight";
      /* Characters without attack animations swing no weapon: their arc is their body's reach */
      const isWielded = isLeft || isRight;
      /* Non-humans count as armed, so this is a human's empty hand */
      const isPunching = isWielded && !caster.hasWeapon();
      const isUppercut = caster.visibleEquipment?.[hand]?.base === "fist";
      const bladeDegrees = getBladeDegrees(caster.visibleEquipment?.[hand]?.texture);
      /* The weapon's range stat is the hit radius from body centre; the arc turns around the hand */
      const reach = caster.getWeaponRange(hand);
      this.showSwingDebug(hand, isPunching, isUppercut);
      /* A fist is in front of the body, unlike a blade's arc, which sweeps behind it */
      if (isPunching) this.layer = "aboveCaster";
      /* The hand, relative to this spell, which follows the caster's body centre */
      const getHand = () => ({ x: caster[hand].x, y: caster[hand].y - caster.bodyCenterY });
      const facing = getAngleFromDirection(caster?.direction);
      /* Plain swings take the color of the weapon's element, like its outline */
      const color =
        (look.tint ? toTint(look.tint) : undefined) ??
        ELEMENT_SWING_COLORS[deriveElements(caster.visibleEquipment?.[hand]?.stats)[0] as string] ??
        PLAIN_SWING_COLOR;
      const swing = isPunching
        ? new PunchBurst(scene, { fist: getHand, facing, color, duration: this.maxVisibleTime })
        : new SwingArc(scene, {
            reach:
              isWielded && caster.visibleEquipment?.[hand]?.stats?.range
                ? reach - HAND_REACH
                : reach,
            /* Turns around the hand holding the weapon */
            pivot: isWielded ? getHand : undefined,
            facing,
            /* The same turn the server sweeps its hit along */
            clockwise: isSwingClockwise(caster?.direction, this.action, isUppercut),
            wielder: isWielded ? { character: caster, hand, artDegrees: bladeDegrees } : undefined,
            color,
            duration: this.maxVisibleTime,
          });
      this.add(swing);
    } else {
      this.setScale(shape.scale);
    }

    const flight = getSpellFlight(spell, castAngle, this.action, (hand) =>
      caster.getWeaponRange(hand),
    );
    if (flight) {
      ({ x: this.velocityX, y: this.velocityY } = flight.velocity);
      this.maxDistance = flight.maxDistance;
    }
    if (look.sprite && "icon" in look.sprite) this.spell.setTexture("icons", look.sprite.icon);
    if (look.sprite && "animation" in look.sprite) this.spell.play(look.sprite.animation);
    /* Projectiles face where they fly; icon art points up and to the right */
    if (flight) {
      const iconTurn = look.sprite && "icon" in look.sprite ? Math.PI / 4 : 0;
      this.spell.setRotation(castAngle + iconTurn);
    }
    if (delivery.type === "burst" && delivery.shape === "box") {
      this.body.setSize(this.bodySize * 4, this.bodySize * 2);
      this.body.setOffset(-this.bodySize * 2, -this.bodySize);
      this.y = this.caster.y + 6;
    }

    if (look.fades) {
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
    /* Spells riding their caster (a lunge, a buff) end when the caster dies */
    if (this.stickToCaster) endOnDeath(caster, this);
    this.catchUpToServer();
    this.adjustSpellPosition();
    playAudio({ scene, audioKey: look.sound ?? null, caster });
  }
  /**
   * The swing's hit, for the physics debug view: the wedge the server sweeps, from the same rule.
   * The physics body itself is not used for melee, so it is left out of the debug view.
   */
  showSwingDebug(hand: "handLeft" | "handRight", isPunching: boolean, isUppercut: boolean) {
    this.body.debugShowBody = false;
    if (!this.scene.physics.world.drawDebug) return;
    const { caster } = this;
    const swing = getMeleeSwing(
      {
        y: caster.y,
        bodyCenterY: caster.bodyCenterY,
        direction: caster.direction,
        race: caster.profile?.race,
      },
      this.action,
      (side) => caster.getWeaponRange(side),
    );
    const plan = planSwing({
      direction: caster.direction,
      action: this.action,
      race: caster.profile?.race,
      reach: caster.getWeaponRange(hand),
      hasWeaponRange: !!caster.visibleEquipment?.[hand]?.stats?.range,
      isPunching,
      isUppercut,
      bodyPivotY: swing.y - caster.y,
      visibleMs: this.maxVisibleTime,
    });
    new SwingDebug(this.scene, plan, caster, Math.max(this.maxVisibleTime, plan.sweepMs));
  }
  /**
   * Someone else's projectile left the server about half a ping ago (plus its age, for one already
   * flying when we walked in), so start it that far along its flight. Otherwise it is drawn behind
   * where it really is and seems to hit from afar.
   */
  catchUpToServer() {
    if ((this.caster.isHero && !this.ageMs) || this.stickToCaster) return;
    if (!this.velocityX && !this.velocityY) return;
    const leadMs = getOneWayLatency() + this.ageMs;
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
    /* A spell riding its caster that was removed ends with it, not where it was */
    if (this.stickToCaster && !this.caster?.active) return this.destroy();
    this.adjustSpellPosition();
  }
  adjustSpellPosition() {
    if (this.layer === "below") this.setDepth(this.caster.depth - 20);
    if (this.layer === "aboveCaster") this.setDepth(this.caster.depth + 1);
    if (this.layer === "above") this.setDepth(100 + this.y + this.bodySize);
    if (this.stickToCaster) {
      this.x = this.caster.x + this.caster.rig.x;
      this.y = this.caster.y + this.caster.bodyCenterY + this.caster.rig.y;
      return;
    }
    this.body.setVelocity(this.velocityX, this.velocityY);
  }
  destroy() {
    this.removeLight?.();
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}
