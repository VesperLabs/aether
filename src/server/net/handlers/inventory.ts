import { getFullCharacterState } from "@/network/sync";
import { cloneJson } from "@/content/items/dice";
import { addStackAmounts, resolveGrab } from "@/rules/loot";
import { removeLoot, spawnLoot } from "../../loot-adapter";
import { POTION_BASES, consumeItemCommand, dropItemCommand, dropPosition } from "@/rules/inventory";
import type { AbilitySlot } from "@/rules/spells";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { isInRoom } from "@/server/world/player-room";

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
      roomName: player.roomName ?? undefined,
      x: player.x,
      y: player.y,
    },
    hasStackToJoin: !!stackTarget,
    inventoryFull: !!player?.isInventoryFull(),
  });
  if (outcome === "ignore" || !isInRoom(player)) return;
  /* Face the loot */
  if (direction) player.direction = direction;
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
  if (!isInRoom(player)) return;
  const result = dropItemCommand(player, request ?? {});
  if (!result.ok) {
    if (result.error) socket.emit("message", { type: "error", message: result.error });
    return;
  }

  player.calculateStats();

  /* Make the item pop up where they dropped it */
  spawnLoot(world, player.roomName, {
    ...dropPosition(player),
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
  if (!isInRoom(player) || player.state?.isDead) return;
  /* The same cooldowns the client shows: potions share one, food in a slot uses that slot's */
  const isReady = (item: { id?: string; base?: string }, location: string) => {
    if (POTION_BASES.includes(item.base as string)) return player.checkPotionCooldown().isReady;
    if (item.base === "food" && location === "abilities") {
      const slot = Object.keys(player.abilities ?? {}).find(
        (s) => player.abilities?.[s]?.id === item.id,
      );
      return !!slot && !!player.canCastSpell(slot as AbilitySlot);
    }
    return true;
  };
  const result = consumeItemCommand(player, request ?? {}, isReady);
  if (!result.consumed) return;

  /* If the item has effects */
  if (result.isPotion) {
    /* Set potion cooldown */
    player.state.lastPotion = world.now();
    if (result.hp) player.modifyStat("hp", result.hp);
    if (result.mp) player.modifyStat("mp", result.mp);
  }

  /* If the item has buffs */
  if (result.isFood) {
    for (const [buffName, level] of Object.entries(result.buffs)) {
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
