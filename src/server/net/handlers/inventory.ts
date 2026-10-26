import { getFullCharacterState, cloneObject } from "../../utils";
import { CONSUMABLES_BASES, POTION_BASES } from "@/shared";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function grabLoot(
  ctx: CommandContext,
  { lootId, direction }: ParsedCommand<"grabLoot"> = {},
) {
  const { scene, socket, socketId, io } = ctx;
  if (scene.loots[lootId]?.expiredSince) return; //loot expired, do not let them pick it
  const player = scene.players[socketId];
  const loot = cloneObject(scene.loots[lootId]);
  const item = loot?.item;
  if (!loot || !player || !item) return;
  if (player?.state?.isDead) return;
  /* Face the loot */
  player.direction = direction;
  /* Check where to put loot */
  if (item.type === "stackable") {
    let foundItem =
      player?.findBagItemById(item?.id)?.["item"] ||
      player.findAbilityById(item.id)?.["item"] ||
      player.findInventoryItemById(item.id);
    if (foundItem) {
      /* Delete loot from server */
      scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
      /* TODO: a function that handles setting an items amount
      - Needs to handle strings and nullish values
       */
      foundItem.amount = parseInt(foundItem.amount || 0) + parseInt(item?.amount || 0);
    } else {
      /* If our inventory is full we do not pick it up */
      if (player.isInventoryFull()) {
        return socket.emit("message", {
          type: "error",
          message: "Inventory is full.",
        });
      }
      /* Delete loot from server */
      scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
      player.addInventoryItem(item);
    }
  } else {
    /* If our inventory is full we do not pick it up */
    if (player.isInventoryFull()) {
      return socket.emit("message", {
        type: "error",
        message: "Inventory is full.",
      });
    }
    /* Delete loot from server */
    scene.roomManager.rooms[player?.roomName].lootManager.remove(lootId);
    player.addInventoryItem(item);
  }
  /* Save player */
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("lootGrabbed", {
    socketId,
    loot,
    /* TODO: This is a big state update. Probably only need to update inventory and quests */
    player: getFullCharacterState(player),
  });
}

export function dropItem(
  ctx: CommandContext,
  { location, bagId, item, ...rest }: ParsedCommand<"dropItem"> = {},
) {
  const { scene, socket, socketId, io } = ctx;
  /* Prevent dropping full bags */
  if (item?.base === "bag" && item?.items?.filter((i: Item) => i)?.length > 0) {
    return socket.emit("message", {
      type: "error",
      message: "Cannot drop a bag with items inside of it.",
    });
  }

  const amount = Math.abs(parseInt(String(rest?.amount))) || 1;
  const player = scene?.players?.[socketId];
  let found = null;
  let dropAmount: integer;

  if (location === "equipment") {
    const { item: f, slotName } = player?.findEquipmentById(item?.id) ?? {};
    found = f;
    /* Remove it from the players equipment */
    player?.clearEquipmentSlot(slotName);
  }

  if (location === "abilities") {
    const { item: f, slotName } = player?.findAbilityById(item?.id) ?? {};
    found = f;
    if (amount >= found?.amount) {
      dropAmount = found?.amount;
      player?.clearAbilitySlot(slotName);
    } else {
      dropAmount = player?.subtractAbilityAtId(item?.id, amount);
      if (!dropAmount) return;
    }
  }

  if (location === "inventory") {
    found = player?.findInventoryItemById(item?.id);
    if (amount >= found?.amount) {
      dropAmount = found?.amount;
      player?.deleteInventoryItemAtId(item?.id);
    } else {
      dropAmount = player?.subtractInventoryItemAtId(item?.id, amount);
      if (!dropAmount) return;
    }
  }

  if (location === "bag") {
    found = cloneObject(player?.findBagItemById(item?.id)?.["item"]);
    if (amount >= found?.amount) {
      dropAmount = found?.amount;
      player?.deleteBagItemAtId(item?.id);
    } else {
      dropAmount = player?.subtractBagItemAtId(item?.id, amount);
      if (!dropAmount) return;
    }
  }

  if (!found) return;

  player?.calculateStats();

  /* Make the item pop up where they dropped it */
  const coords: Coordinate = { x: player?.x, y: player?.y };
  if (player?.direction === "left") coords.x -= 16;
  if (player?.direction === "right") coords.x += 16;
  if (player?.direction === "up") coords.y -= 16;
  if (player?.direction === "down") coords.y += 16;

  /* Spawn the loot on the server */
  scene.roomManager.rooms[player?.roomName].lootManager.create({
    ...coords,
    item: { ...found, ...(dropAmount ? { amount: dropAmount } : {}) },
    npcId: null,
  });
  /* Save the users data */
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
}

export function consumeItem(
  ctx: CommandContext,
  { location, item }: ParsedCommand<"consumeItem"> = {},
) {
  const { scene, socketId, io } = ctx;
  const player = scene?.players?.[socketId];
  let playerItem: Item;
  if (player?.state?.isDead) return;
  if (!["inventory", "abilities", "bag"].includes(location)) return;
  /* Using an item from the inventory */
  if (location === "inventory") {
    playerItem = player?.findInventoryItemById(item?.id);
    if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
    if (!playerItem?.amount) return;
    player?.subtractInventoryItemAtId(item?.id, 1);
  }
  /* Using an item from abilities */
  if (location === "abilities") {
    const { item: found } = player?.findAbilityById(item?.id) ?? {};
    playerItem = found;
    if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
    if (!playerItem?.amount) return;
    if (playerItem?.amount <= 1) {
      player?.deleteAbilityAtId(item?.id);
    } else {
      player?.subtractAbilityAtId(item?.id, 1);
    }
  }
  /* Using an item from the inventory */
  if (location === "bag") {
    playerItem = player?.findBagItemById(item?.id)?.["item"];
    if (!CONSUMABLES_BASES?.includes(playerItem?.base)) return;
    if (!playerItem?.amount) return;
    if (playerItem?.amount <= 1) {
      player?.deleteBagItemAtId(item?.id);
    } else {
      player?.subtractBagItemAtId(item?.id, 1);
    }
  }
  /* If the item has effects */
  if (POTION_BASES.includes(playerItem.base)) {
    /* Set potion cooldown */
    player.state.lastPotion = Date.now();
    if (playerItem?.effects?.hp) {
      //const hp = (parseInt(playerItem?.effects?.hp) / 100) * player?.stats?.maxHp;
      player.modifyStat("hp", playerItem?.effects?.hp);
    }
    if (playerItem?.effects?.mp) {
      //const mp = (parseInt(playerItem?.effects?.mp) / 100) * player?.stats?.maxMp;
      player.modifyStat("mp", playerItem?.effects?.mp);
    }
  }

  /* If the item has buffs */
  if (playerItem?.base === "food") {
    for (const [buffName, level] of Object.entries(playerItem.buffs)) {
      player.addBuff({ name: buffName, level, caster: player, shouldCalculateStats: false });
    }
  }

  player?.calculateStats();
  /* Save the users data */
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
}
