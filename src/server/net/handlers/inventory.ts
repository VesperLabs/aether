import { getFullCharacterState, cloneObject } from "../../utils";
import { consumeItem as consumeItemRule, dropItem as dropItemRule } from "@/shared/rules/inventory";
import { applyInventoryState, toInventoryState } from "../../player-inventory";
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

export function dropItem(ctx: CommandContext, request: ParsedCommand<"dropItem"> = {}) {
  const { scene, socket, socketId, io } = ctx;
  const player = scene?.players?.[socketId];
  if (!player) return;
  const result = dropItemRule(toInventoryState(player), request ?? {});
  if (result.dropped === false) {
    if (result.error) socket.emit("message", { type: "error", message: result.error });
    return;
  }
  applyInventoryState(player, result.state);

  player.calculateStats();

  /* Make the item pop up where they dropped it */
  const coords: Coordinate = { x: player.x, y: player.y };
  if (player.direction === "left") coords.x -= 16;
  if (player.direction === "right") coords.x += 16;
  if (player.direction === "up") coords.y -= 16;
  if (player.direction === "down") coords.y += 16;

  /* Spawn the loot on the server */
  scene.roomManager.rooms[player.roomName].lootManager.create({
    ...coords,
    item: result.item,
    npcId: null,
  });
  /* Save the users data */
  scene.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}

export function consumeItem(ctx: CommandContext, request: ParsedCommand<"consumeItem"> = {}) {
  const { scene, socketId, io } = ctx;
  const player = scene?.players?.[socketId];
  if (!player || player.state?.isDead) return;
  const result = consumeItemRule(toInventoryState(player), request ?? {});
  if (!result.consumed) return;
  applyInventoryState(player, result.state);

  /* If the item has effects */
  if (result.isPotion) {
    /* Set potion cooldown */
    player.state.lastPotion = Date.now();
    if (result.hp) player.modifyStat("hp", result.hp);
    if (result.mp) player.modifyStat("mp", result.mp);
  }

  /* If the item has buffs */
  if (result.isFood) {
    for (const [buffName, level] of Object.entries(result.buffs)) {
      player.addBuff({ name: buffName, level, caster: player, shouldCalculateStats: false });
    }
  }

  player.calculateStats();
  /* Save the users data */
  scene.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}
