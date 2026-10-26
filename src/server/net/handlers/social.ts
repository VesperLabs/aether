import { runAdminCommand } from "../../admin/commands";
import { getFullCharacterState } from "@/shared/network/sync";
import {
  legacyAcceptPartyInvite,
  legacyInviteToParty,
  legacyLeaveParty,
} from "../../party-adapter";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function chatNpc(ctx: CommandContext, { npcId }: ParsedCommand<"chatNpc"> = {}) {
  const { world, socket, socketId } = ctx;
  const player: ServerPlayer = world?.players?.[socketId];
  const npc = world?.npcs?.[npcId];
  npc.talkingIds.push(socketId);
  player.state.targetNpcId = npcId;
  /* Quests that are of type: chat need to be updated */
  player.updateChatQuests(npc.name);
  socket.emit("keeperDataUpdate", {
    npcId: npc?.id,
    keeperData: npc?.keeperData,
    playerQuests: world?.players?.[socketId].getQuests(),
  });
}

export function acceptQuest(ctx: CommandContext, questId: ParsedCommand<"acceptQuest">) {
  const { world, socketId, io } = ctx;
  const player: ServerPlayer = world?.players?.[socketId];
  const currentQuest = world.quests?.[questId];
  const foundQuest = player?.getPlayerQuestStatus(currentQuest);
  /* If the quest wasnt there, we can accept it */
  if (!foundQuest) {
    player?.addQuest(currentQuest);
    /* Save the users data */
    world.db.updateUser(player);
    io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
  }
}

export function completeQuest(ctx: CommandContext, questId: ParsedCommand<"completeQuest">) {
  const { world, socket, socketId, io } = ctx;
  const player: ServerPlayer = world?.players?.[socketId];
  /* If the quest is ready, we turn it in */
  const questResults = player?.completeQuest(questId);
  /* Quest failed */
  if (questResults?.error) {
    return socket.emit("message", {
      type: "error",
      message: questResults.error,
    } as Message);
  }
  /* Save the users data */
  player.calculateStats();
  world.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player), {
    didLevel: questResults?.didLevel,
  });
}

export function inviteToParty(
  ctx: CommandContext,
  inviteeSocketId: ParsedCommand<"inviteToParty">,
) {
  legacyInviteToParty(ctx.world, ctx.socket, inviteeSocketId);
}

export function partyAccept(ctx: CommandContext, partyId: ParsedCommand<"partyAccept">) {
  legacyAcceptPartyInvite(ctx.world, ctx.socket, partyId);
}

export function partyLeave(ctx: CommandContext) {
  legacyLeaveParty(ctx.world, ctx.socket);
}

export function message(ctx: CommandContext, args: ParsedCommand<"message">) {
  const { world, io } = ctx;
  if (!args?.message) return;
  const player = world?.players?.[ctx.socketId];
  // chat bubble
  if (args.message.charAt(0) === "!" && args.message.length > 1) {
    player.state.lastBubbleMessage = Date.now();
    player.state.bubbleMessage = args.message.substr(1);
    return;
  }
  if (args.message.charAt(0) === "/" && runAdminCommand(ctx, args.message)) return;
  io.to(player?.roomName).emit("message", {
    from: player?.profile?.userName,
    type: "chat",
    message: args.message,
  });
}
