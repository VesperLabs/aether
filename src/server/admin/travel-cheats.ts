import { entitiesInRoom } from "@/rules/world";
import { teleportPlayer } from "@/server/net/handlers/movement";
import { parseInteger, type Cheat } from "./cheat";

const tp: Cheat = (ctx, player, [x, y], reply) => {
  const to = { x: parseInteger(x), y: parseInteger(y) };
  if (to.x === undefined || to.y === undefined) return reply.error("Usage: /tp <x> <y>");
  teleportPlayer(ctx, player.roomName, { x: to.x, y: to.y });
  reply.info(`Teleported to ${to.x}, ${to.y}.`);
};

const warp: Cheat = (ctx, player, [roomName, x, y], reply) => {
  const room = roomName ? ctx.world.rooms[roomName] : undefined;
  if (!room) {
    return reply.error(`Usage: /warp <room> [x] [y]. Rooms: ${Object.keys(ctx.world.rooms)}`);
  }
  /* Without coordinates, land on the room's first door so the spot is walkable */
  const door = room.map.objects.Doors?.[0];
  const to = {
    x: parseInteger(x) ?? door?.x ?? player.x,
    y: parseInteger(y) ?? door?.y ?? player.y,
  };
  teleportPlayer(ctx, room.name, to);
  reply.info(`Warped to ${room.name} at ${Math.round(to.x)}, ${Math.round(to.y)}.`);
};

const goto: Cheat = (ctx, player, args, reply) => {
  const name = args.join(" ").toLowerCase();
  if (!name) return reply.error("Usage: /goto <player>");
  const target = Object.values(ctx.world.players).find(
    (p) => p.id !== player.id && p.profile?.userName?.toLowerCase() === name && p.room,
  );
  if (!target?.room) return reply.error(`No player called "${args.join(" ")}" is online.`);
  teleportPlayer(ctx, target.room.name, { x: target.x, y: target.y });
  reply.info(`Went to ${target.profile.userName}.`);
};

const where: Cheat = (ctx, player, _args, reply) => {
  const { players, npcs } = ctx.world;
  const at = (c: { x: number; y: number }) => `${Math.round(c.x)},${Math.round(c.y)}`;
  const people = entitiesInRoom(players, player.roomName).map(
    (p) => `${p.profile?.userName} (${at(p)})`,
  );
  const mobs = entitiesInRoom(npcs, player.roomName)
    .filter((n) => !n.talks && !n.state?.isDead)
    .map((n) => `${n.name} (${at(n)})`);
  reply.info(
    `${player.roomName}. Players: ${people.join(", ")}. Mobs: ${mobs.join(", ") || "none"}.`,
  );
};

/** Cheats that move you around the world. */
export const TRAVEL_CHEATS = { tp, warp, goto, where };
