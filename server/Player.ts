import ServerCharacter from "./Character";
import { cloneObject } from "./utils";

/* Server level Player object */
class Player extends ServerCharacter implements Player {
  public email: string;
  constructor(scene: ServerScene, args: Player) {
    super(scene, args);
    this.email = args?.email;
    this.calculateStats();
  }
  setDead() {
    this.state.isDead = true;
  }
  addNpcKill(npc: Npc) {
    this.npcKills[npc.name] = this?.npcKills?.[npc?.name] + 1 || 1;
  }
  addQuest(quest: Quest) {
    if (this.quests.find((q) => q?.questId === quest?.id)) return;
    this.quests.push({ questId: quest?.id, isCompleted: false });
  }
  completeQuest(quest: Quest) {
    const questItems = quest?.rewards?.items || [];
    const objectives = quest?.objectives || [];
    const foundQuest: PlayerQuest = this.getPlayerQuestStatus(quest);
    if (!foundQuest?.isReady) return false;

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
        const itemId = objective?.target?.[2];
        this.subtractInventoryItemAtId(itemId, objective?.amount);
      }
    }

    const didLevel = this.assignExp(quest?.rewards?.exp);
    this.gold += quest?.rewards?.gold;
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
    if (found?.amount > amount && amount > 0) {
      const newAmount = found?.amount - amount;
      this.updateInventoryItemAtId(id, { ...found, amount: newAmount });
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
    return this?.inventory?.every(Boolean) && this?.inventory?.length >= 30;
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
  update() {
    this.expireBuffs();
    this.doRegen();
    this.checkBubbleMessage();
  }
}

export default Player;
