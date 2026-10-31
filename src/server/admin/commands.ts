import { ItemBuilder } from "@/content";
import type { CommandContext } from "@/server/net/command-context";
import { getFullCharacterState } from "@/network/sync";
import { CHAT_COMMANDS } from "@/network";
import { getRoomState } from "@/server/net/room-sync";
import { spawnLoot } from "../loot-adapter";
import { DROP_USAGE, parseDropArgs } from "./drop-args";
import { isInRoom } from "@/server/player-room";

/** Cheat chat commands (`/drop`, `/ding`...) only work when the server runs with ENABLE_CHEATS=true. */
export function areCheatsEnabled(): boolean {
  return process.env.ENABLE_CHEATS === "true";
}

const ADMIN_COMMANDS = new Set<string>(CHAT_COMMANDS.filter((c) => c.cheat).map((c) => c.name));

/**
 * Runs a `/command` typed in chat. Returns true when the message was an admin command and has been
 * answered, false when it is not one (or admin commands are off) and should be sent as plain chat.
 */
export function runAdminCommand(ctx: CommandContext, rawMessage: string): boolean {
  if (!areCheatsEnabled()) return false;
  const command = rawMessage.substr(1).split(" ");
  if (!ADMIN_COMMANDS.has(command[0])) return false;
  execute(ctx, command);
  return true;
}

function execute(ctx: CommandContext, command: string[]) {
  const { world, socket, io } = ctx;
  const player = world?.players?.[ctx.socketId];
  if (!isInRoom(player)) return;
  const cmdErr = (message: string) => socket.emit("message", { type: "error", message });
  /* Cheats answer only the player who used them, as a status line, never as chat */
  const cmdInfo = (message: string) => socket.emit("message", { type: "info", message });
  const itemLabel = (item: Item, amount = 1) =>
    `${amount > 1 ? `${amount}× ` : ""}${item.rarity} ${item.name ?? item.key}`;

  switch (command[0]) {
    case "drop": {
      const drop = parseDropArgs(command.slice(1));
      if ("error" in drop) return cmdErr(drop.error);
      const built = ItemBuilder.buildItem(
        drop.type,
        drop.rarity,
        drop.key,
        drop.amount,
      ) as Item | null;
      if (!built) {
        return cmdErr(`There is no ${drop.rarity} ${drop.key}. ${DROP_USAGE}`);
      }
      spawnLoot(world, player?.roomName, {
        x: player?.x,
        y: player?.y,
        item: built,
        npcId: null,
      });
      return cmdInfo(`Dropped ${itemLabel(built, drop.amount)}.`);
    }
    case "coords":
      world.db.updateUserMapDetails(player);
      return cmdInfo(`x: ${Math.round(player.x)} y: ${Math.round(player.y)}`);
    case "ding": {
      const exp = parseInt(command[1], 10);
      if (!Number.isFinite(exp)) {
        return cmdErr("Usage: /ding <experience> — positive integer XP to grant.");
      }
      const didLevel = player.assignExp(exp);
      const roomState = getRoomState(world, player?.roomName);
      world.io.to(player?.roomName).emit("buffUpdate", {
        players: roomState?.players?.filter((n) => n?.id === player?.id),
        playerIdsThatLeveled: didLevel ? [player?.id] : [],
      });
      return cmdInfo(`Gained ${exp} experience.`);
    }
    case "booty": {
      const gold = parseInt(command[1], 10);
      if (!Number.isFinite(gold) || gold <= 0) {
        return cmdErr("Usage: /booty <amount> — positive integer gold to add.");
      }
      player.gold += gold;
      io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
      return cmdInfo(`Added ${gold} gold.`);
    }
    case "guns": {
      const gunRarities = ["unique", "common", "set", "rare", "magic"] as const;
      const rarity = command[1];
      if (!rarity || !gunRarities.includes(rarity as (typeof gunRarities)[number])) {
        return cmdErr(
          "Usage: /guns <rarity> — rarity must be exactly one of: unique, common, set, rare, magic.",
        );
      }
      let gunItem = null;
      do {
        gunItem = ItemBuilder.rollDrop(100, 100);
      } while (gunItem?.rarity !== rarity);
      const gun = ItemBuilder.buildItem(gunItem.type, gunItem.rarity, gunItem.key) as Item;
      spawnLoot(world, player?.roomName, { x: player?.x, y: player?.y, item: gun, npcId: null });
      return cmdInfo(`Dropped ${itemLabel(gun)}.`);
    }
  }
}
