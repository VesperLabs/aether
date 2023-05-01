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
  calculateActiveItemSlots() {
    const { equipment = {}, abilities = {} } = this;
    const baseStatKeys = ["vitality", "dexterity", "strength", "intelligence"];
    const allItems = Object.entries({ ...equipment, ...abilities });
    const percentStats = Object.fromEntries(baseStatKeys.map((stat) => [stat, 0]));
    const baseStats = {
      ...Object.fromEntries(baseStatKeys.map((stat) => [stat, 0])),
      ...this.baseStats,
    };
    const activeItemSlots = allItems?.map(([slotKey, _]: [string, Item]) => slotKey);
    const activeSets = [];
    const setItems = [];

    for (const key of baseStatKeys) {
      // get all worn items
      const wornItems = allItems
        .map(([slotKey, item]: [string, Item]) => ({
          slotKey, // the slot key is the key of the item in the equipment or ability object
          ...item,
        }))
        .filter((i) => i)
        .filter((i) => activeItemSlots.includes(i.slotKey))
        .sort((a, b) => {
          // if the item doesn't have a requirement, it should be at the beginning of the list
          return a?.requirements?.[key] || 0 - b?.requirements?.[key] || 0;
        });

      for (const item of wornItems) {
        // if the item has a requirement and the character doesn't meet it, remove the item from the list
        // + Math.floor(baseStats[key] * (percentStats[key] / 100))
        if (
          item?.requirements?.[key] >
          baseStats[key] + Math.floor(baseStats[key] * (percentStats[key] / 100))
        ) {
          activeItemSlots.splice(activeItemSlots.indexOf(item.slotKey), 1);
          continue;
        }
        // if the item has a stat, add it
        if (item?.stats?.[key]) {
          baseStats[key] += item?.stats?.[key];
        }
        // if the item has a percent stat, add it
        if (item?.percentStats?.[key]) {
          percentStats[key] += item.percentStats[key];
        }
        // if the item is part of a set check if whole set is worn
        if (item?.setName) {
          // add item to set item list if it's not already there
          if (!setItems.find((i) => i.id === item.id)) setItems.push(item);
          const setInfo = ItemBuilder.getSetInfo(item.setName);
          const currentSetItems = setItems.filter((i) => i.setName == item.setName);
          if (currentSetItems?.length >= setInfo?.pieces) {
            console.log(currentSetItems?.length, setInfo);
            activeSets.push(item.setName);
            //add the set bonus
            if (setInfo?.stats?.[key]) {
              baseStats[key] += setInfo?.stats?.[key];
            }
            // if the item has a percent stat, add it
            if (setInfo?.percentStats?.[key]) {
              percentStats[key] += setInfo.percentStats[key];
            }
          }
        }
      }
    }

    this.activeItemSlots = activeItemSlots;
  }
  calculateStats() {
    this.calculateActiveItemSlots();
    const { equipment = {}, abilities = {} } = this;
    // disregard items that are not actively equipped
    const allSlots = Object.keys({ ...abilities, ...equipment }).filter((slot) =>
      this.activeItemSlots?.includes(slot)
    );
    let totalPercentStats = {};
    let ns = cloneObject(this.baseStats);
    let setList = {};
    let activeSets = [];

    this.stats = Object.keys(this?.stats)?.length ? this.stats : { hp: 0, mp: 0, exp: 0 };

    /* Get stats from equipped abilities and items */
    allSlots.forEach((eKey) => {
      let item = abilities[eKey] || equipment[eKey];
      if (item) {
        if (item.setName) {
          if (setList[item.setName]) {
            let amountThisItem = 0;
            allSlots.forEach((aKey) => {
              let aItem = abilities[aKey] || equipment[aKey];
              if (aItem && aItem.key == item.key) {
                amountThisItem++;
              }
            });
            if (amountThisItem == 1) {
              setList[item.setName]++;
            }
          } else {
            setList[item.setName] = 1;
          }
        }
        if (item.percentStats) {
          Object.keys(item.percentStats).forEach((key) => {
            if (!totalPercentStats[key]) {
              totalPercentStats[key] = item.percentStats[key];
            } else {
              totalPercentStats[key] += item.percentStats[key];
            }
          });
        }
        if (item.stats) {
          Object.keys(item.stats).forEach((key) => {
            let itemStat = item.stats[key];
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
      }
    });

    /* if more than one set item is equipped, we might have a set bonus */
    Object.keys(setList).forEach((key) => {
      if (ItemBuilder.getSetInfo(key)) {
        const setInfo = ItemBuilder.getSetInfo(key);
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

    /* percentage stats need to be summed up and added last */
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
    ns.speed = ns.speed + ns.dexterity * 0.03;
    ns.dodgeChance = ns.dodgeChance + ns.dexterity * 0.03;
    //ns.blockChance = ns.blockChance + (0 * (ns.dexterity - 15)) / (ns.level * 2);
    ns.blockChance = ns.blockChance;
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
    if (this.stats.hp < 1) ns.hp = ns.maxHp;
    else if (this.stats.hp > ns.maxHp) ns.hp = ns.maxHp;
    else ns.hp = this.stats.hp;
    if (this.stats.mp < 1) ns.mp = ns.maxMp;
    else if (this.stats.mp > ns.maxMp) ns.mp = ns.maxMp;
    else ns.mp = this.stats.mp;
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
    }
    if (isMpRegenReady && this.stats.mp < this.stats.maxMp) {
      this.state.doMpRegen = true;
      this.state.lastMpRegen = now;
      this.modifyStat("mp", this.stats.regenMp);
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
