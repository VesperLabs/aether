import type { AbilitySlot } from "@/rules/spells";
import type { ServerWorld } from "./server-world";
import { ServerCharacter, type CharacterArgs } from "./character";
import { expAfterDeath, getAbilityCosts, hasStaminaFor, mobKilledEvents } from "@/rules/combat";
import { canHitNpc, canHitPlayer } from "@/rules/spells";
import type { Npc } from "./npc";
import { createSpell } from "./spell-adapter";
import { vanish } from "./stealth";
import { PLAYER_DEFAULT_SPAWN } from "./auth/character-defaults";
import { getRoomState } from "@/server/net/room-sync";
import { entitiesInRoom } from "@/rules/world";
import { expForMobKill } from "@/rules/stats";
import { isPartyMember, sharedRecipientIds } from "@/rules/party";
import { markKeeperObjectivesReady, nextNpcKillCount } from "@/rules/quests";
import { applyAcceptQuest, applyCompleteQuest } from "./player-quests";
import {
  type FoundSlot,
  addInventoryItem,
  deleteAbilityAtId,
  deleteBagItemAtId,
  deleteInventoryItemAtId,
  findAbilityById,
  findBagItemById,
  findBagItemBySlot,
  findEquipmentById,
  findInventoryItemById,
  findOpenBagSlot,
  isInventoryFull,
  setBagItem,
  subtractAbilityAtId,
  subtractBagItemAtId,
  subtractInventoryItemAtId,
  updateBagItemAtId,
  updateInventoryItemAtId,
  withoutSlot,
} from "@/rules/inventory";

/** What a player is created from: the stored user plus the connection it logged in on. */
export type PlayerArgs = CharacterArgs & {
  email?: string;
  isDemoAccount?: boolean;
  userSettings?: UserSettings;
  spawn?: SpawnPoint;
};

/** A client's attack request, after the transport has validated it. */
export interface PlayerAttackRequest {
  count: number;
  direction: string;
  castAngle?: number;
  abilitySlot?: AbilitySlot;
}

/** A client's spell request, after the transport has validated it. */
export interface PlayerCastRequest {
  abilitySlot: AbilitySlot;
  castAngle?: number;
}

