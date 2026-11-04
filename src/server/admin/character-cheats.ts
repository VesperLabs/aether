import { broadcastPlayerUpdate } from "@/server/net/room-broadcast";
import { ItemBuilder } from "@/content";
import { parseInteger, type Cheat } from "./cheat";
import { parseDropArgs } from "./drop-args";

const MAX_NAME_LENGTH = 16;

const heal: Cheat = (ctx, player, _args, reply) => {
  player.fillHpMp();
  broadcastPlayerUpdate(ctx.world, player);
  reply.info("Healed.");
};

const hp: Cheat = (ctx, player, [value], reply) => {
  const amount = parseInteger(value);
  if (amount === undefined || amount < 1) return reply.error("Usage: /hp <amount>, at least 1.");
  player.stats.hp = Math.min(amount, player.stats.maxHp);
  broadcastPlayerUpdate(ctx.world, player);
  reply.info(`Hp set to ${player.stats.hp}.`);
};

const give: Cheat = (ctx, player, args, reply) => {
  const drop = parseDropArgs(args);
  if ("error" in drop) return reply.error(drop.error.replace("/drop", "/give"));
  if (player.isInventoryFull()) return reply.error("Your inventory is full.");
  const item = ItemBuilder.buildItem(
    ctx.world.dice,
    drop.type,
    drop.rarity,
    drop.key,
    drop.amount,
  ) as Item | null;
  if (!item) return reply.error(`There is no ${drop.rarity} ${drop.key}.`);
  player.addInventoryItem(item);
  ctx.world.db.updateUser(player);
  broadcastPlayerUpdate(ctx.world, player);
  reply.info(`Gave you ${item.rarity} ${item.name ?? item.key}.`);
};

const name: Cheat = (ctx, player, args, reply) => {
  const userName = args.join(" ").trim();
  if (!userName || userName.length > MAX_NAME_LENGTH) {
    return reply.error(`Usage: /name <name>, up to ${MAX_NAME_LENGTH} characters.`);
  }
  player.profile.userName = userName;
  broadcastPlayerUpdate(ctx.world, player);
  reply.info(`You are now ${userName}.`);
};

/** Cheats that change your own character. */
export const CHARACTER_CHEATS = { heal, hp, give, name };
