import type { ServerWorld } from "../../server-world";
import type { Player } from "../../player";
import { PLAYER_DEFAULT_SPAWN } from "../../auth/character-defaults";
import { decodeWireDirection, getFullCharacterState } from "@/shared/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import type { ParsedCommand } from "@/shared/network";
import { addPlayerToRoom, removePlayerFromRoom } from "../../player-room";
import { legacyUpdateMemberRoom } from "../../party-adapter";
import type { CommandContext } from "@/server/net/command-context";

const getDoor = (world: ServerWorld, roomName: string, doorName: string) =>
  world?.doors?.[roomName]?.[doorName];

export function playerInput(ctx: CommandContext, input: ParsedCommand<"playerInput">) {
  const { world, socketId } = ctx;
  if (!world.players) return;
  const { x, y, vx, vy, d, direction, roomName } = input;
  const player = world.players[socketId];
  if (!player) return;
  if (player.state.isDead) return;
  if (player?.hasBuff("stun")) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
  const effectiveRoom = roomName ?? player.roomName;
  if (player.roomName !== effectiveRoom) return; // player is changing room
  player.x = x;
  player.y = y;
  player.vx = vx;
  player.vy = vy;
  player.direction =
    typeof d === "number"
      ? decodeWireDirection(d, player.direction)
      : (direction ?? player.direction);
}

export function changeDirection(
  ctx: CommandContext,
  { direction, lastAngle }: ParsedCommand<"changeDirection">,
) {
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  player.direction = direction as string;
  if (typeof lastAngle !== "undefined") player.state.lastAngle = lastAngle;
}

export function updateState(ctx: CommandContext, state: ParsedCommand<"updateState">) {
  const { world, socketId } = ctx;
  const player = world?.players?.[socketId];
  if (!player) return;
  // Loop through each key in the state object
  for (const key in state) {
    if (state.hasOwnProperty(key)) {
      // Update the corresponding key in player's state
      player.state[key] = state[key];
    }
  }
}

export function enterDoor(ctx: CommandContext, doorName: ParsedCommand<"enterDoor">) {
  const { world, socket, socketId } = ctx;
  const player = world.players[socketId];
  const oldRoom = player.room.name;
  const prev = getDoor(world, oldRoom, doorName);
  /* Doors in the maps always have a destination. */
  const destMap = prev.destMap as string;
  const next = getDoor(world, destMap, prev.destDoor as string);

  if (oldRoom !== destMap) {
    socket.leave(oldRoom);
    socket.join(destMap);
    socket.to(oldRoom).emit("remove", socketId);
    removePlayerFromRoom(world, socketId);
    addPlayerToRoom(world, socketId, world.rooms[destMap]);
  }

  player.x = next.centerPos.x;
  player.y = next.centerPos.y;

  /* Save the new room */
  world.db.updateUserMapDetails(player);

  socket.to(destMap).emit("playerJoin", getFullCharacterState(player), {
    lastTeleport: Date.now(),
  });

  socket.emit("heroInit", {
    ...getRoomState(world, destMap),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(world, player);
}

export function respawn(ctx: CommandContext) {
  const { world, socket, socketId } = ctx;
  const player = world.players[socketId];
  const oldRoom = player.room.name;
  const { roomName: newRoom, x: newX, y: newY } = player?.spawn ?? PLAYER_DEFAULT_SPAWN;
  player.state.isDead = false;
  player.fillHpMp();

  if (oldRoom !== newRoom) {
    socket.leave(oldRoom);
    socket.join(newRoom);
    socket.to(oldRoom).emit("remove", socketId);
  }

  removePlayerFromRoom(world, socketId);
  addPlayerToRoom(world, socketId, world.rooms[newRoom]);

  player.x = newX;
  player.y = newY;

  /* Save the new room */
  world.db.updateUserMapDetails(player);

  socket.to(newRoom).emit("playerJoin", getFullCharacterState(player), {
    isRespawn: true,
    lastTeleport: Date.now(),
  });

  socket.emit("heroInit", {
    ...getRoomState(world, newRoom),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(world, player);

  world.db.updateUser(world.players?.[socketId]);
}

export function setSpawn(ctx: CommandContext, spawn: ParsedCommand<"setSpawn">) {
  const { world, socket, socketId } = ctx;
  const player: Player = world.players[socketId];
  player.spawn = spawn as SpawnPoint;
  world.db.updateUserMapDetails({ email: player.email, spawn: spawn as SpawnPoint });
  return socket.emit("message", {
    type: "info",
    message: "You have changed your spawn point.",
  } as Message);
}