/* Server level Player object */
export class Player extends ServerCharacter {
  public email?: string;
  public isDemoAccount?: boolean;
  public spawn?: SpawnPoint;
  public userSettings?: UserSettings;
  public partyId?: string | null;
  constructor(world: ServerWorld, args: PlayerArgs) {
    super(world, args);
    this.world = world;
    this.email = args?.email;
    this.isDemoAccount = args?.isDemoAccount;
    this.userSettings = args?.userSettings;
    this.kind = "player";
    this.spawn = args?.spawn;
    this.calculateStats(true);
  }
  setDead() {
    if (this.stats.exp > 0) {
      this.stats.exp = expAfterDeath(this.stats.exp);
    }
    const spawnPoint: SpawnPoint = this?.spawn ?? PLAYER_DEFAULT_SPAWN;
    this.world.db.updateUserMapDetails({ email: this.email, ...spawnPoint });
    this.expireBuffs(true);
    this.state.isDead = true;
  }
  doAttack({ count, direction, castAngle, abilitySlot }: PlayerAttackRequest) {
    const { world, room, socketId } = this ?? {};

    if (this?.hasBuff("stun")) return;
    if (this?.state?.isDead) return;
    const { roomName } = this;
    if (!roomName) return;

    /* Serverside attack may not actually be ready. */
    const { percentageRemaining } = this.checkAttackReady();
    if (percentageRemaining > 5) return;

    const { stats, ...spellDetails } = this.getAttackActionName({ count, abilitySlot });
    const spCost = this.getAttackSpCost(count);
    const costs = getAbilityCosts(stats);
    if (!hasStaminaFor(this.stats.sp, spCost + costs.sp)) return;
    this.modifyStatIfCostExists("mp", costs.mp);
    this.modifyStatIfCostExists("hp", costs.hp);
    this.modifyStatIfCostExists("sp", costs.sp);

    this.direction = direction;

    this.modifyStat("sp", -spCost);

    world.io.to(roomName).emit("modifyPlayerStat", {
      socketId,
      type: "sp",
      amount: -spCost,
    });

    if (castAngle) {
      this.state.lastAngle = castAngle;
    }

    this.state.lastAttack = this.world.now();
    this.state.isAttacking = true;

    this.dispelBuffsByProperty("dispelBeforeAttack");

    if (room)
      createSpell(room, {
        caster: this,
        //target: targetPlayer,
        castAngle,
        abilitySlot,
        ...spellDetails,
      });
  }
  modifyStatIfCostExists(statType: string, cost: number) {
    if (cost > 0) {
      this.modifyStat(statType, -cost);
      if (!this.roomName) return;
      this.world.io.to(this.roomName).emit("modifyPlayerStat", {
        socketId: this.socketId,
        type: statType,
        amount: -cost,
      });
    }
  }
  doCast({ abilitySlot, castAngle }: PlayerCastRequest): void {
    const { spellName, ilvl, stats } = this.getAbilityDetails(abilitySlot);
    if (!ilvl || !spellName) return;
    if (!this.canCastSpell(abilitySlot)) return;
    // Modify stats if there's a cost
    this.modifyStatIfCostExists("mp", stats?.mpCost || 0);
    this.modifyStatIfCostExists("hp", stats?.hpCost || 0);
    this.modifyStatIfCostExists("sp", stats?.spCost || 0);

    this.dispelBuffsByProperty("dispelBeforeAttack");
    if (spellName === "stealth") vanish(this);

    if (this.room)
      createSpell(this.room, {
        caster: this,
        //target: targetPlayer,
        spellName,
        castAngle,
        ilvl,
        abilitySlot,
      });
  }
  addNpcKill(npcName: string) {
    this.npcKills[npcName] = nextNpcKillCount(this.npcKills, npcName);
  }
  addQuest(quest: Quest) {
    applyAcceptQuest(this, quest);
  }
  updateChatQuests(npcName: string): Array<PlayerQuest> {
    this.quests = markKeeperObjectivesReady(this.quests, this.world.quests, npcName);
    return this.quests;
  }
  completeQuest(questId: string) {
    return applyCompleteQuest(this, this.world.quests?.[questId]);
  }
  /* Inventory, equipment, bags and abilities: the rules live in rules/inventory */
  findEquipmentById(id: string): FoundSlot {
    return findEquipmentById(this.equipment, id);
  }
  clearEquipmentSlot(slotName: string) {
    this.equipment = withoutSlot(this.equipment, slotName) as Record<string, Item>;
  }
  findBagItemById(id: string) {
    return findBagItemById(this.inventory, id);
  }
  findBagItemBySlot(bagId: string, slot: string) {
    return findBagItemBySlot(this.inventory, bagId, slot);
  }
  subtractBagItemAtId(id: string, amount: number) {
    const { result, subtracted } = subtractBagItemAtId(this.inventory, id, amount);
    this.inventory = result;
    return subtracted;
  }
  updateBagItemAtId(id: string, item: Item) {
    this.inventory = updateBagItemAtId(this.inventory, id, item);
  }
  deleteBagItemAtId(id: string) {
    this.inventory = deleteBagItemAtId(this.inventory, id);
  }
  setBagItem(bagId: string, slot: string, item: Item) {
    this.inventory = setBagItem(this.inventory, bagId, slot, item) ?? this.inventory;
  }
  findOpenBagSlot(bagId: string, item: Item) {
    return findOpenBagSlot(this.inventory, bagId, item);
  }
  findInventoryItemById(id: string) {
    return findInventoryItemById(this.inventory, id);
  }
  subtractInventoryItemAtId(id: string, amount: number) {
    const { result, subtracted } = subtractInventoryItemAtId(this.inventory, id, amount);
    this.inventory = result;
    return subtracted;
  }
  deleteInventoryItemAtId(id: string) {
    this.inventory = deleteInventoryItemAtId(this.inventory, id);
  }
  isInventoryFull() {
    return isInventoryFull(this.inventory);
  }
  updateInventoryItemAtId(id: string, item: Item) {
    this.inventory = updateInventoryItemAtId(this.inventory, id, item);
  }
  addInventoryItem(item: Item) {
    this.inventory = addInventoryItem(this.inventory, item);
  }
  findAbilityById(id: string): FoundSlot {
    return findAbilityById(this.abilities, id);
  }
  subtractAbilityAtId(id: string, amount: number) {
    const { result, subtracted } = subtractAbilityAtId(this.abilities, id, amount);
    this.abilities = result as Record<string, Item>;
    return subtracted;
  }
  deleteAbilityAtId(id: string) {
    this.abilities = deleteAbilityAtId(this.abilities, id) as Record<string, Item>;
  }
  clearAbilitySlot(slotName: string) {
    this.abilities = withoutSlot(this.abilities, slotName) as Record<string, Item>;
  }
  checkBubbleMessage() {
    const now = this.world.now();
    if (now - (this.state.lastBubbleMessage ?? Number.NaN) > 5000) {
      this.state.bubbleMessage = null;
    }
  }
  update(time: number, delta: number) {
    this.checkIsResting();
    this.expireBuffs();
    this.doRegen();
    this.checkBubbleMessage();
  }

