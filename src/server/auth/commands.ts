import { getFullCharacterState } from "@/network/sync";
import { getRoomState } from "@/server/net/room-sync";
import { areCheatsEnabled } from "@/server/admin/commands";
import { removePlayer } from "../remove-player";
import { createPlayer } from "../player-room";
import { legacyLeaveParty } from "../party-adapter";
import { createBaseUser } from "../persistence";
import { shouldPause } from "../net/world-pause";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import type { UserDocument } from "../persistence";
import { createLoginToken, isLoginTokenValid, readLoginTokenEmail } from "./login-token";

/** Demo logins (throwaway, unsaved characters) are for development only, never production. */
function isDemoAllowed() {
  return process.env.NODE_ENV !== "production";
}

export async function demoLogin(
  ctx: CommandContext,
  { charClass }: ParsedCommand<"demoLogin"> = {},
) {
  const { world, socket, socketId, session } = ctx;
  if (!isDemoAllowed()) return socket.emit("formError", { error: "Demo mode is off" });
  if (!charClass) return socket.emit("formError", { error: "No class" });

  /* Only let one connection at a time */
  if (Object.keys(world?.players).find((k) => k === socket?.id)) {
    return console.log("❌ Socket already logged in");
  }

  const user = createBaseUser(charClass);

  const player = createPlayer(world, user.roomName, {
    socketId,
    peerId: session.peerId,
    isDemoAccount: true,
    ...user,
  });

  /* Should we pause or resume? */
  shouldPause(world);

  const roomName = player?.room?.name;

  roomName
    ? console.log(`🔌 ${player?.profile?.userName} connected`)
    : console.log("❌ Missing player roomName");

  if (!roomName) return;

  socket.join(roomName);
  socket.emit(
    "heroInit",
    {
      ...getRoomState(world, roomName),
      userSettings: player.userSettings,
      cheats: areCheatsEnabled(),
      socketId,
    },
    { isLogin: true },
  );

  socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
}

export async function login(
  ctx: CommandContext,
  { email, password, remember }: ParsedCommand<"login"> = {},
) {
  const { world, socket } = ctx;
  const user = await world.db.getUserByLogin({ email, password });
  if (!user) return socket.emit("formError", { error: "Invalid login" });
  if (remember) {
    socket.emit("loginToken", {
      token: createLoginToken(user.email, user.password ?? "", world.now()),
    });
  }
  enterWorld(ctx, user);
}

export async function tokenLogin(ctx: CommandContext, { token }: ParsedCommand<"tokenLogin">) {
  const { world, socket } = ctx;
  const user = await world.db.getUserByEmail({ email: readLoginTokenEmail(token) });
  if (!user || !isLoginTokenValid(token, user.password ?? "", world.now())) {
    socket.emit("loginTokenRejected");
    return socket.emit("formError", { error: "Login expired, enter your password" });
  }
  enterWorld(ctx, user);
}

function enterWorld(ctx: CommandContext, user: UserDocument) {
  const { world, socket, socketId, io, session } = ctx;

  /* Only let one connection at a time */
  if (Object.keys(world?.players).find((k) => k === socket?.id)) {
    return console.log("❌ Socket already logged in");
  }

  /* Kick the old user if loggin in on same email */
  for (const [sId, player] of Object.entries(world?.players)) {
    if (player?.email === user?.email) {
      const player = world.players?.[sId];
      console.log(`🔌 ${player?.profile?.userName} disconnected`);
      legacyLeaveParty(world, sId);
      removePlayer(world, sId);

      io?.sockets?.sockets?.get?.(sId)?.disconnect?.(true);
      io.emit("remove", sId);
    }
  }

  const player = createPlayer(world, user.roomName, {
    socketId,
    peerId: session.peerId,
    ...user,
  });

  /* Should we pause or resume? */
  shouldPause(world);

  const roomName = player?.room?.name;

  roomName
    ? console.log(`🔌 ${player?.profile?.userName} connected`)
    : console.log("❌ Missing player roomName");

  if (!roomName) return;

  socket.join(roomName);
  socket.emit(
    "heroInit",
    {
      ...getRoomState(world, roomName),
      userSettings: player.userSettings,
      cheats: areCheatsEnabled(),
      socketId,
    },
    { isLogin: true },
  );
  socket.to(roomName).emit("playerJoin", getFullCharacterState(player), { isLogin: true });
}

export async function register(
  ctx: CommandContext,
  { email, password, charClass, remember }: ParsedCommand<"register"> = {},
) {
  const { world, socket } = ctx;
  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(`${email}`)) {
    return socket.emit("formError", { error: "Invalid email format" });
  }

  // Check if email is already in use
  const user = await world.db.getUserByEmail({ email });
  if (user) {
    return socket.emit("formError", { error: "Email already in use" });
  }

  //Validate password strength
  if (password != null && password.length < 4) {
    return socket.emit("formError", {
      error: "Weak password",
    });
  }

  // Create user if email and password are valid
  const isCreated = await world.db.createUser({ email, password, charClass });
  if (!isCreated) {
    return socket.emit("formError", { error: "Error creating user" });
  }

  // Remember the new account, so the login form is filled in
  if (remember && email) {
    const token = createLoginToken(email.toLowerCase(), password ?? "", world.now());
    socket.emit("loginToken", { token });
  }

  // Send success message
  socket.emit("formSuccess", { success: "Account created", email: email ?? undefined });
}
