import { broadcastPlayerJoin } from "@/server/net/room-broadcast";
import { getRoomState } from "@/server/net/room-sync";
import { areCheatsEnabled } from "@/server/admin/commands";
import { removePlayer } from "../remove-player";
import { createPlayer } from "../player-room";
import { legacyLeaveParty } from "../party-adapter";
import { createBaseUser } from "../persistence";
import { shouldPause } from "../net/world-pause";
import { stopObserving } from "../net/handlers/observe";
import type { Player } from "../player";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import type { UserDocument } from "../persistence";
import { TOO_MANY_TRIES } from "./accounts";
import { isLoginAllowed } from "./login-limit";
import { redeemPlayTicket } from "./play-tickets";

/** Demo logins (throwaway, unsaved characters) are for development only, never production. */
function isDemoAllowed() {
  return process.env.NODE_ENV !== "production";
}

export async function demoLogin(
  ctx: CommandContext,
  { charClass, gender }: ParsedCommand<"demoLogin"> = {},
) {
  const { world, actor, socketId, session } = ctx;
  if (!isDemoAllowed()) return actor.emit("formError", { error: "Demo mode is off" });
  if (!charClass) return actor.emit("formError", { error: "No class" });

  /* Only let one connection at a time */
  if (Object.keys(world?.players).find((k) => k === socketId)) {
    return console.log("❌ Socket already logged in");
  }

  const user = createBaseUser(world.dice, charClass, gender);

  const player = createPlayer(world, user.roomName, {
    socketId,
    peerId: session.peerId,
    isDemoAccount: true,
    ...user,
  });

  joinWorld(ctx, player);
}

export async function login(ctx: CommandContext, args: ParsedCommand<"login"> = {}) {
  const { world, actor, session } = ctx;
  const { email, password } = args;
  const address = session.address;
  if (!isLoginAllowed(world.db, address, email ?? "", world.now())) {
    return actor.emit("formError", { error: TOO_MANY_TRIES });
  }
  const user = await world.db.getUserByLogin({ email, password });
  if (!user) return actor.emit("formError", { error: "Invalid login" });
  enterWorld(ctx, user);
}

/** Logs in with the one-time ticket the wiki sent this client here with. */
export async function ticketLogin(ctx: CommandContext, { ticket }: ParsedCommand<"ticketLogin">) {
  const { world, actor } = ctx;
  const email = redeemPlayTicket(ticket, world.now());
  const user = email && (await world.db.getUserByEmail({ email }));
  if (!user) return actor.emit("formError", { error: "Login expired, enter your password" });
  enterWorld(ctx, user);
}

function enterWorld(ctx: CommandContext, user: UserDocument) {
  const { world, socketId, io, session } = ctx;

  /* Only let one connection at a time */
  if (Object.keys(world?.players).find((k) => k === socketId)) {
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

  joinWorld(ctx, player);
}

/** Puts a freshly created player's connection in their room and tells both sides. */
function joinWorld(ctx: CommandContext, player: Player) {
  const { world, actor, socketId } = ctx;
  stopObserving(ctx);

  /* Should we pause or resume? */
  shouldPause(world);

  const roomName = player?.room?.name;

  roomName
    ? console.log(`🔌 ${player?.profile?.userName} connected`)
    : console.log("❌ Missing player roomName");

  if (!roomName) return;

  actor.join(roomName);
  actor.emit(
    "heroInit",
    {
      ...getRoomState(world, roomName),
      userSettings: player.userSettings,
      cheats: areCheatsEnabled(),
      socketId,
    },
    { isLogin: true },
  );
  broadcastPlayerJoin(world, roomName, player, { isLogin: true });
}
