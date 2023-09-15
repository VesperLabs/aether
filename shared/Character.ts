import Phaser from "phaser";
import {
  capitalize,
  getAngleFromDirection,
  filterVisibleEquipment,
  BLANK_TEXTURE,
  POTION_COOLDOWN,
  BODY_SIZE,
  RACES_WITH_ATTACK_ANIMS,
  RANGE_MULTIPLIER,
} from "./utils";
import { spellDetails } from ".";

class Character extends Phaser.GameObjects.Container {
  startingCoords: Coordinate;
  socketId: string;
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
      lastDoorEntered: null,
      setFlash: false,
      isIdle: true,
      isAttacking: false,
      isPotioning: false,
      isCharging: false,
      // npcAttackReady: false, /* Used on server for only NPCs */
      isDead: false,
      activeSets: [],
      lastAngle: Phaser.Math.DegToRad(getAngleFromDirection(this.direction)),
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
    return this.buffs?.some((b) => b?.name === name);
  }
  doAttack(props: any) {
    //placeholder
  }
  doAttackRanged(props: any) {
    //placeholder
  }
  modifyStat(key: string, amount: any) {
    const stat: integer = parseInt(this?.stats?.[key]);
    const intAmount: integer = parseInt(amount);

    const maxStat = this?.stats?.["max" + capitalize(key)];
    if (typeof stat === undefined) return;
    if (typeof maxStat === undefined) return;
    if (stat + intAmount > maxStat) {
      this.stats[key] = maxStat;
      return;
    }
    if (stat + intAmount < 0) {
      this.stats[key] = 0;
      return;
    }
    this.stats[key] += intAmount;
  }
  getFullAttackDelay() {
    let attackDelay = this.stats.attackDelay;
    if (this.isDualWielding()) {
      attackDelay = attackDelay / 2;
    }
    return attackDelay;
  }
  checkAttackReady() {
    const attackDelay = this.getFullAttackDelay();
    const cooldown = attackDelay;
    const timeElapsed = Date.now() - this.state.lastAttack;
    const timeRemaining = Math.max(cooldown - timeElapsed, 0);
    const percentageRemaining = (timeRemaining / cooldown) * 100;
    const isReady = percentageRemaining === 0;
    this.state.isAttacking = !isReady;
    return { cooldown, timeRemaining, timeElapsed, percentageRemaining, isReady };
  }
  checkPotionCooldown() {
    const cooldown = POTION_COOLDOWN; // Cooldown time in milliseconds
    const timeElapsed = Date.now() - this.state.lastPotion;
    const timeRemaining = Math.max(cooldown - timeElapsed, 0);
    const percentageRemaining = (timeRemaining / cooldown) * 100;
    const isReady = percentageRemaining === 0;
    this.state.isPotioning = !isReady;
    return { percentageRemaining, timeRemaining, isReady };
  }
  getWeaponRange(hand = "handLeft") {
    const weaponRange = this?.visibleEquipment?.[hand]?.stats?.range;
    if (weaponRange) {
      return (this?.visibleEquipment?.[hand]?.stats?.range || 1) * RANGE_MULTIPLIER;
      /* NPCs attack at this range  */
    } else return 8 + this.bodySize;
  }
  checkOutOfCombat() {
    const isOutOfCombat = Date.now() - this.state.lastCombat > 5000;
    return isOutOfCombat;
  }
  isDualWielding(key = "visibleEquipment") {
    return this.hasWeaponLeft(key) && this.hasWeaponRight(key);
  }
  hasWeapon(key = "visibleEquipment") {
    return this.hasWeaponLeft(key) || this.hasWeaponRight(key);
  }
  hasWeaponLeft(key = "visibleEquipment") {
    return ["weapon", "ranged"].includes(this?.[key]?.handLeft?.type);
  }
  hasWeaponRight(key = "visibleEquipment") {
    return (
      ["weapon", "ranged"].includes(this?.[key]?.handRight?.type) || this.profile.race !== "human"
    );
  }
  hasShieldLeft(key = "visibleEquipment") {
    return ["shield"].includes(this?.[key]?.handLeft?.type);
  }
  hasShieldRight(key = "visibleEquipment") {
    return ["shield"].includes(this?.[key]?.handRight?.type);
  }
  hasShield(key = "visibleEquipment") {
    return this.hasShieldLeft(key) || this.hasShieldRight(key);
  }
  hasRangedWeaponLeft(key = "visibleEquipment") {
    return ["ranged"].includes(this?.[key]?.handLeft?.type);
  }
  hasRangedWeaponRight(key = "visibleEquipment") {
    return ["ranged"].includes(this?.[key]?.handRight?.type);
  }
  hasRangedWeapon(key = "visibleEquipment") {
    return this.hasRangedWeaponLeft(key) || this.hasRangedWeaponRight(key);
  }
  checkCastReady(spellName?: string) {
    const now = Date.now();
    let isThisSpellReady = true;
    if (spellName) {
      const baseCooldown = spellDetails?.[spellName]?.baseCooldown ?? 0;
      const lastCast = this.state.lastCast?.[spellName] ?? Date.now() - POTION_COOLDOWN;
      isThisSpellReady = now - lastCast > this?.stats?.castDelay + baseCooldown;
    }
    const isGlobalReady = now - this.state.lastCast.global > this?.stats?.castDelay;
    return isThisSpellReady && isGlobalReady;
  }
  canCastSpell(abilitySlot) {
    if (this.state.isDead) return false;
    const ability: Item = this?.abilities?.[abilitySlot];
    if (!this.checkCastReady(ability?.base)) return false;
    const mpCost = ability?.stats?.mpCost ?? 0;
    return this?.stats?.mp >= mpCost;
  }
  triggerSecondAttack() {
    if (this.state.isAttacking) return;
    if (this.action === "attack_right" && this.hasWeaponLeft()) {
      this.doAttack({ count: 2, castAngle: this.state.lastAngle });
    }
  }
  updateVisibleEquipment() {
    this.visibleEquipment = this.getVisibleEquipment();
  }
  getVisibleEquipment() {
    return filterVisibleEquipment(this as FullCharacterState);
  }
  getAttackActionName({ count }) {
    let action = this.action;
    let spellName = "attack_right";

    if (!RACES_WITH_ATTACK_ANIMS.includes(this.profile.race)) {
      return { action, spellName };
    }

    if (count === 1) {
      if (this.hasWeaponRight()) {
        action = "attack_right";
        spellName = this.hasRangedWeaponRight() ? action + "_ranged" : action;
      } else if (this.hasWeaponLeft()) {
        action = "attack_left";
        spellName = this.hasRangedWeaponLeft() ? action + "_ranged" : action;
      }
    } else if (count === 2 && this.hasWeaponLeft()) {
      action = "attack_left";
      spellName = this.hasRangedWeaponLeft() ? action + "_ranged" : action;
    }

    return { action, spellName };
  }
  getPlayerQuestStatus(quest: Quest) {
    const playerQuest = this.quests.find((q) => q?.questId === quest?.id);
    if (!playerQuest) return null;
    /* Create PlayerQuestObjectives */
    const objectives = quest?.objectives?.reduce((acc, objective, idx) => {
      let isReady = false;
      let numKilled = 0;
      let numCollected = 0;
      /* Check if the player has enough kills of the target NPC */
      if (objective?.type === "bounty") {
        numKilled = this.npcKills[objective?.monster as string] || 0;
        isReady = numKilled >= objective?.amount;
      }
      /* Check if the player has enough items of the target item */
      if (objective?.type === "item") {
        const item =
          this.findInventoryQuestItem(objective?.item as string[]) ||
          this.findBagQuestItem(objective?.item as string[]) ||
          this.findAbilityQuestItem(objective?.item as string[]);
        numCollected = item?.amount || 0;
        isReady = numCollected >= objective?.amount;
      }
      /* Add the playerObjective to the list */
      acc.push({
        questId: quest?.id,
        objectiveId: idx,
        isReady,
        numKilled,
        numCollected,
      });
      return acc;
    }, []);
    return {
      questId: quest?.id,
      isReady: objectives?.every((o) => o?.isReady) || playerQuest?.isReady,
      isCompleted: playerQuest?.isCompleted,
      objectives,
    };
  }
  findInventoryQuestItem(target: Array<string>) {
    const item = this.inventory.find(
      (i: Item) => i?.slot === target?.[0] && i?.rarity === target?.[1] && i?.key === target?.[2]
    );
    return item;
  }
  findBagQuestItem(target: Array<string>) {
    let item = null;
    const bags = this?.inventory?.filter((item: Item) => item?.base === "bag");
    for (const bag of bags) {
      const found = bag?.items?.find?.(
        (i: Item) => i?.slot === target?.[0] && i?.rarity === target?.[1] && i?.key === target?.[2]
      );
      if (found) {
        return found;
      }
    }

    return item;
  }
  findAbilityQuestItem(target: Array<string>): any {
    const [slotName, foundItem] = Object.entries(this?.abilities).find(
      ([_, slotItem]: [string, Item]) =>
        slotItem?.slot === target?.[0] &&
        slotItem?.rarity === target?.[1] &&
        slotItem?.key === target?.[2]
    ) || [null, null];
    return foundItem;
  }
  getAttackSpCost(count: number) {
    const visibleEquipment = this.getVisibleEquipment();

    if (count === 1) {
      return (
        visibleEquipment?.handRight?.stats?.spCost || visibleEquipment?.handLeft?.stats?.spCost || 0
      );
    }

    if (count === 2) {
      return visibleEquipment?.handLeft?.stats?.spCost || 0;
    }

    return 1;
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

export default Character;
