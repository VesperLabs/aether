import { toAllPlayers, toRoomPlayers } from "@/server/net/room-broadcast";
import { randomNumber, type BuiltItem } from "@/content";
import { CHAT_COMMANDS, findChatCommand, type ChatMessage } from "@/network";
import { getParty } from "@/rules/party";
import { legacyInviteToParty, legacyLeaveParty } from "@/server/party-adapter";
import type { Player } from "@/server/player";
import type { PlayerInRoom } from "@/server/player-room";
import type { CommandContext } from "@/server/net/command-context";

/** Handles one player command: `text` is everything typed after its name. */
type PlayerCommand = (
  ctx: CommandContext,
  player: PlayerInRoom,
  text: string,
  links?: BuiltItem[],
) => void;

const DEFAULT_ROLL_MAX = 100;

const reply = (ctx: CommandContext, type: "system" | "error", message: string) =>
  ctx.actor.emit("message", { type, message });

const nameOf = (player: Player) => player.profile?.userName;

const onlinePlayers = (ctx: CommandContext): Player[] =>
  Object.values<Player>(ctx.world.players).filter((p) => p.room);

/** The online player whose name `text` starts with, and the words after it. Names may hold spaces. */
function splitPlayerName(ctx: CommandContext, text: string) {
  const lower = text.toLowerCase();
  const target = onlinePlayers(ctx)
    .filter((p) => {
      const name = nameOf(p)?.toLowerCase();
      return name && (lower === name || lower.startsWith(`${name} `));
    })
    .sort((a, b) => nameOf(b).length - nameOf(a).length)[0];
  return { target, rest: target ? text.slice(nameOf(target).length).trim() : text };
}

function sendWhisper(
  ctx: CommandContext,
  from: Player,
  to: Player,
  text: string,
  links?: BuiltItem[],
) {
  if (to.id === from.id) return reply(ctx, "error", "You can't whisper yourself.");
  to.lastWhisperFrom = nameOf(from);
  const line: ChatMessage = { type: "whisper", from: nameOf(from), message: text, links };
  ctx.io.to(to.id).emit("message", line);
  ctx.actor.emit("message", { type: "whisper", to: nameOf(to), message: text, links });
}

const yell: PlayerCommand = (ctx, player, text, links) => {
  if (!text) return reply(ctx, "error", "Usage: /yell <message>");
  toAllPlayers(ctx.world).emit("message", {
    type: "yell",
    from: nameOf(player),
    message: text,
    links,
  });
};

const whisper: PlayerCommand = (ctx, player, text, links) => {
  if (!text) return reply(ctx, "error", "Usage: /whisper <player> <message>");
  const { target, rest } = splitPlayerName(ctx, text);
  if (!target) return reply(ctx, "error", `No player by that name is online.`);
  if (!rest) return reply(ctx, "error", "Usage: /whisper <player> <message>");
  sendWhisper(ctx, player, target, rest, links);
};

const replyToWhisper: PlayerCommand = (ctx, player, text, links) => {
  if (!text) return reply(ctx, "error", "Usage: /reply <message>");
  if (!player.lastWhisperFrom) return reply(ctx, "error", "Nobody has whispered you yet.");
  const target = onlinePlayers(ctx).find((p) => nameOf(p) === player.lastWhisperFrom);
  if (!target) return reply(ctx, "error", `${player.lastWhisperFrom} is no longer online.`);
  sendWhisper(ctx, player, target, text, links);
};

const party: PlayerCommand = (ctx, player, text, links) => {
  if (!text) return reply(ctx, "error", "Usage: /party <message>");
  const current = getParty(ctx.world.partyState, player.partyId);
  if (!current) return reply(ctx, "error", "You aren't in a party.");
  ctx.io
    .to(current.socketRoom)
    .emit("message", { type: "party", from: nameOf(player), message: text, links });
};

const me: PlayerCommand = (ctx, player, text, links) => {
  if (!text) return reply(ctx, "error", "Usage: /me <action>");
  toRoomPlayers(ctx.world, player.roomName).emit("message", {
    type: "emote",
    message: `${nameOf(player)} ${text}`,
    links,
  });
};

const who: PlayerCommand = (ctx) => {
  const players = onlinePlayers(ctx);
  const list = players.map((p) => `${nameOf(p)} (level ${p.stats?.level}, ${p.roomName})`);
  reply(ctx, "system", `${players.length} online: ${list.join(", ")}`);
};

const invite: PlayerCommand = (ctx, player, text) => {
  if (!text) return reply(ctx, "error", "Usage: /invite <player>");
  const { target } = splitPlayerName(ctx, text);
  if (!target) return reply(ctx, "error", "No player by that name is online.");
  if (target.id === player.id) return reply(ctx, "error", "You can't invite yourself.");
  legacyInviteToParty(ctx.world, ctx.socketId, ctx.actor, target.id);
  reply(ctx, "system", `Invited ${nameOf(target)} to your party.`);
};

const leave: PlayerCommand = (ctx, player) => {
  if (!getParty(ctx.world.partyState, player.partyId)) {
    return reply(ctx, "error", "You aren't in a party.");
  }
  legacyLeaveParty(ctx.world, ctx.socketId, ctx.actor);
};

const roll: PlayerCommand = (ctx, player, text) => {
  const max = text ? Number(text) : DEFAULT_ROLL_MAX;
  if (!Number.isInteger(max) || max < 1) return reply(ctx, "error", "Usage: /roll [max]");
  const rolled = randomNumber(ctx.world.dice, 1, max);
  toRoomPlayers(ctx.world, player.roomName).emit("message", {
    type: "system",
    message: `${nameOf(player)} rolls ${rolled} (1-${max})`,
  });
};

/* Only the client can forget its login; reloading then disconnects, which saves the player */
const logout: PlayerCommand = (ctx) => ctx.actor.emit("loggedOut");

const PLAYER_COMMANDS: Record<string, PlayerCommand> = {
  yell,
  whisper,
  reply: replyToWhisper,
  party,
  me,
  who,
  invite,
  leave,
  logout,
  roll,
};

/** Runs a `/command` every player has. Returns false when the message isn't one. */
export function runPlayerCommand(
  ctx: CommandContext,
  player: PlayerInRoom,
  rawMessage: string,
  links?: BuiltItem[],
): boolean {
  const name = rawMessage.slice(1).split(" ", 1)[0];
  const command = findChatCommand(name, CHAT_COMMANDS);
  if (!command || command.cheat) return false;
  PLAYER_COMMANDS[command.name]?.(ctx, player, rawMessage.slice(name.length + 1).trim(), links);
  return true;
}
