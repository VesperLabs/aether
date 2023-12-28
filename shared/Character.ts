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
    return this.buffs?.some((b) => b?.name === name);
  }
  getBuff(name: string): Buff {
    return this.buffs?.find((b) => b?.name === name);
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
      attackDelay = (attackDelay + 60) / 2;
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
  static hasWeapon(character, key = "visibleEquipment") {
    return Character.hasWeaponLeft(character, key) || Character.hasWeaponRight(character, key);
  }
  static hasWeaponLeft(character, key = "visibleEquipment") {
    return ["weapon", "ranged"].includes(character?.[key]?.handLeft?.type);
  }
  static hasWeaponRight(character, key = "visibleEquipment") {
    return (
      ["weapon", "ranged"].includes(character?.[key]?.handRight?.type) ||
      character.profile.race !== "human"
    );
  }
  static hasShieldLeft(character, key = "visibleEquipment") {
    return ["shield"].includes(character?.[key]?.handLeft?.type);
  }
  static hasShieldRight(character, key = "visibleEquipment") {
    return ["shield"].includes(character?.[key]?.handRight?.type);
  }
  static hasShield(character, key = "visibleEquipment") {
    return Character.hasShieldLeft(character, key) || Character.hasShieldRight(character, key);
  }
  static hasRangedWeaponLeft(character, key = "visibleEquipment") {
    return ["ranged"].includes(character?.[key]?.handLeft?.type);
  }
  static hasRangedWeaponRight(character, key = "visibleEquipment") {
    return ["ranged"].includes(character?.[key]?.handRight?.type);
  }
  static hasRangedWeapon(character, key = "visibleEquipment") {
    return (
      Character.hasRangedWeaponLeft(character, key) ||
      Character.hasRangedWeaponRight(character, key)
    );
  }
  static hasMeleeWeaponLeft(character, key = "visibleEquipment") {
    return ["weapon"].includes(character?.[key]?.handLeft?.type);
  }
  static hasMeleeWeaponRight(character, key = "visibleEquipment") {
    return ["weapon"].includes(character?.[key]?.handRight?.type);
  }
  static hasMeleeWeapon(character, key = "visibleEquipment") {
    return (
      Character.hasMeleeWeaponLeft(character, key) || Character.hasMeleeWeaponRight(character, key)
    );
  }
  static hasAttackableWeapons(character, key = "visibleEquipment") {
    // Double shields or Bow+Other is a nono
    const hasRangedAndOther =
      Character.hasRangedWeapon(character, key) &&
      (Character.isDualWielding(character, key) || Character.hasShield(character, key));
    const hasDoubleShields =
      Character.hasShieldLeft(character, key) && Character.hasShieldRight(character, key);
    if (hasRangedAndOther || hasDoubleShields) return false;
    return true;
  }
  static hasVisibleWeaponType(character, weaponType: "melee" | "ranged", key = "visibleEquipment") {
    if (
      weaponType === "melee" &&
      Character.hasAttackableWeapons(character, key) &&
      Character.hasMeleeWeapon(character, key)
    ) {
      return true;
    }
    return false;
  }
  static isDualWielding(character, key = "visibleEquipment") {
    return Character.hasWeaponLeft(character, key) && Character.hasWeaponRight(character, key);
  }
  isDualWielding(key = "visibleEquipment") {
    return Character.isDualWielding(this, key);
  }
  hasWeaponLeft(key = "visibleEquipment") {
    return Character.hasWeaponLeft(this, key);
  }
  hasWeaponRight(key = "visibleEquipment") {
    return Character.hasWeaponRight(this, key);
  }
  hasShieldLeft(key = "visibleEquipment") {
    return Character.hasShieldLeft(this, key);
  }
  hasShieldRight(key = "visibleEquipment") {
    return Character.hasShieldRight(this, key);
  }
  hasRangedWeaponLeft(key = "visibleEquipment") {
    return Character.hasRangedWeaponLeft(this, key);
  }
  hasRangedWeaponRight(key = "visibleEquipment") {
    return Character.hasRangedWeaponRight(this, key);
  }
  hasMeleeWeaponLeft(key = "visibleEquipment") {
    return Character.hasMeleeWeaponLeft(this, key);
  }
  hasMeleeWeaponRight(key = "visibleEquipment") {
    return Character.hasMeleeWeaponRight(this, key);
  }
  hasWeapon(key = "visibleEquipment") {
    return Character.hasWeapon(this, key);
  }
  hasShield(key = "visibleEquipment") {
    return Character.hasShield(this, key);
  }
  hasRangedWeapon(key = "visibleEquipment") {
    return Character.hasRangedWeapon(this, key);
  }
  hasMeleeWeapon(key = "visibleEquipment") {
    return Character.hasMeleeWeapon(this, key);
  }
  hasAttackableWeapons(key = "visibleEquipment") {
    return Character.hasAttackableWeapons(this, key);
  }
  hasVisibleWeaponType(weaponType, key = "visibleEquipment") {
    return Character.hasVisibleWeaponType(this, weaponType, key);
  }
  checkCastReady(spellName?: string) {
    const now = Date.now();
    let isThisSpellReady = true;
    if (spellName) {
      const baseCooldown = spellDetails?.[spellName]?.baseCooldown ?? 0;
      const lastCast = this.state.lastCast?.[spellName] ?? 0;
      isThisSpellReady = now - lastCast > this?.stats?.castDelay + baseCooldown;
    }
    const isGlobalReady = now - this.state.lastCast.global > this?.stats?.castDelay;
    return isThisSpellReady && isGlobalReady;
  }
  canCastSpell(abilitySlot, shouldUpdateState = true) {
    //if the ability slotId is not in the activeItemSlots return
    if (this?.hasBuff("stun")) return;
    if (this.state.isDead) return false;
    if (!abilitySlot) return true; //ignore attacks
    if (this.kind === "player") {
      if (!this?.activeItemSlots?.includes?.(`${abilitySlot}`)) return;
    }

    const ability: Item = this?.abilities?.[abilitySlot];
    const spellName = ability?.base;
    if (!this.checkCastReady(spellName)) return false;
    const mpCost = ability?.stats?.mpCost || 0;
    const hpCost = ability?.stats?.hpCost || 0;
    const spCost = ability?.stats?.spCost || 0;

    if (shouldUpdateState) {
      this.state.lastCast.global = Date.now();
      if (spellName) {
        this.state.lastCast[spellName] = Date.now();
      }
    }

    return this?.stats?.mp >= mpCost && this?.stats?.hp > hpCost && this?.stats?.sp >= spCost;
  }
  getAbilityDetails(abilitySlot: number) {
    let ability: Item;
    let spellName: string;

    if (!abilitySlot) {
      spellName = this.hasRangedWeapon() ? "attack-ranged" : "attack-melee";
    } else {
      ability = this?.abilities?.[abilitySlot];
      spellName = ability?.base;
    }

    return { ...ability, ...spellDetails?.[spellName], spellName };
  }
  updateVisibleEquipment() {
    this.visibleEquipment = this.getVisibleEquipment();
  }
  getVisibleEquipment() {
    return filterVisibleEquipment(this as FullCharacterState);
  }
  getAttackActionName({ count, abilitySlot }: { count: number; abilitySlot?: number }) {
    const ability = this.getAbilityDetails(abilitySlot);

    let spellName = "attack-melee";
    let action = this.action;

    // Check if the race of the profile has attack animations
    if (!RACES_WITH_ATTACK_ANIMS.includes(this.profile.race)) {
      return { action, spellName };
    }

    // Determine the action and spell name based on the count and weapon availability
    if (count === 1) {
      if (this.hasWeaponRight()) {
        action = "attack_right";
        spellName =
          ability?.base ?? (this.hasRangedWeaponRight() ? "attack-ranged" : "attack-melee");
      } else if (this.hasWeaponLeft()) {
        action = "attack_left";
        spellName =
          ability?.base ?? (this.hasRangedWeaponLeft() ? "attack-ranged" : "attack-melee");
      }
    } else if (count === 2 && this.hasWeaponLeft()) {
      action = "attack_left";
      spellName = ability?.base ?? (this.hasRangedWeaponRight() ? "attack-ranged" : "attack-melee");
    }

    return { ...ability, action, spellName };
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
