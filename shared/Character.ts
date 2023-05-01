import Phaser from "phaser";

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
  inventory: any;
  baseStats: any;
  stats: any;
  npcKills: Record<string, number>;
  quests: Array<PlayerQuest>;
  abilities: Record<string, Item>;
  activeItemSlots: Array<string>;
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
      abilities = {},
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
      setFlash: false,
      isIdle: true,
      isAttacking: false,
      isCasting: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
      isDead: false,
      activeSets: [],
      lastAngle: getInitialLastAngle(this.direction),
      ...state,
    };
    this.gold = gold;
    this.profile = { headY: -47, ...profile };
    this.equipment = equipment;
    this.abilities = abilities;
    this.inventory = inventory;
    this.baseStats = baseStats;
    this.stats = stats;
    this.npcKills = npcKills;
    this.quests = quests;
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.profile?.scale || 1);
    this.body.setCircle(bodySize, -bodySize, -bodySize);
    this.checkAttackHands();
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
  checkCastReady(delta) {
    if (Date.now() - this.state.lastCast > delta + this?.stats?.castDelay) {
      this.state.isCasting = false;
    }
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
  checkAttackHands() {
    this.state.hasWeaponRight = false;
    this.state.hasWeaponLeft = false;
    this.state.hasWeapon = false;
    /* Can only attack with a hand if it contains a weapon type item  */
    const leftType = this.equipment?.handLeft?.type;
    const rightType = this.equipment?.handRight?.type;
    if (rightType === "weapon") this.state.hasWeaponRight = true;
    if (leftType === "weapon") this.state.hasWeaponLeft = true;
    if (this.state.hasWeaponRight || this.state.hasWeaponLeft) this.state.hasWeapon = true;
  }
  getPlayerQuestStatus(quest: Quest) {
    const playerQuest = this.quests.find((q) => q?.questId === quest?.id);
    if (!playerQuest) return null;
    /* Create PlayerQuestObjectives */
    const objectives = quest?.objectives?.reduce((acc, objective) => {
      let isReady = false;
      /* Check if the player has enough kills of the target NPC */
      if (objective?.type === "bounty") {
        const npcKillCount = this.npcKills[objective?.target as string];
        isReady = npcKillCount >= objective?.amount;
      }
      /* Check if the player has enough items of the target item */
      if (objective?.type === "item") {
        const item = this.inventory.find(
          (i: Item) =>
            i?.slot === objective?.target?.[0] &&
            i?.rarity === objective?.target?.[1] &&
            i?.key === objective?.target?.[2]
        );
        isReady = item?.amount >= objective?.amount;
      }
      /* Add the playerObjective to the list */
      acc.push({ questId: objective?.questId, objectiveId: objective?.id, isReady });
      return acc;
    }, []);
    return {
      questId: quest?.id,
      isReady: objectives?.every((o) => o?.isReady),
      isCompleted: playerQuest?.isCompleted,
      objectives,
    };
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

function getInitialLastAngle(direction) {
  let angle = 0;

  if (direction === "up") angle = 270;
  if (direction === "down") angle = 90;
  if (direction === "left") angle = 180;
  if (direction === "right") angle = 0;

  return Phaser.Math.DegToRad(angle);
}

function capitalize(str) {
  if (str.length == 0) return str;
  return str[0].toUpperCase() + str.substr(1);
}

export default Character;
