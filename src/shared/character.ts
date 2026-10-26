import Phaser from "phaser";
import { getAngleFromDirection, filterVisibleEquipment, BLANK_TEXTURE, BODY_SIZE } from "./utils";
import { getBuff, hasBuff } from "@/shared/rules/buffs";
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

export class Character extends Phaser.GameObjects.Container {
  startingCoords: Coordinate;
  socketId: string;
  peerId: string;
  id: string;
  isHero: boolean;
  roomName: string;
  charClass?: CharClass;
  room: Room;
  action: string;
  direction: string;
  currentSpeed: number;
  nextPath: Coordinate;
  vx: any;
  vy: any;
  kind: any;
  gold: any;
  profile: any;
  equipment: Record<string, Item>;
  visibleEquipment: Record<string, Item>;
  inventory: any;
  baseStats: any;
  stats: any;
  npcKills: Record<string, number>;
  buffs: Array<Buff>;
  quests: Array<PlayerQuest>;
  abilities: Record<string, Item>;
  activeItemSlots: Array<string>;
  bodyOffsetY: number;
  bodyCenterY: number;
  hitBox: any;
  hitBoxSize: any;
  headY: number;
  bodySize: number;
  proScale: number;
  declare body: Phaser.Physics.Arcade.Body;
  declare state: any;
  constructor(scene: ServerScene | Phaser.Scene, args) {
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
    super(scene, x, y, []);
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
      lastAngle: Phaser.Math.DegToRad(getAngleFromDirection(this.direction)),
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
    scene.physics.add.existing(this);
    this.proScale = this?.profile?.scale || 1;
    this.bodySize = BODY_SIZE * this.proScale;
    this.bodyOffsetY = -14 * this.proScale;
    this.body.setCircle(BODY_SIZE, -BODY_SIZE, -BODY_SIZE);
    this.createHitBox(scene, hitBoxSize);
    this.updateVisibleEquipment();
  }

  createHitBox(scene, hitBoxSize) {
    this.hitBoxSize = hitBoxSize;
    const { width, height } = this.hitBoxSize ?? {};
    // scaling works wierd on body, so we need to undo it for the right coords
    this.hitBox = scene.add.sprite(0, this.bodySize, BLANK_TEXTURE);
    scene.physics.add.existing(this.hitBox);
    this.hitBox.setOrigin(0.5, 1);
    this.hitBox.displayWidth = width;
    this.hitBox.displayHeight = height;
    this.headY = -height + this.bodySize - 6;
    // hits will go here
    this.bodyCenterY = this.headY / 2 + this.bodySize;
    this.add(this.hitBox);
  }
  hasBuff(name: string): boolean {
    return hasBuff(this.buffs, name);
  }
  getBuff(name: string): Buff {
    return getBuff(this.buffs, name) as Buff;
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
  canCastSpell(abilitySlot, shouldUpdateState = true) {
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
  getAbilityDetails(abilitySlot: number) {
    return getAbilityDetails(
      { abilities: this.abilities, hasRangedWeapon: this.hasRangedWeapon() },
      abilitySlot,
    );
  }
  updateVisibleEquipment() {
    this.visibleEquipment = this.getVisibleEquipment();
  }
  getVisibleEquipment() {
    return filterVisibleEquipment(this as FullCharacterState);
  }
  getAttackActionName({ count, abilitySlot }: { count: number; abilitySlot?: number }) {
    const ability = this.getAbilityDetails(abilitySlot);
    return getAttackActionName(this, { action: this.action, ability, count });
  }
  getPlayerQuestStatus(quest: Quest) {
    return getPlayerQuestStatus(this, quest);
  }
  getAttackSpCost(count: number) {
    return getAttackSpCost(this.getVisibleEquipment(), count);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}
