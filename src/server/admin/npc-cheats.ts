import { nasties } from "@/content";
import { entitiesInRoom } from "@/rules/world";
import { getFullCharacterState } from "@/network/sync";
import { spawnNpc } from "@/server/game-world";
import { parseInteger, type Cheat } from "./cheat";

const MAX_SPAWNS = 20;
/** How far from the player, in pixels, spawned mobs appear. */
const SPAWN_DISTANCE = 48;

const spawn: Cheat = (ctx, player, [mob, countArg], reply) => {
  if (!mob || !(mob in nasties)) {
    return reply.error(`Usage: /spawn <mob> [count]. Mobs: ${Object.keys(nasties)}`);
  }
  const count = parseInteger(countArg) ?? 1;
  if (count < 1 || count > MAX_SPAWNS) {
    return reply.error(`Spawn between 1 and ${MAX_SPAWNS} at a time.`);
  }
  for (let i = 0; i < count; i++) {
    /* Spread them in a ring so they don't stack on one spot */
    const angle = (i / count) * Math.PI * 2;
    const npc = spawnNpc(ctx.world, player.room, {
      name: mob,
      x: player.x + Math.cos(angle) * SPAWN_DISTANCE,
      y: player.y + Math.sin(angle) * SPAWN_DISTANCE,
      properties: [{ name: "isCheatSpawned", value: true }],
    });
    if (npc) ctx.io.to(player.roomName).emit("npcJoin", getFullCharacterState(npc));
  }
  reply.info(`Spawned ${count} ${mob}.`);
};

const despawn: Cheat = (ctx, player, _args, reply) => {
  const { world, io } = ctx;
  const spawned = entitiesInRoom(world.npcs, player.roomName).filter(
    (n) => n.state?.isCheatSpawned,
  );
  for (const npc of spawned) {
    delete world.npcs[npc.id];
    world.netIds.release(npc.id);
    io.to(player.roomName).emit("npcRemove", npc.id);
  }
  reply.info(`Removed ${spawned.length} spawned mobs.`);
};

/** Cheats that add or remove NPCs. */
export const NPC_CHEATS = { spawn, despawn };
