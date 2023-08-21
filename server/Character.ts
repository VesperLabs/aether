import Character from "../shared/Character";
import ItemBuilder from "../shared/ItemBuilder";
import { randomNumber, cloneObject, calculateNextMaxExp, addValuesToExistingKeys } from "./utils";
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
    const baseStatKeys = ["vitality", "dexterity", "strength", "intelligence", "level"];
    const allItems = Object.entries({ ...equipment, ...abilities });
    const percentStats = Object.fromEntries(baseStatKeys.map((stat) => [stat, 0]));
    const baseStats = {
      ...Object.fromEntries(baseStatKeys.map((stat) => [stat, 0])),
      ...this.baseStats,
    };
    const activeItemSlots = allItems?.map(([slotKey, _]: [string, Item]) => slotKey);
    const activeSets = [];
    const setItems = [];

    // TODO: Buff percentage stats
    buffs.forEach((buff: Buff) => {
      if (buff.stats) {
        Object.keys(buff.stats).forEach((key) => {
          const buffStat = buff.stats[key];
          if (baseStats[key]) {
            baseStats[key] += buffStat;
          }
        });
      }
    });

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

    if (
      (this.hasRangedWeapon("equipment") && this.isDualWielding("equipment")) ||
      this.hasShield("equipment")
    ) {
      activeItemSlots.splice(activeItemSlots.indexOf("handLeft"), 1);
      activeItemSlots.splice(activeItemSlots.indexOf("handRight"), 1);
    }

    this.activeItemSlots = activeItemSlots;
  }
  calculateStats(shouldHeal = false) {
    this.calculateActiveItemSlots();
    const { equipment = {}, abilities = {}, buffs = [] } = this;
    // disregard items that are not actively equipped
    const allSlots = Object.keys({ ...abilities, ...equipment }).filter((slot) =>
      this.activeItemSlots?.includes(slot)
    );
    let totalPercentStats = {};
    let ns = cloneObject(this.baseStats);
    let setList = {};
    let activeSets = [];
    this.stats = Object.keys(this?.stats)?.length ? this.stats : { hp: 0, mp: 0, sp: 0, exp: 0 };

    if (!ns?.triggers) {
      ns.triggers = [];
    }

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
            const itemStat = item.stats[key];
            if (!ns[key]) {
              ns[key] = 0;
            }
            if (itemStat) {
              ns[key] += itemStat;
            }
          });
        }
        if (item?.triggers) {
          item?.triggers?.forEach((trigger) => {
            ns.triggers.push(trigger);
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
          }
          if (setInfo.stats) {
            Object.keys(setInfo.stats).forEach((key) => {
              let itemStat = setInfo.stats[key];
              if (itemStat) {
                ns[key] += itemStat;
              }
            });
          }
          if (setInfo.triggers) {
            setInfo?.triggers?.forEach((trigger: Trigger) => {
              ns.triggers.push(trigger);
            });
          }
        }
      }
    });

    buffs.forEach((buff: Buff) => {
      if (buff.stats) {
        Object.keys(buff.stats).forEach((key) => {
          const buffStat = buff.stats[key];
          if (!ns[key]) {
            ns[key] = 0;
          }
          if (buffStat) {
            ns[key] += buffStat;
          }
        });
      }
    });

    /* The base values get calculated here for percentStats */
    Object.keys(totalPercentStats).forEach((key) => {
      let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
      if (
        // do we need these?
        key == "vitality" ||
        key == "dexterity" ||
        key == "strength" ||
        key == "intelligence"
      )
        ns[key] += percentIncrease;
    });
    ns.expValue = ns.expValue || 0;
    ns.maxHp = ns.maxHp + ns.vitality * 3;
    ns.maxMp = ns.maxMp + ns.intelligence * 3;
    ns.maxSp = ns.maxSp + Math.floor(ns.vitality * 0.03);
    ns.magicFind = ns.magicFind || 0;
    ns.maxExp = ns.maxExp || 0;
    ns.exp = this.stats.exp || 0;
    ns.fireResistance = ns.fireResistance || 0;
    ns.lightResistance = ns.lightResistance || 0;
    ns.waterResistance = ns.waterResistance || 0;
    ns.earthResistance = ns.earthResistance || 0;
    ns.attackDelay = ns.attackDelay || 0;
    ns.spellPower = Math.floor((ns.spellPower || 0) + ns.intelligence * 0.25);
    ns.attackDelay = 1 - Math.floor(ns.dexterity * 0.5) + ns.attackDelay;
    ns.castDelay = ns.castDelay || 1000;
    ns.castDelay = 1 - Math.floor(ns.intelligence * 0.5) + ns.castDelay;
    ns.accuracy = ns.accuracy;
    ns.regenHp = (ns.regenHp || 1) + Math.floor(ns.vitality / 20);
    ns.regenMp = (ns.regenMp || 1) + Math.floor(ns.intelligence / 20);
    ns.regenSp = ns.regenSp || 1;
    ns.armorPierce = ns.armorPierce + ns.dexterity * 0.75 + ns.strength * 0.5;
    ns.defense = ns.defense + ns.strength;
    ns.critChance = ns.critChance + ns.dexterity * 0.05;
    ns.walkSpeed = ns.walkSpeed + ns.dexterity * 0.03;
    ns.dodgeChance = ns.dodgeChance + ns.dexterity * 0.05;
    ns.hpSteal = ns.hpSteal || 0;
    ns.mpSteal = ns.mpSteal || 0;
    //ns.blockChance = ns.blockChance + (0 * (ns.dexterity - 15)) / (ns.level * 2);
    ns.blockChance = ns.blockChance;
    if (ns.critChance > 100) ns.critChance = 100;
    if (ns.dodgeChance > 75) ns.dodgeChance = 75;
    if (ns.blockChance > 75) ns.blockChance = 75;

    const damageCalc = ((ns.strength * 2 + ns.dexterity / 2) * ns.level) / 100;
    const damageModifier = Math.floor(1 + damageCalc);
    ns.minDamage = ns.minDamage + Math.floor(damageCalc);
    ns.maxDamage = Math.max(ns.maxDamage + damageModifier, ns.minDamage);

    /* Any percentStat value that needs to be pre-calculated goes here  */
    Object.keys(totalPercentStats).forEach((key) => {
      let percentIncrease = Math.floor(ns[key] * (totalPercentStats[key] / 100));
      if (key == "maxHp" || key == "maxMp" || key == "defense") ns[key] += percentIncrease;
    });

    //moving values
    if (this.stats.hp <= 0) ns.hp = shouldHeal ? ns.maxHp : 0;
    else if (this.stats.hp > ns.maxHp) ns.hp = ns.maxHp;
    else ns.hp = this.stats.hp;
    if (this.stats.mp <= 0) ns.mp = shouldHeal ? ns.maxMp : 0;
    else if (this.stats.mp > ns.maxMp) ns.mp = ns.maxMp;
    else ns.mp = this.stats.mp;
    if (this.stats.sp <= 0) ns.sp = shouldHeal ? ns.maxSp : 0;
    else if (this.stats.sp > ns.maxSp) ns.sp = ns.maxSp;
    else ns.sp = this.stats.sp;
    this.stats = ns;

    this.state.activeSets = activeSets;

    //update server data on what hands we have items in
    this.visibleEquipment = this.getVisibleEquipment();
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
    victim.combatDispelBuffs();

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
    victim.combatDispelBuffs();
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
    const isHpBuffRegenReady = now - this.state.lastHpBuffRegen > 5000;
    const isHpRegenReady = now - this.state.lastHpRegen > 5000;
    const isMpRegenReady = now - this.state.lastMpRegen > 1000;
    const isSpRegenReady = now - this.state.lastSpRegen > 600;

    this.state.doHpRegen = false;
    this.state.doHpBuffRegen = false;
    this.state.doMpRegen = false;
    this.state.doSpRegen = false;

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

    if (regenBuff && !this.state.isDead) {
      if (isHpBuffRegenReady && this.stats.hp < this.stats.maxHp) {
        this.state.doHpBuffRegen = true;
        this.state.lastHpBuffRegen = now;
        this.modifyStat("hp", regenBuff?.stats?.regenHp || 0);
      }
    }

    if (isResting && !this.state.isDead) {
      if (isHpRegenReady && this.stats.hp < this.stats.maxHp) {
        this.state.doHpRegen = true;
        this.state.lastHpRegen = now;
        this.modifyStat("hp", this.stats.regenHp);
      }
    }
  }
  fillHpMp(): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.stats.sp = this.stats.maxSp;
  }
  assignExp(amount: integer): boolean {
    let didLevel = false;
    this.stats.exp += amount;
    while (this.stats.exp >= this.baseStats.maxExp) {
      let trailingExp = this.stats.exp - this.baseStats.maxExp;
      this.stats.exp = trailingExp;
      this.baseStats.maxExp = calculateNextMaxExp(this.baseStats.level);
      if (this.charClass == "warrior") this.baseStats.strength += 1;
      else if (this.charClass == "rogue") this.baseStats.dexterity += 1;
      else if (this.charClass == "mage") this.baseStats.intelligence += 1;
      else if (this.charClass == "cleric") this.baseStats.vitality += 1;
      this.baseStats.strength += 1;
      this.baseStats.dexterity += 1;
      this.baseStats.intelligence += 1;
      this.baseStats.vitality += 1;
      this.baseStats.level++;
      didLevel = true;
    }
    this.calculateStats();
    if (didLevel) this.fillHpMp();
    return didLevel;
  }
  addBuff(name: string, level: integer, shouldCalculateStats = true) {
    const buff = buffList?.[name];
    if (!buff) return false;

    const { duration, stats = {} } = buff;
    const statsWithLevelMultiplier = {};

    // multiply each stat by the level
    Object.entries(stats).forEach(([stat, value]: [string, number]) => {
      statsWithLevelMultiplier[stat] = value * level;
    });

    // look for the buff and remove it if it exists
    const foundBuff = this.buffs.find((b) => b?.name === name);
    // remove it from this.buffs
    if (foundBuff) this.buffs.splice(this.buffs.indexOf(foundBuff), 1);

    this.buffs.push({
      name,
      duration: duration * level,
      level,
      stats: statsWithLevelMultiplier,
      spawnTime: Date.now(),
      dispelInCombat: buff?.dispelInCombat,
    });

    if (shouldCalculateStats) this.calculateStats();

    this.state.hasBuffChanges = true;
  }
  //checks if out of combat, adds rest buff it should be resting
  checkIsResting() {
    const isOutOfCombat = this.checkOutOfCombat();
    const isResting = this.hasBuff("rest");
    if (isOutOfCombat && !isResting) {
      this.addBuff("rest", 1, false);
      return true;
    }
    return isResting;
  }
  combatDispelBuffs() {
    for (const buff of this.buffs) {
      if (buff?.dispelInCombat) {
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
  doHit(ids, abilitySlot) {
    //placeholder
  }
}

export default ServerCharacter;
