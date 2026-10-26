import { getAngleFromDirection, type Point } from "@/shared/rules/world";
import { getBuff, hasBuff, type ActiveBuff } from "@/shared/rules/buffs";
import type { CharClass } from "@/shared/content";
import type { RoomData } from "@/shared/rules/world";
import type { PlayerQuestRecord } from "@/shared/rules/quests";
import {
  POTION_COOLDOWN,
  checkAttackReady,
  getAttackActionName,
  getAttackSpCost,
  getCooldown,
  getFullAttackDelay,
  getWeaponRange,
  hasAttackableWeapons,
  hasMeleeWeapon,
  hasMeleeWeaponLeft,
  hasMeleeWeaponRight,
  hasRangedWeapon,
  hasRangedWeaponLeft,
  hasRangedWeaponRight,
  hasShield,
  hasShieldLeft,
  hasShieldRight,
  hasVisibleWeaponType,
  hasWeapon,
  hasWeaponLeft,
  hasWeaponRight,
  isDualWielding,
  isOutOfCombat,
  modifyStat,
  type EquipmentKey,
  type Hand,
} from "@/shared/rules/combat";
import { getPlayerQuestStatus } from "@/shared/rules/quests";
import { canCastSpell, checkCastReady, getAbilityDetails } from "@/shared/rules/spells";

/** An item as the character reads it. */
// TODO: narrow once server entities stop relying on the global Item interface.
export type CharacterItem = any;

/** Radius of a character's body, in pixels (before the profile scale). */
export const BODY_SIZE = 8;

/** The equipment a character can actually use right now (worn in an active slot). */
export function filterVisibleEquipment(player: {
  equipment?: Record<string, CharacterItem>;
  activeItemSlots?: string[];
}) {
  return Object.fromEntries(
    Object.entries(player?.equipment ?? {}).filter(([key]) =>
      player?.activeItemSlots?.includes(key),
    ),
  );
}

type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Everything a character is, as plain data plus methods that call the rules. Mixed into a base
 * class so the server uses it plain and the client mixes it into a Phaser Container. Call
 * `initCharacter(args)` from the constructor.
 */
