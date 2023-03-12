import BaseCharacter from "../src/Character";
import { randomNumber } from "./utils";

class Character extends BaseCharacter {
  constructor(scene, args) {
    super(scene, args);
    this.room = args?.room;
    this.scene = scene;
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.calculateStats();
  }
  calculateStats() {
    const { equipment } = this;
    let totalPercentStats = {};
    let ns = JSON.parse(JSON.stringify(this.baseStats));
    let setList = {};
    this.stats = { hp: null, mp: null, exp: null };
    /* Normal equipment Stats */
    Object.keys(equipment).forEach((eKey) => {
      if (equipment[eKey]) {
        if (equipment[eKey].set) {
          if (setList[equipment[eKey].set]) {
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
              setList[equipment[eKey].set]++;
            }
          } else {
            setList[equipment[eKey].set] = 1;
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
              if (eKey == "handLeft") {
                if (
                  (key == "minDamage" || key == "maxDamage") &&
                  equipment[eKey].type == "weapon"
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
    ns.expValue = ns.expValue || 0;
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
    ns.critMultiplier = ns.critMultiplier + ns.intelligence * 0.03;
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
  calculateDamage(victim) {
    if (victim?.state?.isDead) return false;
    let hit = {};
    let isCriticalHit = false;
    let damage = randomNumber(this.stats.minDamage, this.stats.maxDamage);
    let defense = victim.stats.defense || 1;
    let armorPierce = this.stats.armorPierce || 1;
    let reduction = armorPierce / defense;
    if (reduction > 1) reduction = 1;
    let reducedDamage = damage * reduction;
    if (reducedDamage < 1) reducedDamage = 1;
    if (randomNumber(1, 100) >= Math.max(0, victim.stats.dodgeChance - this.stats.accuracy)) {
      if (randomNumber(1, 100) >= victim.stats.blockChance) {
        //critical
        if (this.stats.critChance) {
          if (randomNumber(1, 100) <= this.stats.critChance) {
            isCriticalHit = true;
            reducedDamage = reducedDamage * this.stats.critMultiplier;
          }
        }
        //victim hit
        reducedDamage = Math.floor(reducedDamage);
        victim.stats.hp -= reducedDamage;
        victim.state.lastCombat = Date.now();
        //only lock a user if an attack hits
        if (victim.state.isRobot) {
          victim.state.lockedUser = this;
        }
        //damage types
        if (victim.stats.hp <= 0) {
          hit = {
            type: "death",
            isCritical: isCriticalHit,
            amount: reducedDamage,
            from: this.id,
            to: victim.id,
          };
          victim.setDead();
          victim.stats.hp = 0;
        } else {
          if (isCriticalHit) {
            hit = {
              type: "critical",
              amount: reducedDamage,
              from: this.id,
              to: victim.id,
            };
          } else {
            hit = {
              type: "hit",
              amount: reducedDamage,
              from: this.id,
              to: victim.id,
            };
          }
        }
      } else {
        hit = { type: "block", amount: 0, from: this.id, to: victim.id };
      } //blockchance
    } else {
      hit = { type: "miss", amount: 0, from: this.id, to: victim.id };
    } //hitchance
    return hit;
  }
}

export default Character;
