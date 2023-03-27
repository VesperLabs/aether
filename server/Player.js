import Character from "./Character";
import { cloneObject } from "./utils";
class Player extends Character {
  /* Server level Player object */
  constructor(scene, { email, ...args }) {
    super(scene, args);
    this.email = email;
  }
  setDead() {
    this.state.isDead = true;
  }
  findEquipmentById(id) {
    const [slotName, foundItem] = Object.entries(this?.equipment).find(
      ([slotName, slotItem]) => slotItem?.id === id
    ) || [null, null];
    return { item: foundItem, slotName };
  }
  findInventoryItemById(id) {
    let returnItem = null;
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.id === id) {
        returnItem = this.inventory[i];
        break;
      }
    }
    return returnItem;
  }
  subtractInventoryItemAtId(id, amount) {
    const found = cloneObject(this.findInventoryItemById(id));
    if (found?.amount > amount && amount > 0) {
      const newAmount = found?.amount - amount;
      this.deleteInventoryItemAtId(id);
      this.addInventoryItem({ ...found, amount: newAmount });
      return amount;
    }
    return null;
  }
  deleteInventoryItemAtId(id) {
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
  addInventoryItem(item) {
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
  update() {
    this.doRegen();
  }
  clearEquipmentSlot(slotName) {
    if (!this?.equipment?.[slotName]) return;
    this.equipment[slotName] = null;
  }
}

module.exports = Player;
