import Phaser from "phaser";
import { capitalize, getAngleFromDirection } from "./utils";
const BLANK_TEXTURE = "human-blank";
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
  hitBox: any;
  hitBoxSize: any;
  headY: number;
  bodySize: number;
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
      doMpRegen: false,
      lastTeleport: Date.now(),
      deadTime: Date.now(),
      lastHpRegen: Date.now(),
      lastMpRegen: Date.now(),
      lastCombat: Date.now(),
      lastRegen: Date.now(),
      lastAttack: Date.now(),
      lastCast: Date.now(),
      lastFlash: Date.now(),
      lastDoorEntered: null,
      setFlash: false,
      isIdle: true,
      isAttacking: false,
      isCharging: false,
      isCasting: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
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
    this.bodySize = 8 * (this?.profile?.scale || 1);
    this.bodyOffsetY = -14 * (this?.profile?.scale || 1);
    this.body.setCircle(this.bodySize, -this.bodySize, -this.bodySize);

    this.createHitBox(scene, hitBoxSize);
    this.updateVisibleEquipment();
    this.checkAttackHands();
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
    this.add(this.hitBox);
  }
  doAttack(count: integer) {
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
  checkAttackReady(delta) {
    // let attackDelay = 0;
    // if (p.action === "attack_right") attackDelay = p?.equipment?.handRight?.stats?.attackDelay;
    // if (p.action === "attack_left") attackDelay = p?.equipment?.handLeft?.stats?.attackDelay;
    if (Date.now() - this.state.lastAttack > delta + this?.stats?.attackDelay) {
      this.state.isAttacking = false;
    }
  }
  checkCastReady(delta: number = 0) {
    const isCastReady = Date.now() - this.state.lastCast > delta + this?.stats?.castDelay;
    if (isCastReady) {
      this.state.isCasting = false;
    } else {
      this.state.isCasting = true;
    }
    return isCastReady;
  }
  canCastSpell(abilitySlot) {
    const { mpCost } = this?.abilities?.[abilitySlot] || {};
    if (this?.stats?.mp < mpCost) return false;
    return true;
  }
  triggerSecondAttack() {
    if (this.action === "attack_right" && this.state.hasWeaponLeft) {
      this.doAttack(2);
    }
  }
  updateVisibleEquipment() {
    this.visibleEquipment = Object.fromEntries(
      Object.entries(this?.equipment).filter(([key]) => this.activeItemSlots.includes(key))
    );
  }
  checkAttackHands() {
    this.state.hasWeaponRight = false;
    this.state.hasWeaponLeft = false;
    this.state.hasWeapon = false;
    /* Can only attack with a hand if it contains a weapon type item  */
    const leftType = this.visibleEquipment?.handLeft?.type;
    const rightType = this.visibleEquipment?.handRight?.type;
    if (rightType === "weapon") this.state.hasWeaponRight = true;
    if (leftType === "weapon") this.state.hasWeaponLeft = true;
    if (this.profile.race !== "human") this.state.hasWeaponRight = true;
    if (this.state.hasWeaponRight || this.state.hasWeaponLeft) this.state.hasWeapon = true;
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
          this.findBagQuestItem(objective?.item as string[]);
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
      item = bag?.items?.find?.(
        (i: Item) => i?.slot === target?.[0] && i?.rarity === target?.[1] && i?.key === target?.[2]
      );
    }
    return item;
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

export default Character;
