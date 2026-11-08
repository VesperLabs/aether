import {
  BOT_PERSONALITY_IDS,
  CHAR_CLASSES,
  isBotPersonalityId,
  type BotPersonalityId,
  type CharClass,
} from "@/content";
import { despawnBot, spawnBot, type Bot } from "@/server/bots";
import type { ServerWorld } from "@/server/server-world";
import { parseInteger, subcommands, type Cheat } from "./cheat";

const MAX_SPAWNS = 20;
/** How far from the player, in pixels, spawned bots appear. */
const SPAWN_DISTANCE = 48;

const isCharClass = (word: string): word is CharClass =>
  (CHAR_CLASSES as readonly string[]).includes(word);

const SPAWN_USAGE = `Usage: /bot spawn [${BOT_PERSONALITY_IDS.join("|")}] [${CHAR_CLASSES.join("|")}] [count]`;

/** The bots a `/bot` subcommand points at: one by name, or every one with `all` or no name. */
function findBots(world: ServerWorld, name: string | undefined): Bot[] {
  const bots = Object.values(world.bots);
  if (!name || name === "all") return bots;
  const wanted = name.toLowerCase();
  return bots.filter((bot) => world.players[bot.id]?.profile?.userName?.toLowerCase() === wanted);
}

const nameOf = (world: ServerWorld, bot: Bot) => world.players[bot.id]?.profile?.userName ?? bot.id;

/** `/bot spawn [personality] [class] [count]`, in any order. */
const spawn: Cheat = (ctx, player, args, reply) => {
  let personality: BotPersonalityId = BOT_PERSONALITY_IDS[0] as BotPersonalityId;
  let charClass: CharClass | undefined;
  let count = 1;
  for (const arg of args) {
    const word = arg.toLowerCase();
    if (isBotPersonalityId(word)) personality = word;
    else if (isCharClass(word)) charClass = word;
    else if (parseInteger(word) !== undefined) count = parseInteger(word) as number;
    else return reply.error(SPAWN_USAGE);
  }
  if (count < 1 || count > MAX_SPAWNS) {
    return reply.error(`Spawn between 1 and ${MAX_SPAWNS} at a time.`);
  }
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const bot = spawnBot(ctx.world, {
      roomName: player.roomName,
      x: player.x + Math.cos(angle) * SPAWN_DISTANCE,
      y: player.y + Math.sin(angle) * SPAWN_DISTANCE,
      personality,
      charClass,
    });
    if (bot) names.push(bot.profile?.userName ?? bot.id);
  }
  reply.info(`Spawned ${personality}: ${names.join(", ")}.`);
};

const list: Cheat = (ctx, _player, _args, reply) => {
  const { world } = ctx;
  const bots = Object.values(world.bots);
  if (bots.length === 0) return reply.info("No bots.");
  const lines = bots.map((bot) => {
    const character = world.players[bot.id];
    const { strategy, plan } = bot.memory;
    const doing = bot.isPaused
      ? "paused"
      : `${strategy ?? "nothing"} → ${plan?.steps[plan.step]?.task ?? "-"}`;
    return `${nameOf(world, bot)} (${bot.personality}, ${character?.charClass}) in ${character?.roomName ?? "transit"}: ${doing}`;
  });
  reply.info(lines.join("\n"));
};

const despawn: Cheat = (ctx, _player, [name], reply) => {
  const bots = findBots(ctx.world, name);
  if (bots.length === 0) return reply.error(`No bot named ${name}.`);
  for (const bot of bots) despawnBot(ctx.world, bot.id);
  reply.info(`Removed ${bots.length} bot${bots.length === 1 ? "" : "s"}.`);
};

const setPaused =
  (isPaused: boolean): Cheat =>
  (ctx, _player, [name], reply) => {
    const bots = findBots(ctx.world, name);
    if (bots.length === 0) return reply.error(`No bot named ${name}.`);
    for (const bot of bots) {
      bot.isPaused = isPaused;
      const character = ctx.world.players[bot.id];
      if (character && isPaused) {
        character.vx = 0;
        character.vy = 0;
      }
    }
    reply.info(
      `${isPaused ? "Paused" : "Resumed"} ${bots.map((b) => nameOf(ctx.world, b)).join(", ")}.`,
    );
  };

/** `/bot <spawn|list|despawn|pause|resume> ...`: spawn and manage server-run players. */
export const BOT_CHEATS: Record<string, Cheat> = {
  bot: subcommands("bot", {
    spawn,
    list,
    despawn,
    pause: setPaused(true),
    resume: setPaused(false),
  }),
};
