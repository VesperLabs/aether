import Phaser from "phaser";

class Character extends Phaser.GameObjects.Container {
  constructor(scene, args) {
    const {
      x,
      y,
      socketId,
      id,
      isHero = false,
      room,
      equipment = {},
      profile,
      stats = {},
      bubbleMessage,
      kind,
      roomName,
      baseStats = {},
      direction,
      state = {},
    } = args;
    super(scene, x, y, []);
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
      isAggro: false,
      lastCombat: Date.now(),
      lastAttack: Date.now(),
      isIdle: true,
      isAttacking: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
      isDead: false,
      ...state,
    };
    this.profile = profile;
    this.equipment = equipment;
    this.baseStats = baseStats;
    this.stats = stats;
    this.bubbleMessage = bubbleMessage;
    scene.physics.add.existing(this);
    const bodySize = 8 * (this?.profile?.scale || 1);
    this.body.setCircle(bodySize, -bodySize, -bodySize);
  }
  calculateStats() {
    let totalPercentStats = {};
    let ns = JSON.parse(JSON.stringify(this.baseStats));
    let setList = {};
    /* Normal equipment Stats */
    Object.keys(this.equipment).forEach((eKey) => {
      if (this.equipment[eKey]) {
        if (this.equipment[eKey].set) {
          if (setList[this.equipment[eKey].set]) {
            //checking to see that the weapons are different parts of the set etc...
            let amountThisItem = 0;
            Object.keys(this.equipment).forEach((aKey) => {
              if (this.equipment[aKey]) {
                if (this.equipment[aKey].key == this.equipment[eKey].key) {
                  amountThisItem++;
                }
              }
            });
            if (amountThisItem == 1) {
              setList[this.equipment[eKey].set]++;
            }
          } else {
            setList[this.equipment[eKey].set] = 1;
          }
        }
        if (this.equipment[eKey].percentStats) {
          Object.keys(this.equipment[eKey].percentStats).forEach((key) => {
            if (!totalPercentStats[key]) {
              totalPercentStats[key] = this.equipment[eKey].percentStats[key];
            } else {
              totalPercentStats[key] += this.equipment[eKey].percentStats[key];
            }
          });
        }
        if (this.equipment[eKey].stats) {
          Object.keys(this.equipment[eKey].stats).forEach((key) => {
            let itemStat = this.equipment[eKey].stats[key];
            if (itemStat) {
              if (eKey == "handLeft") {
                if (key == "range") {
                  /* Left hand does not add range */
                } else if (
                  (key == "minDamage" || key == "maxDamage") &&
                  this.equipment[eKey].type == "weapon"
                ) {
                  /* Left handed weapons only add half damage */
                  ns[key] += Math.floor(itemStat / 2);
                } else {
                  ns[key] += itemStat;
                }
              } else {
                ns[key] += itemStat;
              }
            }
          });
        }
      }
    });
    /* Sees what set items are worn, if enough are worn, add SET BONUS */
    this.activeSets = [];
    Object.keys(setList).forEach((key) => {
      if (ItemBuilder.getSetInfo(key)) {
        let setInfo = ItemBuilder.getSetInfo(key);
        if (setList[key] >= setInfo.pieces) {
          this.activeSets.push(key);
          //add percent bonus to totals
          if (setInfo.percentStats) {
            Object.keys(setInfo.percentStats).forEach((key) => {
              if (!totalPercentStats[key]) {
                totalPercentStats[key] = setInfo.percentStats[key];
              } else {
                totalPercentStats[key] += setInfo.percentStats[key];
              }
            });
            if (setInfo.stats) {
              Object.keys(setInfo.stats).forEach((key) => {
                let itemStat = setInfo.stats[key];
                if (itemStat) {
                  ns[key] += itemStat;
                }
              });
            }
          }
        }
      }
    });
    /* WIP: Percent Stats...  */
    Object.keys(totalPercentStats).forEach((key) => {
      let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
      if (key == "vitality" || key == "dexterity" || key == "strength" || key == "intelligence")
        ns[key] += percentIncrease;
    });

    ns.unspentStats = ns.unspentStats || 0;
    ns.expValue = ns.expValue || 0;
    ns.range = ns.range || 0;
    ns.maxHp = ns.maxHp + ns.vitality * 3;
    ns.maxMp = ns.maxMp + ns.intelligence * 3;
    ns.regenHp = ns.regenHp || 0;
    ns.regenMp = ns.regenMp || 0;
    ns.magicFind = ns.magicFind || 0;
    ns.maxExp = ns.maxExp || 0;
    ns.exp = this.stats.exp || 0;
    ns.attackSpeed = ns.attackSpeed || 0;
    ns.spellDamage = ns.spellDamage || 0;
    ns.attackSpeed = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackSpeed;
    ns.castSpeed = ns.castSpeed || 1000;
    ns.castSpeed = 1 - Math.floor(ns.intelligence * 0.5) + ns.castSpeed;
    ns.spellDamage = ns.spellDamage + Math.floor(ns.intelligence / 10);
    ns.accuracy = ns.accuracy;
    ns.regenHp = ns.regenHp + Math.floor(ns.vitality / 10);
    ns.regenMp = ns.regenMp + Math.floor(ns.intelligence / 10);
    ns.armorPierce = ns.armorPierce + ns.dexterity * 3;
    ns.defense = ns.defense + ns.strength * 3;
    ns.critChance = ns.critChance + ns.dexterity * 0.05;
    ns.critMultiplyer = ns.critMultiplyer + ns.intelligence * 0.03;
    ns.speed = ns.speed + ns.dexterity * 0.003;
    //ns.blockChance = ns.blockChance + (0 * (ns.dexterity - 15)) / (ns.level * 2);
    ns.blockChance = ns.blockChance;
    ns.dodgeChance = ns.dodgeChance;
    if (ns.critChance > 100) ns.critChance = 100;
    if (ns.dodgeChance > 100) ns.dodgeChance = 100;
    if (ns.blockChance > 100) ns.blockChance = 100;
    ns.maxDamage =
      ns.maxDamage + Math.floor(1 + ((ns.strength + ns.dexterity / 2) * ns.level) / 100);
    ns.minDamage =
      ns.minDamage + Math.floor(1 + ((ns.strength + ns.dexterity / 2) * ns.level) / 100);

    /* WIP: After Percent Stats...  */
    Object.keys(totalPercentStats).forEach((key) => {
      let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
      if (key == "maxHp" || key == "maxMp") ns[key] += percentIncrease;
    });

    //moving values
    if (this.stats.hp < 1) ns.hp = ns.maxHp;
    else if (this.stats.hp > ns.maxHp) ns.hp = ns.maxHp;
    else ns.hp = this.stats.hp;
    if (this.stats.mp < 1) ns.mp = ns.maxMp;
    else if (this.stats.mp > ns.maxMp) ns.mp = ns.maxMp;
    else ns.mp = this.stats.mp;
    this.stats = ns;
  }
}

export default Character;
