import { broadcastPlayerUpdate, toRoomPlayers } from "@/server/net/room-broadcast";
import type { Player } from "../../player";
import { runAdminCommand } from "../../admin/commands";
import { runPlayerCommand } from "./chat-commands";
import { resolveChatLinks } from "./chat-links";
import {
  legacyAcceptPartyInvite,
  legacyInviteToParty,
  legacyLeaveParty,
} from "../../party-adapter";
import type { ParsedCommand } from "@/network";
import type { CommandContext } from "@/server/net/command-context";
import { findNearbyNpc } from "@/server/net/nearby-keeper";
import { isInRoom } from "@/server/player-room";

export function chatNpc(ctx: CommandContext, { npcId }: ParsedCommand<"chatNpc"> = {}) {
  const { world, actor, socketId } = ctx;
  const player: Player = world?.players?.[socketId];
  const npc = findNearbyNpc(world, socketId, npcId);
  if (!player || !npc) return;
  if (!npc.talkingIds.includes(socketId)) npc.talkingIds.push(socketId);
  player.state.targetNpcId = npcId;
  /* Quests that are of type: chat need to be updated */
  player.updateChatQuests(npc.name);
  actor.emit("npcServices", {
    npcId: npc.id,
    services: npc.services,
    playerQuests: player.getQuests(),
  });
}

export function acceptQuest(ctx: CommandContext, questId: ParsedCommand<"acceptQuest">) {
  const { world, socketId } = ctx;
  const player: Player = world?.players?.[socketId];
  const currentQuest = world.quests?.[questId];
  if (!currentQuest || !isInRoom(player)) return;
  const foundQuest = player?.getPlayerQuestStatus(currentQuest);
  /* If the quest wasnt there, we can accept it */
  if (!foundQuest) {
    player?.addQuest(currentQuest);
    /* Save the users data */
    world.db.updateUser(player);
    broadcastPlayerUpdate(ctx.world, player);
  }
}

export function completeQuest(ctx: CommandContext, questId: ParsedCommand<"completeQuest">) {
  const { world, actor, socketId } = ctx;
  const player: Player = world?.players?.[socketId];
  if (!isInRoom(player)) return;
  /* If the quest is ready, we turn it in */
  const questResults = player?.completeQuest(questId);
  /* Quest failed */
  if (questResults?.error) {
    return actor.emit("message", {
      type: "error",
      message: questResults.error,
    });
  }
  /* Save the users data */
  player.calculateStats();
  world.db.updateUser(player);
  broadcastPlayerUpdate(ctx.world, player, {
    didLevel: questResults?.didLevel,
  });
}

export function inviteToParty(
  ctx: CommandContext,
  inviteeSocketId: ParsedCommand<"inviteToParty">,
) {
  legacyInviteToParty(ctx.world, ctx.socketId, ctx.actor, inviteeSocketId);
}

export function partyAccept(ctx: CommandContext, partyId: ParsedCommand<"partyAccept">) {
  legacyAcceptPartyInvite(ctx.world, ctx.socketId, ctx.actor, partyId);
}

export function partyLeave(ctx: CommandContext) {
  legacyLeaveParty(ctx.world, ctx.socketId, ctx.actor);
}

export function message(ctx: CommandContext, args: ParsedCommand<"message">) {
  const { world } = ctx;
  if (!args?.message) return;
  const player = world?.players?.[ctx.socketId];
  if (!isInRoom(player)) return;
  // chat bubble
  if (args.message.charAt(0) === "!" && args.message.length > 1) {
    player.state.lastBubbleMessage = world.now();
    player.state.bubbleMessage = args.message.substr(1);
    return;
  }
  const links = resolveChatLinks(player, args.items, args.message);
  if (args.message.charAt(0) === "/") {
    if (runPlayerCommand(ctx, player, args.message, links) || runAdminCommand(ctx, args.message))
      return;
  }
  toRoomPlayers(world, player.roomName).emit("message", {
    from: player?.profile?.userName,
    type: "chat",
    message: args.message,
    links,
  });
}
