import { nasties } from "@/content";
import { entitiesInRoom } from "@/rules/world";
import { getFullCharacterState } from "@/network/sync";
import { spawnNpc } from "@/server/game-world";
import { parseInteger, type Cheat } from "./cheat";

const MAX_SUMMONS = 20;
/** How far from the summoner, in pixels, summoned mobs appear. */
const SUMMON_DISTANCE = 48;

const summon: Cheat = (ctx, player, [mob, countArg], reply) => {
  if (!mob || !(mob in nasties)) {
    return reply.error(`Usage: /summon <mob> [count]. Mobs: ${Object.keys(nasties)}`);
  }
  const count = parseInteger(countArg) ?? 1;
  if (count < 1 || count > MAX_SUMMONS) {
    return reply.error(`Summon between 1 and ${MAX_SUMMONS} at a time.`);
  }
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const npc = spawnNpc(ctx.world, player.room, {
      name: mob,
      x: player.x + Math.cos(angle) * SUMMON_DISTANCE,
      y: player.y + Math.sin(angle) * SUMMON_DISTANCE,
      properties: [{ name: "isSummoned", value: true }],
    });
    if (npc) ctx.io.to(player.roomName).emit("npcJoin", getFullCharacterState(npc));
  }
  reply.info(`Summoned ${count} ${mob}.`);
};

const despawn: Cheat = (ctx, player, _args, reply) => {
  const { world, io } = ctx;
  const summoned = entitiesInRoom(world.npcs, player.roomName).filter((n) => n.state?.isSummoned);
  for (const npc of summoned) {
    delete world.npcs[npc.id];
    world.netIds.release(npc.id);
    io.to(player.roomName).emit("npcRemove", npc.id);
  }
  reply.info(`Removed ${summoned.length} summoned mobs.`);
};

/** Cheats that add or remove NPCs. */
export const NPC_CHEATS = { summon, despawn };
