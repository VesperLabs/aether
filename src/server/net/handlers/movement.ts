import {
  handlePlayerInput,
  getFullCharacterState,
  getRoomState,
  getDoor,
  PLAYER_DEFAULT_SPAWN,
} from "../../utils";
import type { ParsedCommand } from "@/shared/network";
import { legacyUpdateMemberRoom } from "../../party-adapter";
import type { CommandContext } from "@/server/net/command-context";

export function playerInput(ctx: CommandContext, input: ParsedCommand<"playerInput">) {
  const { scene, socketId } = ctx;
  handlePlayerInput(scene, socketId, input); //defined in utilites.js
}

export function changeDirection(
  ctx: CommandContext,
  { direction, lastAngle }: ParsedCommand<"changeDirection">,
) {
  const { scene, socketId } = ctx;
  const player = scene.players[socketId];
  player.direction = direction;
  if (typeof lastAngle !== "undefined") player.state.lastAngle = lastAngle;
}

export function updateState(ctx: CommandContext, state: ParsedCommand<"updateState">) {
  const { scene, socketId } = ctx;
  const player = scene?.players?.[socketId];
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
  const { scene, socket, socketId, io } = ctx;
  const player = scene.players[socketId];
  const oldRoom = player.room.name;
  const prev = getDoor(scene, oldRoom, doorName)?.getProps();
  const next = getDoor(scene, prev.destMap, prev.destDoor)?.getProps();

  if (oldRoom !== prev.destMap) {
    socket.leave(oldRoom);
    socket.join(prev.destMap);
    socket.to(oldRoom).emit("remove", socketId);
    scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
    scene.roomManager.rooms[prev.destMap].playerManager.add(socketId);
  }

  player.x = next.centerPos.x;
  player.y = next.centerPos.y;

  /* Save the new room */
  scene.db.updateUserMapDetails(player);

  socket.to(prev.destMap).emit("playerJoin", getFullCharacterState(player), {
    lastTeleport: Date.now(),
  });

  socket.emit("heroInit", {
    ...getRoomState(scene, prev.destMap),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(scene, player);
}

export function respawn(ctx: CommandContext) {
  const { scene, socket, socketId, io } = ctx;
  const player = scene.players[socketId];
  const oldRoom = player.room.name;
  const { roomName: newRoom, x: newX, y: newY } = player?.spawn ?? PLAYER_DEFAULT_SPAWN;
  player.state.isDead = false;
  player.fillHpMp();

  if (oldRoom !== newRoom) {
    socket.leave(oldRoom);
    socket.join(newRoom);
    socket.to(oldRoom).emit("remove", socketId);
  }

  scene.roomManager.rooms[oldRoom].playerManager.remove(socketId);
  scene.roomManager.rooms[newRoom].playerManager.add(socketId);

  player.x = newX;
  player.y = newY;

  /* Save the new room */
  scene.db.updateUserMapDetails(player);

  socket.to(newRoom).emit("playerJoin", getFullCharacterState(player), {
    isRespawn: true,
    lastTeleport: Date.now(),
  });

  socket.emit("heroInit", {
    ...getRoomState(scene, newRoom),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(scene, player);

  scene.db.updateUser(scene.players?.[socketId]);
}

export function setSpawn(ctx: CommandContext, spawn: ParsedCommand<"setSpawn">) {
  const { scene, socket, socketId } = ctx;
  const player: ServerPlayer = scene.players[socketId];
  player.spawn = spawn as SpawnPoint;
  scene.db.updateUserMapDetails({ email: player.email, spawn });
  return socket.emit("message", {
    type: "info",
    message: "You have changed your spawn point.",
  } as Message);
}
