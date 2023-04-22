import Character from "../shared/Character";
import ItemBuilder from "./ItemBuilder";
import { randomNumber, cloneObject } from "./utils";

class ServerCharacter extends Character {
  declare scene: ServerScene;
  constructor(scene: ServerScene, args) {
    super(scene, args);
    this.room = args?.room;
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.calculateStats();
  }
  getQuests() {
    if (!this.quests?.length) return [];
    return this?.quests?.map((q) => {
      return {
        ...q,
        /* We pass the rewards here so that the items are built with the correct stats */
        rewards: this.scene.quests[q?.questId]?.rewards,
      };
    });
  }
  calculateStats() {
    const { equipment = {}, abilities = {}, stats = { hp: 0, mp: 0, exp: 0 } } = this;
    let totalPercentStats = {};
    let ns = cloneObject(this.baseStats);
    let setList = {};
    let activeSets = [];

    /* Normal ability Stats */
    Object.keys(abilities).forEach((eKey) => {
      if (abilities[eKey]) {
        if (abilities[eKey].setName) {
          if (setList[abilities[eKey].setName]) {
            //checking to see that the weapons are different parts of the set etc...
            let amountThisItem = 0;
            Object.keys(abilities).forEach((aKey) => {
              if (abilities[aKey]) {
                if (abilities[aKey].key == abilities[eKey].key) {
                  amountThisItem++;
                }
              }
            });
            if (amountThisItem == 1) {
              setList[abilities[eKey].setName]++;
            }
          } else {
            setList[abilities[eKey].setName] = 1;
          }
        }
        if (abilities[eKey].percentStats) {
          Object.keys(abilities[eKey].percentStats).forEach((key) => {
            if (!totalPercentStats[key]) {
              totalPercentStats[key] = abilities[eKey].percentStats[key];
            } else {
              totalPercentStats[key] += abilities[eKey].percentStats[key];
            }
          });
        }
        if (abilities[eKey].stats) {
          Object.keys(abilities[eKey].stats).forEach((key) => {
            let itemStat = abilities[eKey].stats[key];
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
      }
    });

    /* Normal equipment Stats */
    Object.keys(equipment).forEach((eKey) => {
      if (equipment[eKey]) {
        if (equipment[eKey].setName) {
          if (setList[equipment[eKey].setName]) {
            //checking to see that the weapons are different parts of the set etc...
            let amountThisItem = 0;
            Object.keys(equipment).forEach((aKey) => {
              if (equipment[aKey]) {
                if (equipment[aKey].key == equipment[eKey].key) {
                  amountThisItem++;
                }
              }
            });
            if (amountThisItem == 1) {
              setList[equipment[eKey].setName]++;
            }
          } else {
            setList[equipment[eKey].setName] = 1;
          }
        }
        if (equipment[eKey].percentStats) {
          Object.keys(equipment[eKey].percentStats).forEach((key) => {
            if (!totalPercentStats[key]) {
              totalPercentStats[key] = equipment[eKey].percentStats[key];
            } else {
              totalPercentStats[key] += equipment[eKey].percentStats[key];
            }
          });
        }
        if (equipment[eKey].stats) {
          Object.keys(equipment[eKey].stats).forEach((key) => {
            let itemStat = equipment[eKey].stats[key];
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
      }
    });
    /* Sees what set items are worn, if enough are worn, add SET BONUS */
    Object.keys(setList).forEach((key) => {
      if (ItemBuilder.getSetInfo(key)) {
        let setInfo = ItemBuilder.getSetInfo(key);
        if (setList[key] >= setInfo.pieces) {
          activeSets.push(key);
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
    ns.expValue = ns.expValue || 0;
    ns.maxHp = ns.maxHp + ns.vitality * 3;
    ns.maxMp = ns.maxMp + ns.intelligence * 3;
    ns.regenHp = ns.regenHp || 0;
    ns.regenMp = ns.regenMp || 0;
    ns.magicFind = ns.magicFind || 0;
    ns.maxExp = ns.maxExp || 0;
    ns.exp = stats.exp || 0;
    ns.attackDelay = ns.attackDelay || 0;
    ns.minSpellDamage = Math.floor((ns.minSpellDamage || 0) + ns.intelligence * 0.03);
    ns.maxSpellDamage = Math.floor((ns.maxSpellDamage || 0) + ns.intelligence * 0.03);
    ns.attackDelay = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackDelay;
    ns.castDelay = ns.castDelay || 1000;
    ns.castDelay = 1 - Math.floor(ns.intelligence * 0.5) + ns.castDelay;
    ns.accuracy = ns.accuracy;
    ns.regenHp = ns.regenHp + Math.floor(ns.vitality / 10);
    ns.regenMp = ns.regenMp + Math.floor(ns.intelligence / 10);
    ns.armorPierce = ns.armorPierce + ns.dexterity + ns.strength;
    ns.defense = ns.defense + ns.strength;
    ns.critChance = ns.critChance + ns.dexterity * 0.05;
    ns.speed = ns.speed + ns.dexterity * 0.003;
    //ns.blockChance = ns.blockChance + (0 * (ns.dexterity - 15)) / (ns.level * 2);
    ns.blockChance = ns.blockChance;
    ns.dodgeChance = ns.dodgeChance;
    if (ns.critChance > 100) ns.critChance = 100;
    if (ns.dodgeChance > 75) ns.dodgeChance = 75;
    if (ns.blockChance > 75) ns.blockChance = 75;
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
    if (stats.hp < 1) ns.hp = ns.maxHp;
    else if (stats.hp > ns.maxHp) ns.hp = ns.maxHp;
    else ns.hp = stats.hp;
    if (stats.mp < 1) ns.mp = ns.maxMp;
    else if (stats.mp > ns.maxMp) ns.mp = ns.maxMp;
    else ns.mp = stats.mp;
    this.stats = ns;

    this.state.activeSets = activeSets;
  }
  calculateSpellDamage(victim, abilitySlot) {
    if (victim?.state?.isDead) return false;
    const ability = this?.abilities?.[abilitySlot];
    const spellDamageRoll = randomNumber(this.stats?.minSpellDamage, this.stats?.maxSpellDamage);
    const fireDamageRoll = randomNumber(
      ability.effects?.minFireDamage,
      ability.effects?.maxFireDamage
    );
    /* TODO: Calculate resistences */
    let reducedDamage = spellDamageRoll + fireDamageRoll;
    /* Npcs lock on and chase when a user hits them */
    if (victim.state.isRobot) {
      victim.state.lockedPlayerId = this?.socketId;
    }
    /* Update the victim */
    reducedDamage = Math.floor(reducedDamage);
    victim.modifyStat("hp", -reducedDamage);
    victim.state.lastCombat = Date.now();
    /* Npcs lock on and chase when a user hits them */
    if (victim.state.isRobot) {
      victim.state.lockedPlayerId = this?.socketId;
    }
    /* Victim killed */
    if (victim.stats.hp <= 0) {
      victim.setDead();
      victim.stats.hp = 0;
      return {
        type: "death",
        isCritical: false,
        amount: -reducedDamage,
        from: this.id,
        to: victim.id,
      };
    }
    return {
      type: "hp",
      isCritical: false,
      amount: -reducedDamage,
      from: this.id,
      to: victim.id,
    };
  }
  calculateDamage(victim) {
    if (victim?.state?.isDead) return false;

    const dodgeRoll = randomNumber(1, 100);
    const blockRoll = randomNumber(1, 100);
    const critRoll = randomNumber(1, 100);
    const damageRoll = randomNumber(this.stats.minDamage, this.stats.maxDamage);
    const damage = damageRoll;
    const defense = Math.max(1, victim.stats.defense || 1); // Minimum defense value of 1
    const armorPierce = Math.max(1, this.stats.armorPierce || 1); // Minimum armorPierce value of 1
    const reduction = Math.min(1, armorPierce / defense); // Reduction capped at 1 (100%)
    const dodgeChance = Math.max(0, victim.stats.dodgeChance - this.stats.accuracy);
    let isCritical = false;
    let reducedDamage = Math.max(1, damage * reduction); // Minimum reducedDamage value of 1
    if (dodgeRoll < dodgeChance) {
      return { type: "miss", amount: 0, from: this.id, to: victim.id };
    }
    if (blockRoll < victim.stats.blockChance) {
      return { type: "block", amount: 0, from: this.id, to: victim.id };
    }
    if (this.stats.critChance && critRoll <= this.stats.critChance) {
      isCritical = true;
      reducedDamage = Math.max(1, reducedDamage * (this?.stats?.critMultiplier || 1)); // Minimum reducedDamage value of 1
    }
    /* Update the victim */
    reducedDamage = Math.floor(reducedDamage);
    victim.modifyStat("hp", -reducedDamage);
    victim.state.lastCombat = Date.now();
    /* Npcs lock on and chase when a user hits them */
    if (victim.state.isRobot) {
      victim.state.lockedPlayerId = this?.socketId;
    }
    /* Victim killed */
    if (victim.stats.hp <= 0) {
      victim.setDead();
      victim.stats.hp = 0;
      return {
        type: "death",
        isCritical,
        amount: -reducedDamage,
        from: this.id,
        to: victim.id,
      };
    }
    return {
      type: "hp",
      isCritical,
      amount: -reducedDamage,
      from: this.id,
      to: victim.id,
    };
  }
  doRegen() {
    const now = Date.now();
    const isOutOfCombat = now - this.state.lastCombat > 5000;
    const isHpRegenReady = now - this.state.lastHpRegen > 5000;
    const isMpRegenReady = now - this.state.lastMpRegen > 1000;
    this.state.doHpRegen = false;
    this.state.doMpRegen = false;
    if (isOutOfCombat && !this.state.isDead) {
      if (isHpRegenReady && this.stats.hp < this.stats.maxHp) {
        this.state.doHpRegen = true;
        this.state.lastHpRegen = now;
        this.modifyStat("hp", this.stats.regenHp);
      }
      if (isMpRegenReady && this.stats.mp < this.stats.maxMp) {
        this.state.doMpRegen = true;
        this.state.lastMpRegen = now;
        this.modifyStat("mp", this.stats.regenMp);
      }
    }
  }
  assignExp(amount: integer): boolean {
    let didLevel = false;
    this.stats.exp += amount;
    while (this.stats.exp >= this.baseStats.maxExp) {
      let trailingExp = this.stats.exp - this.baseStats.maxExp;
      this.stats.exp = trailingExp;
      this.baseStats.maxExp = Math.floor(this.baseStats.maxExp * 1.5);
      if (this.charClass == "warrior") this.baseStats.strength += 1;
      else if (this.charClass == "rogue") this.baseStats.dexterity += 1;
      else if (this.charClass == "mage") this.baseStats.intelligence += 1;
      else if (this.charClass == "cleric") this.baseStats.vitality += 1;
      this.baseStats.strength += 1;
      this.baseStats.dexterity += 1;
      this.baseStats.intelligence += 1;
      this.baseStats.vitality += 1;
      this.baseStats.level++;
      // this.stats.hp = this.baseStats.maxHp;
      // this.stats.mp = this.baseStats.maxMp;
      didLevel = true;
    }
    this.calculateStats();
    return didLevel;
  }
}

export default ServerCharacter;
