import { ServerCharacter } from "./character";
import { expAfterDeath } from "@/shared/rules/combat";
import { canHitNpc, canHitPlayer } from "@/shared/rules/spells";
import { createSpell } from "./spell-adapter";
import { PLAYER_DEFAULT_SPAWN } from "./auth/character-defaults";
import { getRoomState } from "@/server/net/room-sync";
import { expForMobKill } from "@/shared/rules/stats";
import { isPartyMember, sharedRecipientIds } from "@/shared/rules/party";
import { markKeeperObjectivesReady, nextNpcKillCount } from "@/shared/rules/quests";
import { applyAcceptQuest, applyCompleteQuest } from "./player-quests";
import type { MobKilledEvent } from "@/shared/rules/events";
import {
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
} from "@/shared/rules/inventory";

/* Server level Player object */
export class Player extends ServerCharacter implements ServerPlayer {
  public email: string;
  public isDemoAccount?: boolean;
  public spawn: SpawnPoint;
  public userSettings: UserSettings;
  public partyId: string;
  constructor(scene: ServerScene, args: Player) {
    super(scene, args);
    this.scene = scene;
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
    this.scene.db.updateUserMapDetails({ email: this.email, ...spawnPoint });
    this.expireBuffs(true);
    this.state.isDead = true;
  }
  doAttack({ count, direction, castAngle, abilitySlot }) {
    const { scene, room, socketId } = this ?? {};

    if (this?.hasBuff("stun")) return;
    if (this?.state?.isDead) return;

    /* Serverside attack may not actually be ready. */
    const { percentageRemaining } = this.checkAttackReady();
    if (percentageRemaining > 5) return;

    const { stats, ...spellDetails } = this.getAttackActionName({ count, abilitySlot });
    const spCost = this.getAttackSpCost(count);
    this.modifyStatIfCostExists("mp", stats?.mpCost || 0);
    this.modifyStatIfCostExists("hp", stats?.hpCost || 0);
    this.modifyStatIfCostExists("sp", spCost + stats?.spCost || 0);

    this.direction = direction;

    this.modifyStat("sp", -spCost);

    scene.io.to(this?.roomName).emit("modifyPlayerStat", {
      socketId,
      type: "sp",
      amount: -spCost,
    });

    if (castAngle) {
      this.state.lastAngle = castAngle;
    }

    this.state.lastAttack = Date.now();
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
  modifyStatIfCostExists(statType, cost) {
    if (cost > 0) {
      this.modifyStat(statType, -cost);
      this.scene.io.to(this?.roomName).emit("modifyPlayerStat", {
        socketId: this.socketId,
        type: statType,
        amount: -cost,
      });
    }
  }
  doCast({ abilitySlot, castAngle }): void {
    const { spellName, ilvl, stats } = this.getAbilityDetails(abilitySlot);
    if (!ilvl || !spellName) return;
    if (!this.canCastSpell(abilitySlot)) return;
    // Modify stats if there's a cost
    this.modifyStatIfCostExists("mp", stats?.mpCost || 0);
    this.modifyStatIfCostExists("hp", stats?.hpCost || 0);
    this.modifyStatIfCostExists("sp", stats?.spCost || 0);

    this.dispelBuffsByProperty("dispelBeforeAttack");

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
    this.quests = markKeeperObjectivesReady(this.quests, this.scene.quests, npcName);
    return this.quests;
  }
  completeQuest(questId: string) {
    return applyCompleteQuest(this, this.scene.quests?.[questId]);
  }
  /* Inventory, equipment, bags and abilities: the rules live in shared/rules/inventory */
  findEquipmentById(id: string): any {
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
  subtractBagItemAtId(id: string, amount: integer) {
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
  subtractInventoryItemAtId(id: string, amount: integer) {
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
  findAbilityById(id: string): any {
    return findAbilityById(this.abilities, id);
  }
  subtractAbilityAtId(id: string, amount: integer) {
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
    const now = Date.now();
    if (now - this.state.lastBubbleMessage > 5000) {
      this.state.bubbleMessage = null;
    }
  }
  update(time: number, delta: number) {
    this.checkIsResting();
    this.expireBuffs();
    this.doRegen();
    this.checkBubbleMessage();
  }

  doHit(ids: Array<string>, abilitySlot: number): void {
    const { scene } = this ?? {};
    if (!this || this?.state?.isDead) return;

    const room = scene?.roomManager.rooms[this.roomName];
    const { allowedTargets } = this.getAbilityDetails(abilitySlot);

    let hitList = [];
    let npcKills = [];
    let playerIdsToUpdate = [];
    let playerIdsThatLeveled = [];

    const npcs = room?.npcManager?.getNpcs();
    const players = room?.playerManager?.getPlayers();

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
      const targetIsInParty = isPartyMember(scene.partyState, this?.partyId, player.id);
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
      const recipients: ServerPlayer[] = sharedRecipientIds(scene.partyState, {
        partyId: this?.partyId,
        id: this?.id,
        roomName: this?.roomName,
      })
        .map((id) => scene?.players?.[id])
        .filter(Boolean);
      const levelsBefore = recipients.map((member) => member.baseStats.level);
      // Read once so a level-up part way through the kills doesn't change what later kills are worth.
      const killerLevel = this.stats.level;
      const kills: MobKilledEvent[] = npcKills.map((npc) => ({
        killerId: this.id,
        killerLevel,
        killerMagicFind: this.stats.magicFind,
        partyId: this.partyId,
        recipientIds: recipients.map((member) => member.id),
        mobId: npc.id,
        mobName: npc.name,
        mobLevel: npc.stats.level,
        roomName: this.roomName,
        x: npc.x,
        y: npc.y,
      }));
      /* Stats (experience) reacts to this and awards exp and kill credit to the recipients. */
      for (const kill of kills) scene.gameEvents.emit("mobKilled", kill);
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
      const roomState = getRoomState(scene, this.roomName);
      scene.io.to(this.roomName).emit("buffUpdate", {
        players: roomState.players.filter((player) => playerIdsToUpdate.includes(player.id)),
        playerIdsThatLeveled,
      });
    }

    scene.io.to(this.roomName).emit("assignDamage", hitList);
  }
}
