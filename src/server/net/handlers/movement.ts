import { broadcastPlayerJoin } from "@/server/net/room-broadcast";
import type { ServerWorld } from "../../server-world";
import type { Player } from "../../player";
import { PLAYER_DEFAULT_SPAWN } from "../../auth/character-defaults";
import { decodeWireDirection } from "@/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import type { ParsedCommand } from "@/network";
import { bringCompanions } from "../../companions";
import { addPlayerToRoom, removePlayerFromRoom } from "../../player-room";
import { legacyUpdateMemberRoom } from "../../party-adapter";
import type { CommandContext } from "@/server/net/command-context";
import { findNearbyNpc } from "@/server/net/nearby-keeper";
import {
  DODGE_DISTANCE,
  DODGE_SP_COST,
  KNOCKBACK_DISTANCE,
  LUNGE_DISTANCE,
  canDodge,
  checkMove,
  clampRewind,
  grantMoveBudget,
  isWithinDoorRange,
  startMoveTrack,
  type MoveTrack,
} from "@/rules/movement";
import { isInRoom } from "@/server/player-room";
import { faceCastAim } from "@/server/player-cast";
import { isCastRooted } from "@/rules/combat";
import type { GameEventBus } from "@/rules/world";

/** The last accepted position of each player. Server moves (doors, respawn) restart it. */
const moveTracks = new WeakMap<Player, MoveTrack>();

const getDoor = (world: ServerWorld, roomName: string, doorName: string) =>
  world?.doors?.[roomName]?.[doorName];

