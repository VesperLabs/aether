import Character from "../shared/Character";
import ItemBuilder from "../shared/ItemBuilder";
import {
  randomNumber,
  calculateNextMaxExp,
  addValuesToExistingKeys,
  calculateStats,
} from "./utils";
import buffList from "../shared/data/buffList.json";
class ServerCharacter extends Character {
  declare scene: ServerScene;
  constructor(scene: ServerScene, args) {
    super(scene, args);
    this.room = args?.room;
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  getQuests() {
    if (!this.quests?.length) return [];
    return this?.quests?.map((q) => {
      const serverQuest = this.scene.quests[q?.questId];
      return {
        ...this.getPlayerQuestStatus(serverQuest),
        /* We pass the rewards here so that the items are built with the correct stat */
        rewards: serverQuest?.rewards,
      };
    });
  }
  /* make sure character can wear items */
  calculateActiveItemSlots() {
    const { equipment = {}, abilities = {}, buffs = [] } = this;
    const baseStatKeys = [
      "vitality",
      "dexterity",
      "strength",
      "intelligence",
      "level",
      "charClass",
    ];
    const allItems = Object.entries({ ...equipment, ...abilities });
    const percentStats = Object.fromEntries(baseStatKeys.map((stat) => [stat, 0]));
    const baseStats = {
      ...Object.fromEntries(baseStatKeys.map((stat) => [stat, 0])),
      ...this.baseStats,
    };
    const activeItemSlots = allItems?.map(([slotKey, _]: [string, Item]) => slotKey);
    const activeSets = [];
    const setItems = [];

    buffs.forEach((buff: Buff) => {
      if (buff.stats) {
        Object.keys(buff.stats).forEach((key) => {
          const amount = buff.stats[key];
          if (baseStats[key]) {
            baseStats[key] += amount;
          }
        });
      }
      if (buff.percentStats) {
        Object.keys(buff.percentStats).forEach((key) => {
          const amount = buff.stats[key];
          if (percentStats[key]) {
            percentStats[key] += amount;
          }
        });
      }
    });

    // Double shields or Bow+Other is a nono
    const hasRangedAndOther =
      this.hasRangedWeapon("equipment") &&
      (this.isDualWielding("equipment") || this.hasShield("equipment"));
    const hasDoubleShields = this.hasShieldLeft("equipment") && this.hasShieldRight("equipment");

    if (hasRangedAndOther || hasDoubleShields) {
      activeItemSlots.splice(activeItemSlots.indexOf("handLeft"), 1);
      activeItemSlots.splice(activeItemSlots.indexOf("handRight"), 1);
    }

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
          return (a?.requirements?.[key] ?? 0) - (b?.requirements?.[key] ?? 0);
        });

