import { getFullCharacterState } from "@/shared/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import { removePlayer } from "../remove-player";
import { legacyLeaveParty } from "../party-adapter";
import { createBaseUser } from "../persistence";
import { shouldPause } from "../net/scene-pause";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export async function demoLogin(
  ctx: CommandContext,
  { charClass }: ParsedCommand<"demoLogin"> = {},
) {
  const { scene, socket, socketId, session } = ctx;
  if (!charClass) return socket.emit("formError", { error: "No class" });

  /* Only let one connection at a time */
  if (Object.keys(scene?.players).find((k) => k === socket?.id)) {
    return console.log("❌ Socket already logged in");
  }

  const user = createBaseUser(charClass);

  const player = scene.roomManager.rooms[user.roomName].playerManager.create({
    socketId,
    peerId: session.peerId,
    isDemoAccount: true,
    ...user,
  });

  /* Should we pause or resume? */
  shouldPause(scene);

  const roomName = player?.room?.name;

  roomName
    ? console.log(`🔌 ${player?.profile?.userName} connected`)
    : console.log("❌ Missing player roomName");

  if (!roomName) return;

  socket.join(roomName);
  socket.emit(
    "heroInit",
    {
      ...getRoomState(scene, roomName),
      userSettings: player.userSettings,
      socketId,
    },
    { isLogin: true },
  );

  socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
}

export async function login(ctx: CommandContext, { email, password }: ParsedCommand<"login"> = {}) {
  const { scene, socket, socketId, io, session } = ctx;
  let user = await scene.db.getUserByLogin({ email, password });
  if (!user) return socket.emit("formError", { error: "Invalid login" });

  /* Only let one connection at a time */
  if (Object.keys(scene?.players).find((k) => k === socket?.id)) {
    return console.log("❌ Socket already logged in");
  }

  /* Kick the old user if loggin in on same email */
  for (const [sId, player] of Object.entries(scene?.players)) {
    if (player?.email === user?.email) {
      const player = scene.players?.[sId];
      console.log(`🔌 ${player?.profile?.userName} disconnected`);
      legacyLeaveParty(scene, socket);
      removePlayer(scene, sId);

      io?.sockets?.sockets?.get?.(sId)?.disconnect?.(true);
      io.emit("remove", sId);
    }
  }

  const player = scene.roomManager.rooms[user.roomName].playerManager.create({
    socketId,
    peerId: session.peerId,
    ...user,
  });

  /* Should we pause or resume? */
  shouldPause(scene);

  const roomName = player?.room?.name;

  roomName
    ? console.log(`🔌 ${player?.profile?.userName} connected`)
    : console.log("❌ Missing player roomName");

  if (!roomName) return;

  socket.join(roomName);
  socket.emit(
    "heroInit",
    {
      ...getRoomState(scene, roomName),
      userSettings: player.userSettings,
      socketId,
    },
    { isLogin: true },
  );
  socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
}

export async function register(
  ctx: CommandContext,
  { email, password, charClass }: ParsedCommand<"register"> = {},
) {
  const { scene, socket } = ctx;
  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return socket.emit("formError", { error: "Invalid email format" });
  }

  // Check if email is already in use
  const user = await scene.db.getUserByEmail({ email });
  if (user) {
    return socket.emit("formError", { error: "Email already in use" });
  }

  //Validate password strength
  if (password?.length < 4) {
    return socket.emit("formError", {
      error: "Weak password",
    });
  }

  // Create user if email and password are valid
  const isCreated = await scene.db.createUser({ email, password, charClass });
  if (!isCreated) {
    return socket.emit("formError", { error: "Error creating user" });
  }

  // Send success message
  socket.emit("formSuccess", { success: "Account created", email });
}
