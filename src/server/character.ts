import type { AbilitySlot } from "@/rules/spells";
import type { Hand } from "@/rules/combat";
import type { StatBag } from "@/rules/stats";
import type { ServerWorld } from "./server-world";
import { CharacterModel, getActiveItemSlots } from "@/rules/character";
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
import { getPlayerQuests } from "@/rules/quests";
import { calculateNextMaxExp } from "@/rules/stats";
import type { ElementalDamages } from "@/rules/combat";
import type { AbilityDetails } from "./character-combat";
import type { BuffRequest } from "./character-buffs";

/** What a character is created from: the shared constructor args, plus the room it is in. */
// Legacy: loaded users and NPC definitions both flow in here untyped.
export type CharacterArgs = Record<string, any>;

export class ServerCharacter extends CharacterModel {
  world: ServerWorld;
  /** Net id for the binary pose wire, set when the character joins the world. */
  nid!: number;
  /** How far behind the server this character sees others: players report it, npcs see live. */
  viewLagMs = 0;
  /** Dual-wielding only: the stats the left hand's swings use (see `calculateStats`). */
  offHandStats?: StatBag;
  constructor(world: ServerWorld, args: CharacterArgs) {
    super();
    this.world = world;
    this.initCharacter(args, world.now);
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
    this.activeItemSlots = getActiveItemSlots(this);
    this.updateVisibleEquipment();
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
  calculateDamage(victim: ServerCharacter, abilitySlot?: AbilitySlot, hand?: Hand): Array<Hit> {
    return applyDamage(this, victim, abilitySlot, hand);
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
  /** Starts a shove: NPCs are moved by the server, players by their own client when told. */
  knockBack(angle: number) {
    this.state.knockbackAt = this.world.now();
    this.state.knockbackAngle = angle;
    if (this.kind === "player" && this.socketId) {
      this.world.events.emit("playerKnockedBack", { socketId: this.socketId, angle });
    }
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
  doHit(_ids: Array<string>, _abilitySlot?: AbilitySlot, _hand?: Hand): void {
    //placeholder
  }
  setLockedPlayerId(id: string | null | undefined) {
    //placeholder
  }
}