      for (const item of wornItems) {
        const itemRequirement = item?.requirements?.[key];

        // if the item has a required char class and player does not meet it, remove from the list
        if (key === "charClass") {
          if (itemRequirement && this?.charClass !== itemRequirement) {
            activeItemSlots.splice(activeItemSlots.indexOf(item.slotKey), 1);
            continue;
          }
        }

        // if the item has a requirement and the character doesn't meet it, remove the item from the list
        const percentStatMultiplier = percentStats[key] / 100 ?? 1;
        if (itemRequirement > baseStats[key] + Math.floor(baseStats[key] * percentStatMultiplier)) {
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
  calculateElementalDamage(eleDamages, victim) {
    const {
      minFireDamage = 0,
      maxFireDamage = 0,
      minLightDamage = 0,
      maxLightDamage = 0,
      minWaterDamage = 0,
      maxWaterDamage = 0,
      minEarthDamage = 0,
      maxEarthDamage = 0,
    } = eleDamages;

    // Get the damage of the spell
    const fireDamageRoll = randomNumber(minFireDamage, maxFireDamage);
    const lightDamageRoll = randomNumber(minLightDamage, maxLightDamage);
    const waterDamageRoll = randomNumber(minWaterDamage, maxWaterDamage);
    const earthDamageRoll = randomNumber(minEarthDamage, maxEarthDamage);

    // 2.) Calculate damage reduction based on victim's resistances
    const fireResistance = (victim.stats.fireResistance || 0) / 100; // Assuming default value of 0 if not provided
    const lightResistance = (victim.stats.lightResistance || 0) / 100;
    const waterResistance = (victim.stats.waterResistance || 0) / 100;
    const earthResistance = (victim.stats.earthResistance || 0) / 100;

    const fireDamageAfterReduction = fireDamageRoll * (1 - fireResistance);
    const lightDamageAfterReduction = lightDamageRoll * (1 - lightResistance);
    const waterDamageAfterReduction = waterDamageRoll * (1 - waterResistance);
    const earthDamageAfterReduction = earthDamageRoll * (1 - earthResistance);

    // Calculate total damage after reduction
    let eleDamage = Math.floor(
      fireDamageAfterReduction +
        lightDamageAfterReduction +
        waterDamageAfterReduction +
        earthDamageAfterReduction
    );

    // Create an array called elements that includes fire, light, water, and earth,
    // but only damage of each element after reduction is greater than 0.
    const elements = [];
    if (fireDamageAfterReduction > 0) {
      elements.push({ type: "fire", damage: fireDamageAfterReduction });
    }
    if (lightDamageAfterReduction > 0) {
      elements.push({ type: "light", damage: lightDamageAfterReduction });
    }
    if (waterDamageAfterReduction > 0) {
      elements.push({ type: "water", damage: waterDamageAfterReduction });
    }
    if (earthDamageAfterReduction > 0) {
      elements.push({ type: "earth", damage: earthDamageAfterReduction });
    }

    // Sort elements array in descending order based on damage amount
    elements.sort((a, b) => b.damage - a.damage);

    return { eleDamage, elements: elements?.map((d) => d?.type) };
  }
  calculateStats(shouldHeal = false) {
    this.calculateActiveItemSlots();
    calculateStats(this, shouldHeal);
    //update server data on what hands we have items in
    this.visibleEquipment = this.getVisibleEquipment();
  }
  calculateSpellDamage(victim: any, abilitySlot: number): Array<Hit> {
    if (victim?.state?.isDead) return [];
    const hits: Array<Hit> = [];
    const { effects = {}, buffs } = this?.abilities?.[abilitySlot] ?? {};
    // add elemental damage from stats to the spell's damages
    const baseElementalDamages = addValuesToExistingKeys(effects, this?.stats);

    // add spellpower
    const dmgWithSpellPower = Object.entries(baseElementalDamages).reduce((acc, [key, value]) => {
      acc[key] = Number(value) + Number(this?.stats?.spellPower || 0);
      return acc;
    }, {});

    // calculate elemental damages
    let { eleDamage, elements } = this.calculateElementalDamage(dmgWithSpellPower, victim);
    const critRoll = randomNumber(1, 100);
    let isCritical = false;

    // add buffs if the spell has any
    if (buffs) {
      Object.entries(buffs).forEach(([name, level]) => {
        hits.push({
          type: "buff",
          from: this.id,
          buffName: name,
          elements,
          to: victim.id,
        });

        victim.addBuff(name, level);
      });
    }

    // the spell doesnt do damage,
    if (!Object.entries(effects)?.length) return hits;

    if (this.stats.critChance && critRoll <= this.stats.critChance) {
      isCritical = true;
      eleDamage = Math.max(1, eleDamage * (this?.stats?.critMultiplier || 1)); // Minimum physicalDamage value of 1
    }

    // round it
    eleDamage = Math.floor(eleDamage);

    /* Update the victim */
    victim.modifyStat("hp", -eleDamage);
    victim.state.lastCombat = Date.now();
    victim.dispelBuffsByProperty("dispelInCombat", true);

    /* Npcs lock on and chase when a user hits them */
    if (victim.state.isRobot) {
      victim.setLockedPlayerId(this?.socketId);
    }
    /* Victim killed */
    if (victim.stats.hp <= 0) {
      victim.setDead();
      victim.stats.hp = 0;
      hits.push({
        type: "death",
        amount: -eleDamage,
        elements,
        from: this.id,
        to: victim.id,
        isCritical,
      });
      return hits;
    }
    hits.push({
      type: "hp",
      amount: -eleDamage,
      elements,
      from: this.id,
      to: victim.id,
      isCritical,
    });
    return hits;
  }
  calculateAttackDamage(victim): Array<Hit> {
    if (victim?.state?.isDead) return [];
    const dodgeRoll = randomNumber(1, 100);
    const blockRoll = randomNumber(1, 100);
    const critRoll = randomNumber(1, 100);

    // damage will be min - max as a factor of the spPercent but capped at 70
    const percentage = (this.stats.sp / this.stats.maxSp) * 100;
    const cappedPercentage = percentage > 70 ? 100 : percentage;
    const range = this.stats.maxDamage - this.stats.minDamage;
    const damageRange = this.stats.minDamage + (range * cappedPercentage) / 100;
    const damage = Math.round(damageRange);

    const defense = Math.max(1, victim.stats.defense || 1); // Minimum defense value of 1
    const armorPierce = Math.max(1, this.stats.armorPierce || 1); // Minimum armorPierce value of 1
    const reduction = Math.min(1, armorPierce / defense); // Reduction capped at 1 (100%)
    const dodgeChance = Math.max(0, victim.stats.dodgeChance - this.stats.accuracy);

    let isCritical = false;
    let hits = [];
    let physicalDamage = Math.max(1, damage * reduction); // Minimum physicalDamage value of 1
    if (dodgeRoll < dodgeChance) {
      return [{ type: "miss", amount: 0, from: this.id, to: victim.id }];
    }
    if (blockRoll < victim.stats.blockChance) {
      return [{ type: "block", amount: 0, from: this.id, to: victim.id }];
    }
    if (this.stats.critChance && critRoll <= this.stats.critChance) {
      isCritical = true;
      physicalDamage = Math.max(1, physicalDamage * (this?.stats?.critMultiplier || 1)); // Minimum physicalDamage value of 1
    }
    /* Calculate elemental damage on the weapon */
    const { eleDamage, elements } = this.calculateElementalDamage(this.stats, victim);
    physicalDamage = Math.floor(physicalDamage);
    /* Update our elements array so the client can animate element hits */
    if (physicalDamage > 0) {
      elements.unshift("physical");
    }
    const totalDamage = physicalDamage + eleDamage;
    victim.modifyStat("hp", -totalDamage);
    victim.state.lastCombat = Date.now();
    victim.dispelBuffsByProperty("dispelInCombat", true);
    /* Npcs lock on and chase when a user hits them */
    if (victim.state.isRobot) {
      victim.setLockedPlayerId(this?.socketId);
    }

    // onAttackHit if we have some
    const onHitTriggers = this?.stats?.triggers?.filter((t: Trigger) => t?.event === "onAttackHit");
    if (onHitTriggers?.length) {
      onHitTriggers?.forEach((trigger: Trigger) => {
        const { name, level, type, chance } = trigger ?? {};
        const roll = randomNumber(1, chance);
        if (roll === 1) {
          if (type === "buff") {
            hits.push({
              type: "buff",
              from: this.id,
              buffName: name,
              elements,
              to: this.id,
            });
            this.addBuff(name, level);
          }
          if (type === "debuff") {
            hits.push({
              type: "buff",
              from: this.id,
              buffName: name,
              elements,
              to: victim.id,
            });
            victim.addBuff(name, level);
          }
        }
      });
    }
    // onHurt triggers if we have them
    const onHurtTriggers = victim?.stats?.triggers?.filter((t: Trigger) => t?.event === "onHurt");
    if (onHurtTriggers?.length) {
      onHurtTriggers?.forEach((trigger: Trigger) => {
        const { name, level, type, chance } = trigger ?? {};
        const roll = randomNumber(1, chance);
        if (roll === 1) {
          if (type === "buff") {
            hits.push({
              type: "buff",
              from: this.id,
              buffName: name,
              elements,
              to: victim.id,
            });
            victim.addBuff(name, level);
          }
        }
      });
    }

    /* Add stolen hp */
    if (this?.stats?.hpSteal > 0) {
      const hpSteal = Math.max(Math.round((physicalDamage * this.stats.hpSteal) / 100), 1);
      this.modifyStat("hp", hpSteal);
      hits.push({
        type: "hp",
        amount: hpSteal,
        from: victim.id,
        to: this.id,
      });
    }
    /* Add stolen mp */
    if (this?.stats?.mpSteal > 0) {
      const mpSteal = Math.max(Math.floor((physicalDamage * this.stats.mpSteal) / 100), 1);
      this.modifyStat("mp", mpSteal);
      hits.push({
        type: "mp",
        amount: mpSteal,
        from: victim.id,
        to: this.id,
      });
    }

    /* Victim killed */
    if (victim.stats.hp <= 0) {
      victim.setDead();
      victim.stats.hp = 0;
      hits.push({
        type: "death",
        isCritical,
        amount: -totalDamage,
        elements,
        from: this.id,
        to: victim.id,
      });
      return hits;
    }
    hits.push({
      type: "hp",
      isCritical,
      amount: -totalDamage,
      elements,
      from: this.id,
      to: victim.id,
    });
    return hits;
  }
  calculateDamage(victim: any, abilitySlot: number): Array<Hit> {
    /* If abilityslot is blank we are doing an attack */
    return abilitySlot
      ? this.calculateSpellDamage(victim, abilitySlot)
      : this.calculateAttackDamage(victim);
  }
  doRegen() {
    const now = Date.now();
    // we only regen HP if we have are out of combat (have rest buff) or have another regen buff
    const isResting = this.buffs?.some((b) => ["rest"]?.includes(b?.name));
    const regenBuff = this.buffs?.find((b) => ["regeneration"]?.includes(b?.name));
    const poisonBuff = this.buffs?.find((b) => ["poison"]?.includes(b?.name));
    const isHpBuffRegenReady = now - this.state.lastHpBuffRegen > 5000;
    const isHpRegenReady = now - this.state.lastHpRegen > 5000;
    const isMpRegenReady = now - this.state.lastMpRegen > 1000;
    const isSpRegenReady = now - this.state.lastSpRegen > 600;
    const isBuffPoisonReady = now - this.state.lastBuffPoison > 1000;

    this.state.doHpRegen = false;
    this.state.doHpBuffRegen = false;
    this.state.doMpRegen = false;
    this.state.doSpRegen = false;
    this.state.doBuffPoison = false;

    if (this.state.isDead) return;

    if (isMpRegenReady && this.stats.mp < this.stats.maxMp) {
      this.state.doMpRegen = true;
      this.state.lastMpRegen = now;
      this.modifyStat("mp", this.stats.regenMp);
    }

    if (isSpRegenReady && this.stats.sp < this.stats.maxSp) {
      this.state.doSpRegen = true;
      this.state.lastSpRegen = now;
      this.modifyStat("sp", this.stats.regenSp);
    }

    if (regenBuff && !isResting) {
      if (isHpBuffRegenReady && this.stats.hp < this.stats.maxHp) {
        this.state.doHpBuffRegen = true;
        this.state.lastHpBuffRegen = now;
        this.modifyStat("hp", regenBuff?.stats?.regenHp || 0);
      }
    }

    if (isResting) {
      if (isHpRegenReady && this.stats.hp < this.stats.maxHp) {
        this.state.doHpRegen = true;
        this.state.lastHpRegen = now;
        this.modifyStat("hp", this.stats.regenHp);
      }
    }

    if (poisonBuff) {
      if (isBuffPoisonReady) {
        const amount = -(poisonBuff?.stats?.poisonDamage || 0);
        this.state.doBuffPoison = true;
        this.state.lastBuffPoison = now;
        this.state.lastCombat = Date.now();
        this.dispelBuffsByProperty("dispelInCombat", true);
        this.modifyStat("hp", amount);
      }
    }
  }
  setDead() {
    //placeholder
  }
  fillHpMp(): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.stats.sp = this.stats.maxSp;
  }
  assignExp(amount: integer): boolean {
    if (!Number.isInteger(amount)) return false;
    let didLevel = false;
    this.stats.exp += amount;
    while (this.stats.exp >= this.baseStats.maxExp) {
      let trailingExp = this.stats.exp - this.baseStats.maxExp;
      this.stats.exp = trailingExp;
      this.baseStats.level++;
      this.baseStats.maxExp = calculateNextMaxExp(this.baseStats.level);
      if (this.charClass == "warrior") this.baseStats.strength += 1;
      else if (this.charClass == "rogue") this.baseStats.dexterity += 1;
      else if (this.charClass == "mage") this.baseStats.intelligence += 1;
      else if (this.charClass == "cleric") this.baseStats.vitality += 1;
      this.baseStats.strength += 1;
      this.baseStats.dexterity += 1;
      this.baseStats.intelligence += 1;
      this.baseStats.vitality += 1;
      didLevel = true;
    }
    this.calculateStats();
    if (didLevel) this.fillHpMp();
    return didLevel;
  }
  addBuff(name: string, level: integer, shouldCalculateStats = true) {
    const buff = buffList?.[name];
    if (!buff) return false;

    const {
      duration,
      stats = {},
      percentStats = {},
      scaleDuration = true,
      scaleStats = true,
    } = buff;
    const scaledStats = {};
    const scaledPercentStats = {};

    // multiply each stat by the level
    Object.entries(stats).forEach(([stat, value]: [string, number]) => {
      scaledStats[stat] = value * level;
    });
    Object.entries(percentStats).forEach(([stat, value]: [string, number]) => {
      scaledPercentStats[stat] = value * level;
    });

    // look for the buff and remove it if it exists
    const foundBuff = this.buffs.find((b) => b?.name === name);
    // remove it from this.buffs
    if (foundBuff) this.buffs.splice(this.buffs.indexOf(foundBuff), 1);

    this.buffs.push({
      name,
      duration: scaleDuration ? duration * level : duration,
      level,
      stats: scaleStats ? scaledStats : stats,
      percentStats: scaleStats ? scaledPercentStats : percentStats,
      spawnTime: Date.now(),
      dispelInCombat: buff?.dispelInCombat,
      dispelOnAttack: buff?.dispelOnAttack,
      dispelOnCast: buff?.dispelOnCast,
    });

    if (shouldCalculateStats) this.calculateStats();

    this.state.hasBuffChanges = true;
  }
  //checks if out of combat, adds rest buff it should be resting
  checkIsResting() {
    const isOutOfCombat = this.checkOutOfCombat();
    const isResting = this.hasBuff("rest");
    const isPoisoned = this.hasBuff("poison");
    if (isOutOfCombat && !isResting && !isPoisoned) {
      this.addBuff("rest", 1, false);
      return true;
    }
    return isResting;
  }
  dispelBuffsByProperty(prop: keyof Buff, value = true) {
    for (const buff of this.buffs) {
      if (buff?.[prop] === value) {
        buff.isExpired = true;
      }
    }
  }
  expireBuff(name) {
    for (const buff of this.buffs) {
      if (buff?.name === name) {
        buff.isExpired = true;
      }
    }
  }
  /* Runs in update loop and removed buffs from player that are expired.
  Will also flag the player to hasBuffChanges so their state gets sent to client */
  expireBuffs(forceExpire = false) {
    let hasBuffUpdates = false;
    if (forceExpire && this.buffs?.length > 0) {
      hasBuffUpdates = true;
      this.buffs = [];
    } else {
      for (const buff of this.buffs) {
        /* Buff timed out */
        const limitedBuff = buff.duration > 0; // -1 is an unlimited buff
        const isTimedOut = Date.now() - buff.spawnTime > buff.duration;
        /* Buff got expired some other way */
        const isExpired = buff?.isExpired;
        if (isExpired || (isTimedOut && limitedBuff)) {
          hasBuffUpdates = true;
          this.buffs.splice(this.buffs.indexOf(buff), 1);
        }
      }
    }
    if (hasBuffUpdates) {
      this.calculateStats();
      this.state.hasBuffChanges = true;
    }
  }
  doHit(ids: Array<string>, abilitySlot: number, spellName: string): void {
    //placeholder
  }
}

export default ServerCharacter;
