import type { ServerWorld } from "../../server-world";
import type { Player } from "../../player";
import { PLAYER_DEFAULT_SPAWN } from "../../auth/character-defaults";
import { decodeWireDirection, getFullCharacterState } from "@/shared/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import type { ParsedCommand } from "@/shared/network";
import { addPlayerToRoom, removePlayerFromRoom } from "../../player-room";
import { legacyUpdateMemberRoom } from "../../party-adapter";
import type { CommandContext } from "@/server/net/command-context";
import { findNearbyNpc } from "@/server/net/nearby-keeper";
import {
  checkMove,
  isWithinDoorRange,
  startMoveTrack,
  type MoveTrack,
} from "@/shared/rules/movement";

/** The last accepted position of each player. Server moves (doors, respawn) restart it. */
const moveTracks = new WeakMap<Player, MoveTrack>();

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
  const room = player.room;
  if (room) {
    const now = Date.now();
    const walkSpeed = player.stats?.walkSpeed ?? 100;
    let track = moveTracks.get(player);
    /* The server moved the player itself (door, respawn, spawn): trust that spot and start over. */
    if (
      !track ||
      track.roomName !== player.roomName ||
      track.x !== player.x ||
      track.y !== player.y
    ) {
      track = startMoveTrack(player.roomName, player.x, player.y, now, walkSpeed);
    }
    const result = checkMove(track, { x, y }, now, {
      grid: room.map.grid,
      bounds: { width: room.map.widthInPixels, height: room.map.heightInPixels },
      walkSpeed,
      bodySize: player.bodySize,
    });
    moveTracks.set(player, result.track);
    if (!result.ok) {
      player.vx = 0;
      player.vy = 0;
      ctx.socket.emit("positionCorrection", { x: player.x, y: player.y });
      return;
    }
  }
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
  if (direction) player.direction = direction;
  if (typeof lastAngle !== "undefined") player.state.lastAngle = lastAngle;
}

export function updateState(ctx: CommandContext, state: ParsedCommand<"updateState">) {
  const { world, socketId } = ctx;
  const player = world?.players?.[socketId];
  if (!player) return;
  /* Only the two flags the client owns. The schema already drops anything else. */
  if (typeof state.isAiming === "boolean") player.state.isAiming = state.isAiming;
  if (typeof state.isHoldingAttack === "boolean") {
    player.state.isHoldingAttack = state.isHoldingAttack;
  }
}

export function enterDoor(ctx: CommandContext, doorName: ParsedCommand<"enterDoor">) {
  const { world, socket, socketId } = ctx;
  const player = world.players[socketId];
  if (!player?.room || player.state.isDead) return;
  const oldRoom = player.room.name;
  const prev = getDoor(world, oldRoom, doorName);
  if (!prev?.destMap || !prev.destDoor) return;
  if (!isWithinDoorRange(player, prev)) return;
  const destMap = prev.destMap;
  const next = getDoor(world, destMap, prev.destDoor);
  if (!next || !world.rooms[destMap]) return;

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
  if (!player?.room || !player.state.isDead) return;
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

export function setSpawn(ctx: CommandContext, _spawn: ParsedCommand<"setSpawn">) {
  const { world, socket, socketId } = ctx;
  const player: Player = world.players[socketId];
  /* The client's coordinates are ignored: the spawn is the home of the keeper being talked to. */
  const keeper = findNearbyNpc(world, socketId, player?.state?.targetNpcId);
  const home = keeper?.keeperData?.home;
  if (!keeper || typeof home?.x !== "number" || typeof home?.y !== "number") return;
  const spawn = { x: home.x, y: home.y, roomName: player.roomName } as SpawnPoint;
  player.spawn = spawn;
  world.db.updateUserMapDetails({ email: player.email, spawn });
  return socket.emit("message", {
    type: "info",
    message: "You have changed your spawn point.",
  } as Message);
}
