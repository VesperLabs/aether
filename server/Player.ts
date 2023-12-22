import ServerCharacter from "./Character";
import { cloneObject, getRoomState, PLAYER_DEFAULT_SPAWN } from "./utils";
import { spellDetails, MAX_INVENTORY_ITEMS } from "../shared";

/* Server level Player object */
class Player extends ServerCharacter implements ServerPlayer {
  public email: string;
  public isDemoAccount?: boolean;
  public spawn: SpawnPoint;
  public userSettings: UserSettings;
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
  doAttack({ count, direction, castAngle }) {
    const { scene, room, socketId } = this ?? {};

    if (this?.hasBuff("stun")) return;
    if (this?.state?.isDead) return;
    /* Serverside attack may not actually be ready. */
    const { percentageRemaining } = this.checkAttackReady();
    if (percentageRemaining > 5) return;

    const { spellName } = this.getAttackActionName({ count });
    const spCost = this.getAttackSpCost(count);

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

    this.dispelBuffsByProperty("dispelOnAttack", true);

    room?.spellManager.create({
      caster: this,
      castAngle,
      spellName,
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
    const ability = this?.abilities?.[abilitySlot];
    const spellName = ability?.base;
    //if the ability slotId is not in the activeItemSlots return
    if (this?.hasBuff("stun")) return;
    if (!this?.activeItemSlots?.includes?.(`${abilitySlot}`)) return;
    if (!ability || !ability?.ilvl || !spellName) return;
    if (!this.canCastSpell(abilitySlot)) return;

    this.state.lastCast.global = Date.now();

    if (spellName) {
      this.state.lastCast[spellName] = Date.now();
    }

    // Modify stats if there's a cost
    this.modifyStatIfCostExists("mp", ability?.stats?.mpCost || 0);
    this.modifyStatIfCostExists("hp", ability?.stats?.hpCost || 0);
    this.modifyStatIfCostExists("sp", ability?.stats?.spCost || 0);

    this.dispelBuffsByProperty("dispelOnCast", true);

    this.room?.spellManager.create({
      caster: this,
      //target: targetPlayer,
      spellName,
      castAngle,
      ilvl: ability?.ilvl,
      abilitySlot,
    });
  }
  addNpcKill(npcName: string) {
    this.npcKills[npcName] = this?.npcKills?.[npcName] + 1 || 1;
  }
  addQuest(quest: Quest) {
    if (this.quests.find((q) => q?.questId === quest?.id)) return;
    this.quests.push({ questId: quest?.id, isCompleted: false });
  }
  updateChatQuests(npcName: string): Array<PlayerQuest> {
    const quests = this.scene.quests;
    const playerQuests = this?.quests.map((playerQuest) => {
      const quest = quests[playerQuest?.questId];
      if (quest?.objectives?.some((q) => q?.keeper === npcName && !playerQuest.isCompleted)) {
        return { ...playerQuest, isReady: true };
      }
      return playerQuest;
    });
    this.quests = playerQuests;
    return playerQuests;
  }
  completeQuest(questId: string) {
    const quest = this.scene.quests?.[questId];
    const questItems = quest?.rewards?.items || [];
    const objectives = quest?.objectives || [];
    const foundQuest: PlayerQuest = this.getPlayerQuestStatus(quest);

    if (foundQuest?.isCompleted) return { error: "Quest has already been completed." };
    if (!foundQuest?.isReady) return { error: "Quest objectives are not complete." };

    let inventoryFull = false;

    for (const item of questItems) {
      if (!item) continue;
      // Check if the inventory is already full before creating a new item
      // TODO: If we ever give out stackables, we need to modify how this checks
      if (this.isInventoryFull()) {
        inventoryFull = true;
      } else {
        this.addInventoryItem(item);
      }
    }

    if (inventoryFull && questItems.length > 0) {
      return { error: "Cannot turn in quest. Inventory is full" }; // If the inventory is full, exit the loop and return false
    }

    /* Remove objective items from inventory */
    for (const objective of objectives) {
      if (!objective) continue;
      /* Only works for stackable items */
      if (objective?.type === "item") {
        const itemId = objective?.item?.[2];
        this.subtractInventoryItemAtId(itemId, objective?.amount) ||
          this.subtractBagItemAtId(itemId, objective?.amount) ||
          this.subtractAbilityAtId(itemId, objective?.amount);
      }
    }

    const didLevel = this.assignExp(quest?.rewards?.exp);
    this.gold += quest?.rewards?.gold ?? 0;
    this.quests.find((q) => q?.questId === quest?.id).isCompleted = true;

    return { didLevel };
  }
  /* Equipment */
  findEquipmentById(id: string): any {
    const [slotName, foundItem] = Object.entries(this?.equipment).find(
      ([_, slotItem]: [string, Item]) => slotItem?.id === id
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
      ([_, slotItem]: [string, Item]) => slotItem?.id === id
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
  doHit(ids, abilitySlot): void {
    const { scene } = this ?? {};
    // ability slot will be null for attacks
    const hero: ServerPlayer = this;
    if (!hero || hero?.state?.isDead) return;
    const roomName: string = hero?.roomName;
    const room = scene.roomManager.rooms[roomName];
    const abilityName = hero?.abilities?.[abilitySlot]?.base || "attack_left";
    const allowedTargets = spellDetails?.[abilityName]?.allowedTargets;
    const party = scene.partyManager.getPartyById(hero?.partyId);
    /* Create hitList for npcs */
    let hitList: Array<Hit> = [];
    let npcKills: Array<string> = [];
    let totalExpGain: number = 0;
    let playerIdsToUpdate = []; //ids of players that either got exp or buffs
    let playerIdsThatLeveled = []; //ids of players who got a level up.
    const npcs: Array<Npc> = room?.npcManager?.getNpcs();
    const players: Array<ServerPlayer> = room?.playerManager?.getPlayers();

    for (const npc of npcs) {
      if (!ids?.includes(npc.id)) continue;
      // only allow spells to hit intended targets
      if (!allowedTargets?.includes("enemy")) continue;

      const newHits = hero.calculateDamage(npc, abilitySlot);

      /* If we kill the NPC */
      if (newHits?.find?.((h: Hit) => h?.type === "death")) {
        npc.dropLoot(hero?.stats?.magicFind);
        /* Add EXP, check if we leveled */
        totalExpGain += parseInt(npc?.stats?.expValue) || 0;
        npcKills.push(npc?.name);
      }
      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    /* Send exp update to client */
    if (hitList?.some((hit) => hit.type === "death")) {
      // either you are in a party, or you are in a fake party object
      const partyMembers = scene.partyManager.getPartyById(hero?.partyId)?.members || [
        { id: hero?.id, roomName: hero?.roomName },
      ];
      // party members in same room will gain exp
      const partyMembersInRoom = partyMembers?.filter((m) => m?.roomName === hero?.roomName);
      for (const m of partyMembersInRoom) {
        const member: ServerPlayer = scene?.players?.[m?.id];
        if (!member) continue;
        const didLevel = member.assignExp(totalExpGain);
        /* Add the npc to the players kill list */
        for (const npcName of npcKills) {
          member.addNpcKill(npcName);
        }
        playerIdsToUpdate.push(member?.id);
        if (didLevel) {
          playerIdsThatLeveled.push(member?.id);
        }
      }
    }
    for (const player of players) {
      const targetIsInParty = party?.members?.find((m) => m?.id === player?.id);
      /* TODO: verify location of hit before we consider it a hit */
      if (!ids?.includes(player.id)) continue;
      // only allow spells to hit intended targets
      if (!allowedTargets?.includes("self")) {
        if (player.id === hero.id) continue;
      }
      if (!allowedTargets?.includes("enemy")) {
        if (player.id !== hero.id && !targetIsInParty) continue;
      }
      if (!allowedTargets.includes("ally")) {
        if (targetIsInParty) continue;
      }
      const newHits = hero.calculateDamage(player, abilitySlot);

      if (newHits?.length > 0) hitList = [...hitList, ...newHits];
    }

    // send each buffed hero and npc their new state
    if (playerIdsToUpdate?.length > 0) {
      const roomState = getRoomState(scene, roomName);
      scene.io.to(roomName).emit("buffUpdate", {
        players: roomState?.players?.filter((n) => playerIdsToUpdate?.includes(n?.id)),
        playerIdsThatLeveled,
      });
    }

    scene.io.to(roomName).emit("assignDamage", hitList);
  }
}

export default Player;
