import crypto from "crypto";
import { getFullCharacterState, cloneObject, checkSlotsMatch, SHOP_INFLATION } from "../../utils";
import { isNil } from "lodash";
import type { CommandContext } from "@/server/net/command-context";

/** The validated payload, loosened because the item code below still works on untyped slots. */
// oxlint-disable-next-line typescript/no-explicit-any
type MoveItemPayload = { to?: any; from?: any };

export function moveItem(ctx: CommandContext, { to, from }: MoveItemPayload = {}) {
  const { scene, socket, socketId, io } = ctx;
  const player = scene?.players?.[socketId];
  let toItem, fromItem;

  /* Clone the from item so we can work with it */
  if (from?.location === "inventory") {
    from.itemId = player?.inventory?.[from?.slot]?.id;
    fromItem = cloneObject(player?.findInventoryItemById(from?.itemId));
  }
  if (from?.location === "equipment") {
    from.itemId = player?.equipment?.[from?.slot]?.id;
    fromItem = cloneObject(player?.findEquipmentById(from?.itemId))?.item;
  }
  if (from?.location === "abilities") {
    from.itemId = player?.abilities?.[from?.slot]?.id;
    fromItem = cloneObject(player?.findAbilityById(from?.itemId))?.item;
  }
  if (from?.location === "shop") {
    const npcId = player?.state?.targetNpcId;
    const shopSlot = scene?.npcs?.[npcId]?.keeperData?.shop?.[from?.slot];
    const isStackable = shopSlot?.item?.slot === "stackable";
    if (!npcId) return;
    if (!shopSlot?.stock) return;
    if (to?.location === "shop") return;
    from.itemId = shopSlot?.item?.id;
    fromItem = cloneObject({
      ...(shopSlot?.item || {}),
      /* If its stackable it gets a non-unique ID */
      id: isStackable ? from.itemId : crypto.randomUUID(),
      /* Stackable items support amounts */
      ...(isStackable ? { amount: from?.amount } : {}),
    });
  }

  if (from?.location === "bag") {
    fromItem = cloneObject(player?.findBagItemBySlot(from?.bagId, from?.slot));
    from.itemId = fromItem?.id;
  }

  /* Clone the to item so we can work with it */
  if (to?.location === "inventory") {
    to.itemId = player?.inventory?.[to?.slot]?.id;
    toItem = cloneObject(player?.findInventoryItemById(to?.itemId));
  }
  if (to?.location === "equipment") {
    to.itemId = player?.equipment?.[to?.slot]?.id;
    toItem = cloneObject(player?.findEquipmentById(to?.itemId))?.item;
  }
  if (to?.location === "abilities") {
    to.itemId = player?.abilities?.[to?.slot]?.id;
    toItem = cloneObject(player?.findAbilityById(to?.itemId))?.item;
  }
  if (to?.location === "bag") {
    /* Dragging directly into a bag */
    if (to?.slot) {
      toItem = cloneObject(player?.findBagItemBySlot(to?.bagId, to?.slot));
      /* Dragging on a bag */
    } else {
      to.slot = player.findOpenBagSlot(to?.bagId, fromItem);
      toItem = cloneObject(player?.findBagItemBySlot(to?.bagId, to?.slot));
      if (isNil(to?.slot))
        return socket.emit("message", {
          type: "error",
          message: "Bag is full.",
        });
    }
    to.itemId = toItem?.id;
  }

  /* Cannot put bags in bags */
  if (fromItem?.base === "bag" && to?.bagId)
    return socket.emit("message", {
      type: "error",
      message: "Cannot put bags in bags.",
    });

  /* Same non-stackable item, return */
  if (from.itemId === to.itemId) {
    if (fromItem?.slot !== "stackable" && toItem?.slot !== "stackable") return;
  }

  /* Inventory -> Inventory */
  if (from?.location === "inventory" && to?.location === "inventory") {
    player?.deleteInventoryItemAtId(from?.itemId);
    player.inventory[to?.slot] = fromItem;
    player.inventory[from?.slot] = toItem;
  }

  /* Inventory -> Equipment */
  if (from?.location === "inventory" && to?.location === "equipment") {
    if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
    player?.deleteInventoryItemAtId(from?.itemId);
    player.equipment[to?.slot] = fromItem;
    player.inventory[from?.slot] = toItem;
  }

  /* Inventory -> Abilities */
  if (from?.location === "inventory" && to?.location === "abilities") {
    if (!["spell", "stackable"].includes(fromItem?.type)) return;
    player?.deleteInventoryItemAtId(from?.itemId);
    player.abilities[to?.slot] = fromItem;
    player.inventory[from?.slot] = toItem;
  }

  /* Inventory -> Bag */
  if (from?.location === "inventory" && to?.location === "bag") {
    if (!to?.bagId) return;
    player?.deleteInventoryItemAtId(from?.itemId);
    player.setBagItem(to?.bagId, to?.slot, fromItem);
    player.inventory[from?.slot] = toItem;
  }

  /* Inventory -> Shop */
  if (from?.location === "inventory" && to?.location === "shop") {
    let sellQty = Math.abs(parseInt(from?.amount)) || 1;
    const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
    player?.subtractInventoryItemAtId(from?.itemId, sellQty);
    player.gold += sellQty * cost;
  }

  /* Bag -> Bag */
  if (from?.location === "bag" && to?.location === "bag") {
    if (!from?.bagId || !to?.bagId) return;
    player?.deleteBagItemAtId(from?.itemId);
    player.setBagItem(to?.bagId, to?.slot, fromItem);
    player.setBagItem(from?.bagId, from?.slot, toItem);
  }

  /* Bag -> Inventory */
  if (from?.location === "bag" && to?.location === "inventory") {
    if (!from?.bagId) return;
    player?.deleteBagItemAtId(from?.itemId);
    player.inventory[to?.slot] = fromItem;
    player.setBagItem(from?.bagId, from?.slot, toItem);
  }

  /* Bag -> Abilities */
  if (from?.location === "bag" && to?.location === "abilities") {
    if (!from?.bagId) return;
    if (!["spell", "stackable"].includes(fromItem?.type)) return;
    player?.deleteBagItemAtId(from?.itemId);
    player.abilities[to?.slot] = fromItem;
    player.setBagItem(from?.bagId, from?.slot, toItem);
  }

  /* Bag -> Equipment */
  if (from?.location === "bag" && to?.location === "equipment") {
    if (!from?.bagId) return;
    if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
    player?.deleteBagItemAtId(from?.itemId);
    player.equipment[to?.slot] = fromItem;
    player.setBagItem(from?.bagId, from?.slot, toItem);
  }

  /* Bag -> Shop */
  if (from?.location === "bag" && to?.location === "shop") {
    if (!from?.bagId) return;
    let sellQty = Math.abs(parseInt(from?.amount)) || 1;
    const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
    player?.deleteBagItemAtId(from?.itemId);
    player.gold += sellQty * cost;
  }

  /* Equipment -> Equipment */
  if (from?.location === "equipment" && to?.location === "equipment") {
    if (!checkSlotsMatch(fromItem?.slot, to?.slot)) return;
    player?.clearEquipmentSlot(from?.slot);
    player.equipment[to?.slot] = fromItem;
    player.equipment[from?.slot] = toItem;
  }

  /* Equipment -> Inventory */
  if (from?.location === "equipment" && to?.location === "inventory") {
    if (toItem && !checkSlotsMatch(toItem?.slot, from?.slot)) return;
    player?.clearEquipmentSlot(from?.slot);
    player.inventory[to?.slot] = fromItem;
    player.equipment[from?.slot] = toItem;
  }

  /* Equipment -> Shop */
  if (from?.location === "equipment" && to?.location === "shop") {
    let sellQty = Math.abs(parseInt(from?.amount)) || 1;
    const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
    player?.clearEquipmentSlot(from?.slot);
    player.gold += sellQty * cost;
  }

  /* Equipment -> Bag */
  if (from?.location === "equipment" && to?.location === "bag") {
    if (toItem && !checkSlotsMatch(toItem?.slot, fromItem?.slot)) return;
    if (!to?.bagId) return;
    player?.clearEquipmentSlot(from?.slot);
    player.setBagItem(to?.bagId, to?.slot, fromItem);
    player.equipment[from?.slot] = toItem;
  }

  /* Abilities -> Abilities */
  if (from?.location === "abilities" && to?.location === "abilities") {
    player?.clearAbilitySlot(from?.slot);
    player.abilities[to?.slot] = fromItem;
    player.abilities[from?.slot] = toItem;
  }

  /* Abilities -> Inventory */
  if (from?.location === "abilities" && to?.location === "inventory") {
    if (toItem && !checkSlotsMatch(toItem?.type, fromItem?.type)) return;
    player?.clearAbilitySlot(from?.slot);
    player.inventory[to?.slot] = fromItem;
    player.abilities[from?.slot] = toItem;
  }

  /* Abilities -> Bag */
  if (from?.location === "abilities" && to?.location === "bag") {
    if (toItem && !checkSlotsMatch(toItem?.type, fromItem?.type)) return;
    if (!to?.bagId) return;
    player?.clearAbilitySlot(from?.slot);
    player.setBagItem(to?.bagId, to?.slot, fromItem);
    player.abilities[from?.slot] = toItem;
  }

  /* Abilities -> Shop */
  if (from?.location === "abilities" && to?.location === "shop") {
    let sellQty = Math.abs(parseInt(from?.amount)) || 1;
    const cost = Math.abs(parseInt(fromItem?.cost)) || 1;
    if (sellQty >= fromItem?.amount) {
      player?.deleteAbilityAtId(from?.itemId);
    } else {
      player?.subtractAbilityAtId(from?.itemId, sellQty);
    }
    player.gold += sellQty * cost;
  }

  let forceSlot = null;

  if (from.location === "shop") {
    const buyQty = Math.abs(parseInt(fromItem?.amount)) || 1;
    const buyCost = (Math.abs(parseInt(fromItem?.cost)) || 1) * buyQty;

    /* Always need a free slot */
    /* TODO: Fix it so we can buy a stackable no matter what if it exists */
    const stackableToStackable = fromItem?.id === toItem?.id;
    const itemToBlank = !toItem?.id;
    if (!stackableToStackable && !itemToBlank) return;

    /* Check if can afford */
    if (player.gold < buyCost) {
      return socket.emit("message", {
        type: "error",
        message: "You cannot afford this item",
      });
    }

    /* Check if the stackable is already somewhere */
    forceSlot =
      player?.findBagItemById(fromItem?.id)?.["item"] ||
      player.findAbilityById(fromItem.id)?.["item"] ||
      player.findInventoryItemById(fromItem.id);
    if (fromItem.type === "stackable" && forceSlot) {
      player.gold -= buyCost || 1;
      forceSlot.amount = parseInt(forceSlot.amount || 0) + parseInt(fromItem?.amount || 0);
    }

    /* Shop -> Inventory */
    if (to?.location === "inventory" && !forceSlot) {
      player.gold -= buyCost || 1;
      /* Remove inflation cost */
      fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
      player.inventory[to?.slot] = fromItem;
    }

    /* Shop -> Equipment */
    if (to?.location === "equipment" && !forceSlot) {
      if (fromItem && !checkSlotsMatch(fromItem?.slot, to?.slot)) return;
      player.gold -= buyCost || 1;
      /* Remove inflation cost */
      fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
      player.equipment[to?.slot] = fromItem;
    }

    /* Shop -> Abilities */
    if (to?.location === "abilities" && !forceSlot) {
      if (!["spell", "stackable"].includes(fromItem?.type)) return;
      player.gold -= buyCost || 1;
      /* Remove inflation cost */
      fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
      player.abilities[to?.slot] = fromItem;
    }

    /* Shop -> Bag */
    if (to?.location === "bag" && !forceSlot) {
      if (!to?.bagId) return;
      player.gold -= buyCost || 1;
      /* Remove inflation cost */
      fromItem.cost = Math.floor(fromItem.cost / SHOP_INFLATION);
      player.setBagItem(to?.bagId, to?.slot, fromItem);
    }
  }

  /* Save the users data */
  player?.calculateStats();
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
}
