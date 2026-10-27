import type { ServerWorld } from "./server-world";
import { CharacterModel } from "@/shared/rules/character";
import { ItemBuilder } from "@/shared/content";
import { applyCalculatedStats } from "./character-stats";
import {
  applyAttackDamage,
  applyDamage,
  applyElementalDamage,
  applySpellDamage,
} from "./character-combat";
import {
  applyAddBuff,
  applyCheckIsResting,
  applyDispel,
  applyExpireBuff,
  applyExpireBuffs,
  applyRegen,
} from "./character-buffs";
import { addBuffBonuses } from "@/shared/rules/buffs";
import { getPlayerQuests } from "@/shared/rules/quests";
import { calculateNextMaxExp } from "@/shared/rules/stats";
import type { ElementalDamages } from "@/shared/rules/combat";
import type { AbilityDetails } from "./character-combat";
import type { BuffRequest } from "./character-buffs";

/** What a character is created from: the shared constructor args, plus the room it is in. */
// Legacy: loaded users and NPC definitions both flow in here untyped.
export type CharacterArgs = Record<string, any>;

export class ServerCharacter extends CharacterModel {
  world: ServerWorld;
  constructor(world: ServerWorld, args: CharacterArgs) {
    super();
    this.world = world;
    this.initCharacter(args);
    this.room = args?.room;
  }
  /** Runs once per tick. Players and NPCs override it. */
  update(_time: number, _delta: number) {}
  destroy(_fromScene?: boolean) {}
  getQuests() {
    return getPlayerQuests(this, this.world.quests);
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
    const { baseStats, percentStats } = addBuffBonuses(
      buffs,
      { ...Object.fromEntries(baseStatKeys.map((stat) => [stat, 0])), ...this.baseStats },
      Object.fromEntries(baseStatKeys.map((stat) => [stat, 0])),
    );
    const activeItemSlots = allItems?.map(([slotKey, _]: [string, Item]) => slotKey);
    const activeSets: string[] = [];
    const setItems: Item[] = [];

    if (!this.hasAttackableWeapons("equipment")) {
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
        const percentStatMultiplier = percentStats[key] / 100 || 1;
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
    this.updateVisibleEquipment();

    // Post calculations rely on full equipment to be corrected.
    for (const key of ["weaponType"]) {
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
        // melee spell attacks require a melee weapon
        if (key === "weaponType") {
          if (itemRequirement) {
            if (!this.hasVisibleWeaponType(itemRequirement)) {
              activeItemSlots.splice(activeItemSlots.indexOf(item.slotKey), 1);
              continue;
            }
          }
        }
      }
    }

    this.activeItemSlots = activeItemSlots;
  }
  calculateElementalDamage(eleDamages: ElementalDamages, victim: ServerCharacter) {
    return applyElementalDamage(eleDamages, victim);
  }
  calculateStats(shouldHeal = false) {
    this.calculateActiveItemSlots();
    applyCalculatedStats(this, shouldHeal);
    //update server data on what hands we have items in
    this.visibleEquipment = this.getVisibleEquipment();
  }
  calculateSpellDamage(
    victim: ServerCharacter,
    abilityDetails: AbilityDetails | undefined,
  ): Array<Hit> {
    return applySpellDamage(this, victim, abilityDetails);
  }
  calculateAttackDamage(
    victim: ServerCharacter,
    abilityDetails: AbilityDetails | undefined,
  ): Array<Hit> {
    return applyAttackDamage(this, victim, abilityDetails);
  }
  calculateDamage(victim: ServerCharacter, abilitySlot?: number): Array<Hit> {
    return applyDamage(this, victim, abilitySlot);
  }
  doRegen() {
    applyRegen(this);
  }
  setDead() {
    //placeholder
  }
  fillHpMp(): void {
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;
    this.stats.sp = this.stats.maxSp;
  }
  assignExp(amount: number): boolean {
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
  addBuff(args: BuffRequest) {
    return applyAddBuff(this, args);
  }
  //checks if out of combat, adds rest buff it should be resting
  checkIsResting() {
    return applyCheckIsResting(this);
  }
  dispelBuffsByProperty(prop: keyof Buff, value = true) {
    applyDispel(this, prop, value);
  }
  expireBuff(name: string) {
    applyExpireBuff(this, name);
  }
  /* Runs in update loop and removed buffs from player that are expired.
  Will also flag the player to hasBuffChanges so their state gets sent to client */
  expireBuffs(forceExpire = false) {
    applyExpireBuffs(this, forceExpire);
  }
  doHit(ids: Array<string>, abilitySlot?: number): void {
    //placeholder
  }
  setLockedPlayerId(id: string | null | undefined) {
    //placeholder
  }
}
