import { getFullCharacterState } from "@/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import { removePlayer } from "@/server/world/remove-player";
import { createPlayer } from "@/server/world/player-room";
import { legacyLeaveParty } from "@/server/party/party-adapter";
import type { CommandContext } from "@/server/net/command-context";
import type { UserDocument } from "@/server/persistence/database";

interface EnterWorldOptions {
  /** Demo characters are never saved and never kick anyone (they share no email). */
  isDemo?: boolean;
}

/** Puts a logged-in user into the world on this connection and tells the client and the room. */
export function enterWorld(
  ctx: CommandContext,
  user: Omit<UserDocument, "email"> & { email?: string },
  { isDemo = false }: EnterWorldOptions = {},
) {
  const { world, socket, socketId, io, session } = ctx;

  /* Only let one connection at a time */
  if (Object.keys(world?.players).find((k) => k === socket?.id)) {
    return world.log.warn("❌ Socket already logged in");
  }

  /* Kick the old user if logging in on the same email */
  if (!isDemo) {
    for (const [sId, existing] of Object.entries(world?.players)) {
      if (existing?.email === user?.email) {
        world.log.info(`🔌 ${existing?.profile?.userName} disconnected`);
        legacyLeaveParty(world, sId);
        removePlayer(world, sId);

        io?.sockets?.sockets?.get?.(sId)?.disconnect?.(true);
        io.emit("remove", sId);
      }
    }
  }

  /* Bots are flagged on their profile only; the server never branches gameplay on it. */
  const profile = user.isBot ? { ...user.profile, isBot: true } : user.profile;
  const player = createPlayer(world, user.roomName, {
    socketId,
    peerId: session.peerId,
    ...(isDemo ? { isDemoAccount: true } : {}),
    ...user,
    profile,
  });

  const roomName = player?.room?.name;

  roomName
    ? world.log.info(`🔌 ${player?.profile?.userName} connected`)
    : world.log.warn("❌ Missing player roomName");

  if (!roomName) return;

  socket.join(roomName);
  socket.emit(
    "heroInit",
    {
      ...getRoomState(world, roomName),
      userSettings: player.userSettings,
      cheats: world.config.cheats,
      socketId,
    },
    { isLogin: true },
  );
  socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
}
