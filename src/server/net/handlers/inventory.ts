import { getFullCharacterState } from "@/shared/network/sync";
import { cloneJson } from "@/shared/content";
import { addStackAmounts, resolveGrab } from "@/shared/rules/loot";
import { removeLoot, spawnLoot } from "../../loot-adapter";
import { consumeItem as consumeItemRule, dropItem as dropItemRule } from "@/shared/rules/inventory";
import { applyInventoryState, toInventoryState } from "../../player-inventory";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function grabLoot(
  ctx: CommandContext,
  { lootId, direction }: ParsedCommand<"grabLoot"> = {},
) {
  const { world, socket, socketId, io } = ctx;
  const player = world.players[socketId];
  /* A missing id looks up nothing, as before. */
  const key = `${lootId}`;
  const loot = cloneJson(world.loots[key]);
  const item = loot?.item;
  /* Stackables join a stack the player already has, wherever it is */
  const stackTarget =
    item?.type === "stackable" && player
      ? player.findBagItemById(item.id)?.["item"] ||
        player.findAbilityById(item.id)?.["item"] ||
        player.findInventoryItemById(item.id)
      : null;
  const outcome = resolveGrab({
    loot: world.loots[key],
    hasGrabber: !!player,
    grabberIsDead: player?.state?.isDead,
    grabberPosition: player && {
      roomName: player.roomName,
      x: player.x,
      y: player.y,
    },
    hasStackToJoin: !!stackTarget,
    inventoryFull: !!player?.isInventoryFull(),
  });
  if (outcome === "ignore") return;
  /* Face the loot */
  player.direction = direction as string;
  if (outcome === "inventoryFull") {
    return socket.emit("message", {
      type: "error",
      message: "Inventory is full.",
    });
  }
  /* Delete loot from server */
  removeLoot(world, key);
  if (outcome === "stack" && stackTarget) {
    stackTarget.amount = addStackAmounts(stackTarget.amount, item?.amount);
  } else {
    player.addInventoryItem(item);
  }
  /* Save player */
  world.db.updateUser(player);
  io.to(player?.roomName).emit("lootGrabbed", {
    socketId,
    loot,
    /* TODO: This is a big state update. Probably only need to update inventory and quests */
    player: getFullCharacterState(player),
  });
}

export function dropItem(ctx: CommandContext, request: ParsedCommand<"dropItem"> = {}) {
  const { world, socket, socketId, io } = ctx;
  const player = world?.players?.[socketId];
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
  spawnLoot(world, player.roomName, {
    ...coords,
    item: result.item,
    npcId: null,
  });
  /* Save the users data */
  world.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}

export function consumeItem(ctx: CommandContext, request: ParsedCommand<"consumeItem"> = {}) {
  const { world, socketId, io } = ctx;
  const player = world?.players?.[socketId];
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
    for (const [buffName, level] of Object.entries(result.buffs as Record<string, number>)) {
      player.addBuff({
        name: buffName,
        level,
        caster: player,
        shouldCalculateStats: false,
      });
    }
  }

  player.calculateStats();
  /* Save the users data */
  world.db.updateUser(player);
  io.to(player.roomName).emit("playerUpdate", getFullCharacterState(player));
}
