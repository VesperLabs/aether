import type { ParsedCommand } from "@/network";
import { getPublicRoomState } from "@/network/sync";
import type { CommandContext } from "@/server/net/command-context";
import { observersOf } from "@/server/net/room-broadcast";
import { shouldPause } from "../world-pause";

/** Well under the client's tour stop. Each visit sends a whole room, to anyone, unauthenticated. */
const MIN_OBSERVE_GAP_MS = 5000;

function leaveObservedRoom({ socket, session }: CommandContext) {
  if (!session.observedRoom) return;
  socket.leave(session.observedRoom);
  socket.leave(observersOf(session.observedRoom));
}

/** Puts a connection with no character in a room, so it sees the world but is nobody in it. */
export function observe(ctx: CommandContext, { roomName }: ParsedCommand<"observe">) {
  const { world, socket, socketId, session } = ctx;
  if (world.players[socketId] || !world.rooms[roomName]) return;
  const now = world.now();
  if (session.lastObservedAt !== undefined && now - session.lastObservedAt < MIN_OBSERVE_GAP_MS) {
    return;
  }
  session.lastObservedAt = now;
  leaveObservedRoom(ctx);
  session.observedRoom = roomName;
  world.observers.add(socketId);
  socket.join([roomName, observersOf(roomName)]);
  shouldPause(world);
  socket.emit("roomObserved", { ...getPublicRoomState(world, roomName), roomName });
}

/** Ends watching, on login or disconnect. The caller decides whether the world should pause. */
export function stopObserving(ctx: CommandContext) {
  leaveObservedRoom(ctx);
  ctx.session.observedRoom = undefined;
  ctx.world.observers.delete(ctx.socketId);
}