  doHit(ids: Array<string>, abilitySlot?: AbilitySlot): void {
    const { world } = this ?? {};
    if (!this || this?.state?.isDead) return;
    const { roomName } = this;
    if (!roomName) return;

    const { allowedTargets } = this.getAbilityDetails(abilitySlot);

    const hitList: Hit[] = [];
    const npcKills: Npc[] = [];
    const playerIdsToUpdate: string[] = [];
    const playerIdsThatLeveled: string[] = [];

    const npcs = entitiesInRoom(world.npcs, roomName);
    const players = entitiesInRoom(world.players, roomName);

    for (const npc of npcs) {
      if (!ids.includes(npc.id)) continue;
      if (!canHitNpc(allowedTargets)) continue;

      const newHits = this.calculateDamage(npc, abilitySlot);

      if (newHits.find((hit) => hit.type === "death")) {
        npcKills.push(npc);
      }

      if (newHits.length > 0) {
        hitList.push(...newHits);
      }
    }

    for (const player of players) {
      const targetIsInParty = isPartyMember(world.partyState, this?.partyId, player.id);
      if (!ids.includes(player.id)) continue;
      /* `targetIsInParty` is also true for self (you're a member of your own party), so the rule
       * excludes self from the ally check — otherwise self-only spells like stealth get filtered
       * out when partied. */
      if (
        !canHitPlayer({
          allowedTargets,
          isSelf: player.id === this.id,
          isPartyMember: targetIsInParty,
        })
      ) {
        continue;
      }

      const newHits = this.calculateDamage(player, abilitySlot);
      if (newHits.length > 0) {
        hitList.push(...newHits);
      }
    }

    /* Send exp update to client */
    if (hitList?.some((hit) => hit.type === "death")) {
      // either you are in a party, or you are in a fake party object
      // party members in same room share the kill
      const recipients: Player[] = sharedRecipientIds(world.partyState, {
        partyId: this?.partyId,
        id: this?.id,
        roomName: roomName,
      })
        .map((id) => world?.players?.[id])
        .filter(Boolean);
      const levelsBefore = recipients.map((member) => member.baseStats.level);
      // Read once so a level-up part way through the kills doesn't change what later kills are worth.
      const killerLevel = this.stats.level;
      const kills = mobKilledEvents(
        { id: this.id, level: killerLevel, magicFind: this.stats.magicFind, partyId: this.partyId },
        recipients.map((member) => member.id),
        roomName,
        npcKills,
      );
      /* Stats (experience) reacts to this and awards exp and kill credit to the recipients. */
      for (const kill of kills) world.events.emit("mobKilled", kill);
      recipients.forEach((member, i) => {
        for (const kill of kills) {
          hitList.push({
            type: "exp",
            amount: expForMobKill(kill),
            from: kill.mobId,
            to: member.id,
          });
        }
        playerIdsToUpdate.push(member.id);
        if (member.baseStats.level > levelsBefore[i]) {
          playerIdsThatLeveled.push(member.id);
        }
      });
    }

    if (playerIdsToUpdate.length > 0) {
      const roomState = getRoomState(world, roomName);
      world.io.to(roomName).emit("buffUpdate", {
        players: roomState.players.filter((player) => playerIdsToUpdate.includes(player.id)),
        playerIdsThatLeveled,
      });
    }

    world.io.to(roomName).emit("assignDamage", hitList);
  }
}