export function playerInput(ctx: CommandContext, input: ParsedCommand<"playerInput">) {
  const { world, socketId } = ctx;
  if (!world.players) return;
  const { x, y, vx, vy, d, direction, roomName } = input;
  const player = world.players[socketId];
  if (!isInRoom(player)) return;
  if (player.state.isDead) return;
  if (player?.hasBuff("stun")) {
    player.vx = 0;
    player.vy = 0;
    return;
  }
  const effectiveRoom = roomName ?? player.roomName;
  if (player.roomName !== effectiveRoom) return; // player is changing room
  /* Rooted mid-cast: a step sent now is put back where the server holds the caster */
  if (isCastRooted(player.pendingCast) && (x !== player.x || y !== player.y)) {
    player.vx = 0;
    player.vy = 0;
    ctx.actor.emit("positionCorrection", { x: player.x, y: player.y });
    return;
  }
  const room = player.room;
  if (room) {
    const now = world.now();
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
      ctx.actor.emit("positionCorrection", { x: player.x, y: player.y });
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
  faceCastAim(player);
}

/** Remembers how far behind this player sees others, so their hits can be judged by it. */
export function reportLag(ctx: CommandContext, { ms }: ParsedCommand<"reportLag">) {
  const player = ctx.world.players[ctx.socketId];
  if (player) player.viewLagMs = clampRewind(ms);
}

export function changeDirection(
  ctx: CommandContext,
  { direction, lastAngle }: ParsedCommand<"changeDirection">,
) {
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  if (direction) player.direction = direction;
  if (typeof lastAngle === "number") player.state.lastAngle = lastAngle;
  faceCastAim(player);
}

/** Tells a shoved player's client to play it, and lets them move its length on top of walking. */
export function subscribeKnockbackMessages(bus: GameEventBus, world: ServerWorld) {
  return bus.on("playerKnockedBack", ({ socketId, angle }) => {
    const player = world.players[socketId];
    if (!player) return;
    const track = moveTracks.get(player);
    if (track) moveTracks.set(player, grantMoveBudget(track, KNOCKBACK_DISTANCE));
    world.io.to(socketId).emit("knockedBack", { angle });
  });
}

/** Teleports (doors, respawns) wipe a character's recent positions, so no hit rewinds across them. */
function forgetPoses(world: ServerWorld, id: string) {
  for (const room of Object.values(world.rooms)) room.poseHistory.forget(id);
}

/** Respawned npcs jump home: forget where they stood before. */
export function subscribePoseForgetting(bus: GameEventBus, world: ServerWorld) {
  return bus.on("npcRespawned", ({ npcId }) => forgetPoses(world, npcId));
}

/** Lets a player who just started a lunge move its length on top of their walking budget. */
export function grantLungeMove(player: Player) {
  const track = moveTracks.get(player);
  if (track) moveTracks.set(player, grantMoveBudget(track, LUNGE_DISTANCE));
}

export function dodge(ctx: CommandContext, { angle }: ParsedCommand<"dodge">) {
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  if (!isInRoom(player) || !Number.isFinite(angle)) return;
  const now = world.now();
  const sp = player.stats?.sp ?? 0;
  if (!canDodge({ state: player.state, sp, isStunned: player.hasBuff("stun"), now })) return;
  player.modifyStat("sp", -DODGE_SP_COST);
  world.io.to(player.roomName).emit("modifyPlayerStat", {
    socketId,
    type: "sp",
    amount: -DODGE_SP_COST,
  });
  player.state.lastDodge = now;
  player.state.lastAngle = angle;
  const track = moveTracks.get(player);
  if (track) moveTracks.set(player, grantMoveBudget(track, DODGE_DISTANCE));
  ctx.actor.toOthers(player.roomName).emit("playerDodge", { socketId, angle });
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
  const { world, socketId } = ctx;
  const player = world.players[socketId];
  if (!player?.room || player.state.isDead) return;
  const oldRoom = player.room.name;
  const prev = getDoor(world, oldRoom, doorName);
  if (!prev?.destMap || !prev.destDoor) return;
  if (!isWithinDoorRange(player, prev)) return;
  const destMap = prev.destMap;
  const next = getDoor(world, destMap, prev.destDoor);
  if (!next || !world.rooms[destMap]) return;
  teleportPlayer(ctx, destMap, next.centerPos);
}

/** Moves a player to a spot in any room, as a door does, and tells both rooms. */
export function teleportPlayer(
  ctx: CommandContext,
  destMap: string,
  { x, y }: { x: number; y: number },
) {
  const { world, actor, socketId } = ctx;
  const player = world.players[socketId];
  if (!player?.room || !world.rooms[destMap]) return;
  const oldRoom = player.room.name;

  if (oldRoom !== destMap) {
    actor.leave(oldRoom);
    actor.join(destMap);
    actor.toOthers(oldRoom).emit("remove", socketId);
    removePlayerFromRoom(world, socketId);
    addPlayerToRoom(world, socketId, world.rooms[destMap]);
  }

  player.x = x;
  player.y = y;
  forgetPoses(world, socketId);
  bringCompanions(world, player);

  /* Save the new room */
  world.db.updateUserMapDetails(player);

  broadcastPlayerJoin(world, destMap, player, {
    lastTeleport: world.now(),
  });

  actor.emit("heroInit", {
    ...getRoomState(world, destMap),
    socketId,
  });

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(world, player);
}

export function respawn(ctx: CommandContext) {
  const { world, actor, socketId } = ctx;
  const player = world.players[socketId];
  if (!player?.room || !player.state.isDead) return;
  const oldRoom = player.room.name;
  const { roomName: newRoom, x: newX, y: newY } = player?.spawn ?? PLAYER_DEFAULT_SPAWN;
  player.state.isDead = false;
  player.fillHpMp();

  if (oldRoom !== newRoom) {
    actor.leave(oldRoom);
    actor.join(newRoom);
    actor.toOthers(oldRoom).emit("remove", socketId);
  }

  removePlayerFromRoom(world, socketId);
  addPlayerToRoom(world, socketId, world.rooms[newRoom]);

  player.x = newX;
  player.y = newY;
  forgetPoses(world, socketId);
  bringCompanions(world, player);

  /* Save the new room */
  world.db.updateUserMapDetails(player);

  broadcastPlayerJoin(world, newRoom, player, {
    isRespawn: true,
    lastTeleport: world.now(),
  });

  actor.emit(
    "heroInit",
    {
      ...getRoomState(world, newRoom),
      socketId,
    },
    { isRespawn: true },
  );

  // announce room has changed to the party
  // TODO: need a better way of sending a persistant party state instead of this
  legacyUpdateMemberRoom(world, player);

  world.db.updateUser(world.players?.[socketId]);
}

export function setSpawn(ctx: CommandContext, _spawn: ParsedCommand<"setSpawn">) {
  const { world, actor, socketId } = ctx;
  const player: Player = world.players[socketId];
  /* The client's coordinates are ignored: the spawn is the home of the keeper being talked to. */
  const keeper = findNearbyNpc(world, socketId, player?.state?.targetNpcId);
  const home = keeper?.services?.home;
  if (!keeper || typeof home?.x !== "number" || typeof home?.y !== "number") return;
  const spawn = { x: home.x, y: home.y, roomName: player.roomName } as SpawnPoint;
  player.spawn = spawn;
  world.db.updateUserMapDetails({
    email: player.email,
    isDemoAccount: player.isDemoAccount,
    spawn,
  });
  return actor.emit("message", {
    type: "system",
    message: "You have changed your spawn point.",
  });
}
