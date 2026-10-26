import { ServerCharacter } from "./character";
import { cloneObject, getRoomState, PLAYER_DEFAULT_SPAWN } from "./utils";
import { expForMobKill } from "@/shared/rules/stats";
import { isPartyMember, sharedRecipientIds } from "@/shared/rules/party";
import { markKeeperObjectivesReady, nextNpcKillCount } from "@/shared/rules/quests";
import { applyAcceptQuest, applyCompleteQuest } from "./player-quests";
import type { MobKilledEvent } from "@/shared/rules/events";
import { MAX_INVENTORY_ITEMS } from "../shared";

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
      this.stats.exp = Math.floor(this.stats.exp * 0.9);
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

    room?.spellManager.create({
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

    this.room?.spellManager.create({
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
  /* Equipment */
  findEquipmentById(id: string): any {
    const [slotName, foundItem] = Object.entries(this?.equipment).find(
      ([_, slotItem]: [string, Item]) => slotItem?.id === id,
    ) || [null, null];
    return { item: foundItem, slotName };
  }
  clearEquipmentSlot(slotName: string) {
    if (!this?.equipment?.[slotName]) return;
    this.equipment[slotName] = null;
  }
  /* Bag */
  findBagItemById(id: string) {
    let item = null;
    let slotName = null;
    const bags = this?.inventory?.filter((item: Item) => item?.base === "bag");
    for (const bag of bags) {
      for (var i = 0; i < bag?.items?.length; i++) {
        if (bag?.items?.[i]?.id === id) {
          item = bag?.items?.[i];
          slotName = i;
          break;
        }
      }
    }
    return { slotName, item };
  }
  findBagItemBySlot(bagId: string, slot: string) {
    const bag = this?.inventory?.find((item: Item) => item?.id === bagId);
    return bag?.items?.[slot];
  }
  subtractBagItemAtId(id: string, amount: integer) {
    const found = cloneObject(this.findBagItemById(id)?.["item"]);
    if (found?.amount > amount && amount > 0) {
      const newAmount = found?.amount - amount;
      this.updateBagItemAtId(id, { ...found, amount: newAmount });
      return amount;
    }
    return null;
  }
  updateBagItemAtId(id: string, item: Item) {
    const bags = this?.inventory?.filter((item: Item) => item?.base === "bag");
    for (const bag of bags) {
      for (var i = 0; i < bag?.items?.length; i++) {
        if (bag?.items?.[i]?.id === id) {
          bag.items[i] = item;
          break;
        }
      }
    }
  }
  deleteBagItemAtId(id: string) {
    const bags = this?.inventory?.filter((item: Item) => item?.base === "bag");
    for (const bag of bags) {
      for (var i = 0; i < bag?.items?.length; i++) {
        if (bag?.items?.[i]?.id === id) {
          bag.items[i] = null;
          break;
        }
      }
    }
  }
  setBagItem(bagId: string, slot: string, item: Item) {
    const bag = this?.inventory?.find((item) => item?.id === bagId);
    if (!bag?.items) {
      bag.items = [];
    }
    bag.items[slot] = item;
  }
  findOpenBagSlot(bagId: string, item: Item) {
    const bag = this?.inventory?.find((item: Item) => item?.id === bagId);
    const bagItems = bag?.items ?? [null];
    let openSlot: integer;
    /* Find a stackable slot */
    for (var i = 0; i < bagItems?.length; i++) {
      // Item found (Stackable)
      if (bagItems?.[i]?.id === item?.id) {
        openSlot = i;
        break;
      }
      // New item
      if (!bagItems?.[i]?.id) {
        openSlot = i;
        break;
      }
    }
    return openSlot;
  }
  /* Inventory */
  findInventoryItemById(id: string) {
    let returnItem = null;
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.id === id) {
        returnItem = this.inventory[i];
        break;
      }
    }
    return returnItem;
  }
  subtractInventoryItemAtId(id: string, amount: integer) {
    const found = cloneObject(this.findInventoryItemById(id));
    if (found?.amount >= amount && amount > 0) {
      const newAmount = found?.amount - amount;
      if (newAmount < 1) {
        this?.deleteInventoryItemAtId(id);
      } else {
        this.updateInventoryItemAtId(id, { ...found, amount: newAmount });
      }
      return amount;
    }
    return null;
  }
  deleteInventoryItemAtId(id: string) {
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.id === id) {
        this.inventory[i] = null;
        break;
      }
    }
  }
  isInventoryFull() {
    return this?.inventory?.every(Boolean) && this?.inventory?.length >= MAX_INVENTORY_ITEMS;
  }
  updateInventoryItemAtId(id: string, item: Item) {
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.id === id) {
        this.inventory[i] = item;
        break;
      }
    }
  }
  addInventoryItem(item: Item) {
    let itemAdded = false;
    for (var i = 0; i < this.inventory.length; i++) {
      if (!this.inventory[i]?.id) {
        itemAdded = true;
        this.inventory[i] = item;
        break;
      }
    }
    if (!itemAdded) {
      this.inventory.push(item);
    }
  }
  /* Abilities */
  findAbilityById(id: string): any {
    const [slotName, foundItem] = Object.entries(this?.abilities).find(
      ([_, slotItem]: [string, Item]) => slotItem?.id === id,
    ) || [null, null];
    return { item: foundItem, slotName };
  }
  subtractAbilityAtId(id: string, amount: integer) {
    const { item: found, slotName } = this.findAbilityById(id);
    if (found?.amount > amount && amount > 0) {
      const newAmount = found?.amount - amount;
      this.abilities[slotName] = { ...found, amount: newAmount };
      return amount;
    }
    return null;
  }
  deleteAbilityAtId(id: string) {
    const { slotName } = this.findAbilityById(id);
    this.abilities[slotName] = null;
  }
  clearAbilitySlot(slotName: string) {
    if (!this?.abilities?.[slotName]) return;
    this.abilities[slotName] = null;
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
      if (!allowedTargets.includes("enemy")) continue;

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
      if (!allowedTargets.includes("self") && player.id === this.id) continue;
      if (!allowedTargets.includes("enemy") && player.id !== this.id && !targetIsInParty) continue;
      /* `targetIsInParty` is also true for self (you're a member of your own party), so exclude
       * self here — otherwise self-only spells like stealth get filtered out when partied. */
      if (!allowedTargets.includes("ally") && targetIsInParty && player.id !== this.id) continue;

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