export function withCharacterModel<TBase extends Constructor<{ x: number; y: number }>>(
  Base: TBase,
) {
  return class CharacterModel extends Base {
    startingCoords!: Point;
    socketId!: string;
    peerId!: string;
    id!: string;
    isHero!: boolean;
    roomName!: string;
    charClass?: CharClass;
    room!: RoomData;
    action!: string;
    direction!: string;
    currentSpeed!: number;
    nextPath!: Point;
    vx!: any;
    vy!: any;
    kind!: any;
    gold!: any;
    profile!: any;
    equipment!: Record<string, CharacterItem>;
    visibleEquipment!: Record<string, CharacterItem>;
    inventory!: any;
    baseStats!: any;
    stats!: any;
    npcKills!: Record<string, number>;
    buffs!: any[];
    quests!: Array<PlayerQuestRecord>;
    abilities!: Record<string, CharacterItem>;
    activeItemSlots!: Array<string>;
    bodyOffsetY!: number;
    bodyCenterY!: number;
    hitBoxSize!: { width: number; height: number };
    headY!: number;
    bodySize!: number;
    proScale!: number;
    declare state: any;

    /** Copies the constructor args onto the character and fills in the defaults. */
    initCharacter(args: any) {
      const {
        x,
        y,
        socketId,
        peerId,
        id,
        isHero = false,
        room,
        equipment = {},
        inventory = [],
        profile,
        stats = {},
        kind,
        roomName,
        baseStats = {},
        direction,
        state = {},
        gold = 0,
        charClass,
        npcKills = {},
        quests = {},
        buffs = [],
        abilities = {},
        activeItemSlots = [],
        hitBoxSize = { width: 24, height: 46 }, //human hitbox
      } = args;
      this.x = x;
      this.y = y;
      this.charClass = charClass;
      this.startingCoords = { x, y };
      this.socketId = socketId;
      this.peerId = peerId;
      this.id = id;
      this.isHero = isHero;
      this.roomName = roomName;
      this.room = room;
      this.action = "stand";
      this.direction = direction || "down";
      this.currentSpeed = 0;
      this.vx = 0;
      this.vy = 0;
      this.kind = kind;
      this.state = {
        isRobot: false,
        isAggro: false,
        doHpRegen: false,
        doBuffPoison: false,
        doHpBuffRegen: false,
        doMpRegen: false,
        doSpRegen: false,
        lastTeleport: Date.now(),
        deadTime: Date.now(),
        lastBuffPoison: Date.now(),
        lastHpRegen: Date.now(),
        lastHpBuffRegen: Date.now(),
        lastMpRegen: Date.now(),
        lastSpRegen: Date.now(),
        lastCombat: Date.now() - POTION_COOLDOWN,
        lastPotion: Date.now() - POTION_COOLDOWN,
        lastAttack: Date.now() - POTION_COOLDOWN,
        lastCast: {
          global: Date.now() - POTION_COOLDOWN,
        },
        lastFlash: Date.now(),
        isEnteringDoor: false,
        setFlash: false,
        isIdle: true,
        isAttacking: false,
        isPotioning: false,
        isCharging: false,
        // npcAttackReady: false, /* Used on server for only NPCs */
        isDead: false,
        activeSets: [],
        lastAngle: (getAngleFromDirection(this.direction) * Math.PI) / 180,
        isHovering: false,
        ...state,
      };
      this.buffs = buffs;
      this.activeItemSlots = activeItemSlots;
      this.gold = gold;
      this.profile = profile;
      this.equipment = equipment;
      this.abilities = abilities;
      this.inventory = inventory;
      this.baseStats = baseStats;
      this.stats = stats;
      this.npcKills = npcKills;
      this.quests = quests;
      this.proScale = this?.profile?.scale || 1;
      this.bodySize = BODY_SIZE * this.proScale;
      this.bodyOffsetY = -14 * this.proScale;
      this.hitBoxSize = hitBoxSize;
      this.headY = -hitBoxSize.height + this.bodySize - 6;
      // hits will go here
      this.bodyCenterY = this.headY / 2 + this.bodySize;
      this.updateVisibleEquipment();
    }

    hasBuff(name: string): boolean {
      return hasBuff(this.buffs, name);
    }
    getBuff(name: string): ActiveBuff {
      return getBuff(this.buffs, name) as ActiveBuff;
    }
    doAttack(props: any) {
      //placeholder
    }
    doAttackRanged(props: any) {
      //placeholder
    }
    modifyStat(key: string, amount: any) {
      const value = modifyStat(this.stats, key, amount);
      if (value !== undefined) this.stats[key] = value;
    }
    getFullAttackDelay() {
      return getFullAttackDelay(this.stats.attackDelay, this.isDualWielding());
    }
    checkAttackReady() {
      const result = checkAttackReady({
        attackDelay: this.stats.attackDelay,
        isDualWielding: this.isDualWielding(),
        lastAttack: this.state.lastAttack,
        now: Date.now(),
      });
      this.state.isAttacking = !result.isReady;
      return result;
    }
    checkPotionCooldown() {
      const { percentageRemaining, timeRemaining, isReady } = getCooldown(
        POTION_COOLDOWN,
        this.state.lastPotion,
        Date.now(),
      );
      this.state.isPotioning = !isReady;
      return { percentageRemaining, timeRemaining, isReady };
    }
    getWeaponRange(hand: Hand = "handLeft") {
      return getWeaponRange(this, hand);
    }
    checkOutOfCombat() {
      return isOutOfCombat(this.state.lastCombat, Date.now());
    }
    isDualWielding(key: EquipmentKey = "visibleEquipment") {
      return isDualWielding(this, key);
    }
    hasWeaponLeft(key: EquipmentKey = "visibleEquipment") {
      return hasWeaponLeft(this, key);
    }
    hasWeaponRight(key: EquipmentKey = "visibleEquipment") {
      return hasWeaponRight(this, key);
    }
    hasShieldLeft(key: EquipmentKey = "visibleEquipment") {
      return hasShieldLeft(this, key);
    }
    hasShieldRight(key: EquipmentKey = "visibleEquipment") {
      return hasShieldRight(this, key);
    }
    hasRangedWeaponLeft(key: EquipmentKey = "visibleEquipment") {
      return hasRangedWeaponLeft(this, key);
    }
    hasRangedWeaponRight(key: EquipmentKey = "visibleEquipment") {
      return hasRangedWeaponRight(this, key);
    }
    hasMeleeWeaponLeft(key: EquipmentKey = "visibleEquipment") {
      return hasMeleeWeaponLeft(this, key);
    }
    hasMeleeWeaponRight(key: EquipmentKey = "visibleEquipment") {
      return hasMeleeWeaponRight(this, key);
    }
    hasWeapon(key: EquipmentKey = "visibleEquipment") {
      return hasWeapon(this, key);
    }
    hasShield(key: EquipmentKey = "visibleEquipment") {
      return hasShield(this, key);
    }
    hasRangedWeapon(key: EquipmentKey = "visibleEquipment") {
      return hasRangedWeapon(this, key);
    }
    hasMeleeWeapon(key: EquipmentKey = "visibleEquipment") {
      return hasMeleeWeapon(this, key);
    }
    hasAttackableWeapons(key: EquipmentKey = "visibleEquipment") {
      return hasAttackableWeapons(this, key);
    }
    hasVisibleWeaponType(weaponType: "melee" | "ranged", key: EquipmentKey = "visibleEquipment") {
      return hasVisibleWeaponType(this, weaponType, key);
    }
    checkCastReady(spellName?: string) {
      return checkCastReady({
        spellName,
        lastCast: this.state.lastCast,
        castDelay: this?.stats?.castDelay,
        now: Date.now(),
      });
    }
    canCastSpell(abilitySlot: number | undefined, shouldUpdateState = true) {
      const { allowed, castTimes } = canCastSpell({
        abilitySlot,
        isStunned: this?.hasBuff("stun"),
        isDead: this.state.isDead,
        kind: this.kind,
        activeItemSlots: this.activeItemSlots,
        abilities: this.abilities,
        stats: this.stats,
        lastCast: this.state.lastCast,
        now: Date.now(),
        shouldUpdateState,
      });
      if (castTimes) Object.assign(this.state.lastCast, castTimes);
      return allowed;
    }
    getAbilityDetails(abilitySlot?: number) {
      return getAbilityDetails(
        { abilities: this.abilities, hasRangedWeapon: this.hasRangedWeapon() },
        abilitySlot,
      );
    }
    updateVisibleEquipment() {
      this.visibleEquipment = this.getVisibleEquipment();
    }
    getVisibleEquipment() {
      return filterVisibleEquipment(this);
    }
    getAttackActionName({ count, abilitySlot }: { count: number; abilitySlot?: number }) {
      const ability = this.getAbilityDetails(abilitySlot);
      return getAttackActionName(this, { action: this.action, ability, count });
    }
    getPlayerQuestStatus(quest: Parameters<typeof getPlayerQuestStatus>[1]) {
      return getPlayerQuestStatus(
        {
          quests: this.quests,
          npcKills: this.npcKills,
          inventory: this.inventory,
          abilities: this.abilities as Parameters<typeof getPlayerQuestStatus>[0]["abilities"],
        },
        quest,
      );
    }
    getAttackSpCost(count: number) {
      return getAttackSpCost(this.getVisibleEquipment(), count);
    }
  };
}

/** A character with no engine behind it: what the server's players and NPCs are built on. */
export class CharacterModel extends withCharacterModel(
  class {
    x = 0;
    y = 0;
  },
) {}
