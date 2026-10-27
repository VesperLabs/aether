import { ItemBuilder, isItemBuildRarity, ITEM_BUILD_RARITIES } from "@/content";
import type { CommandContext } from "@/server/net/command-context";
import { getFullCharacterState } from "@/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import { spawnLoot } from "../loot-adapter";
import { isInRoom } from "@/server/player-room";

/** Cheat and debug chat commands (`/drop`, `/ding`...) only work when the server runs with DEBUG=true. */
export function isAdminEnabled(): boolean {
  return process.env.DEBUG === "true";
}

const ADMIN_COMMANDS = new Set(["drop", "coords", "ding", "booty", "guns"]);

/**
 * Runs a `/command` typed in chat. Returns true when the message was an admin command and has been
 * answered, false when it is not one (or admin commands are off) and should be sent as plain chat.
 */
export function runAdminCommand(ctx: CommandContext, rawMessage: string): boolean {
  if (!isAdminEnabled()) return false;
  const command = rawMessage.substr(1).split(" ");
  if (!ADMIN_COMMANDS.has(command[0])) return false;
  execute(ctx, rawMessage, command);
  return true;
}

function execute(ctx: CommandContext, rawMessage: string, command: string[]) {
  const { world, socket, io } = ctx;
  const player = world?.players?.[ctx.socketId];
  if (!isInRoom(player)) return;
  const args = { message: rawMessage };
  const cmdErr = (message: string) => socket.emit("message", { type: "error", message });

  switch (command[0]) {
    case "drop": {
      const raw = command[1]?.trim();
      if (!raw) {
        return cmdErr(
          "Usage: /drop <type>-<rarity>-<itemKey>-<amount> — four hyphen-separated parts, e.g. /drop weapon-common-sword-1",
        );
      }
      const itemParams = raw.split("-");
      const [itemType, itemRarity, itemKey, itemAmount] = itemParams;
      if (!itemType || !itemRarity || !itemKey || itemAmount === undefined || itemAmount === "") {
        return cmdErr(
          "Usage: /drop <type>-<rarity>-<itemKey>-<amount> — four hyphen-separated parts, e.g. /drop weapon-common-sword-1",
        );
      }
      if (!isItemBuildRarity(itemRarity)) {
        return cmdErr(
          `Invalid rarity "${itemRarity}". Use one of: ${ITEM_BUILD_RARITIES.join(", ")}.`,
        );
      }
      const built = ItemBuilder.buildItem(itemType, itemRarity, itemKey, itemAmount) as Item | null;
      if (!built) {
        return cmdErr(
          "Invalid /drop: no item matches that type, rarity, and key. Usage: /drop <type>-<rarity>-<itemKey>-<amount>",
        );
      }
      spawnLoot(world, player?.roomName, {
        x: player?.x,
        y: player?.y,
        item: built,
        npcId: null,
      });
      return socket.emit("message", {
        from: player?.profile?.userName,
        type: "chat",
        message: args.message,
      });
    }
    case "coords":
      world.db.updateUserMapDetails(player);
      return socket.emit("message", {
        type: "info",
        message: `x: ${Math.round(player.x)} y: ${Math.round(player.y)}`,
      });
    case "ding": {
      const exp = parseInt(command[1], 10);
      if (!Number.isFinite(exp)) {
        return cmdErr("Usage: /ding <experience> — positive integer XP to grant.");
      }
      const didLevel = player.assignExp(exp);
      const roomState = getRoomState(world, player?.roomName);
      return world.io.to(player?.roomName).emit("buffUpdate", {
        players: roomState?.players?.filter((n) => n?.id === player?.id),
        playerIdsThatLeveled: didLevel ? [player?.id] : [],
      });
    }
    case "booty": {
      const gold = parseInt(command[1], 10);
      if (!Number.isFinite(gold) || gold <= 0) {
        return cmdErr("Usage: /booty <amount> — positive integer gold to add.");
      }
      player.gold += gold;
      return io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
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
      if (gunItem) {
        spawnLoot(world, player?.roomName, {
          x: player?.x,
          y: player?.y,
          item: ItemBuilder.buildItem(gunItem.type, gunItem.rarity, gunItem.key) as Item,
          npcId: null,
        });
      }
      return socket.emit("message", {
        from: player?.profile?.userName,
        type: "chat",
        message: args.message,
      });
    }
  }
}
