import Character from "./Character";
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
  deleteInventoryItemAtId(id) {
    for (var i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i]?.id === id) {
        this.inventory[i] = null;
        break;
      }
    }
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
