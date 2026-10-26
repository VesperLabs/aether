import { runAdminCommand } from "../../admin/commands";
import { getFullCharacterState } from "../../utils";
import type { ParsedCommand } from "@/shared/network";
import type { CommandContext } from "@/server/net/command-context";

export function chatNpc(ctx: CommandContext, { npcId }: ParsedCommand<"chatNpc"> = {}) {
  const { scene, socket, socketId } = ctx;
  const player: ServerPlayer = scene?.players?.[socketId];
  const npc = scene?.npcs?.[npcId];
  npc.talkingIds.push(socketId);
  player.state.targetNpcId = npcId;
  /* Quests that are of type: chat need to be updated */
  player.updateChatQuests(npc.name);
  socket.emit("keeperDataUpdate", {
    npcId: npc?.id,
    keeperData: npc?.keeperData,
    playerQuests: scene?.players?.[socketId].getQuests(),
  });
}

export function acceptQuest(ctx: CommandContext, questId: ParsedCommand<"acceptQuest">) {
  const { scene, socketId, io } = ctx;
  const player: ServerPlayer = scene?.players?.[socketId];
  const currentQuest = scene.quests?.[questId];
  const foundQuest = player?.getPlayerQuestStatus(currentQuest);
  /* If the quest wasnt there, we can accept it */
  if (!foundQuest) {
    player?.addQuest(currentQuest);
    /* Save the users data */
    scene.db.updateUser(player);
    io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player));
  }
}

export function completeQuest(ctx: CommandContext, questId: ParsedCommand<"completeQuest">) {
  const { scene, socket, socketId, io } = ctx;
  const player: ServerPlayer = scene?.players?.[socketId];
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
  scene.db.updateUser(player);
  io.to(player?.roomName).emit("playerUpdate", getFullCharacterState(player), {
    didLevel: questResults?.didLevel,
  });
}

export function inviteToParty(
  ctx: CommandContext,
  inviteeSocketId: ParsedCommand<"inviteToParty">,
) {
  const { scene, socket, io } = ctx;
  const player: ServerPlayer = scene?.players?.[socket.id];
  const party =
    scene.partyManager.getPartyById(player?.partyId) || scene.partyManager.createParty(socket);
  const invitee: ServerPlayer = scene?.players?.[inviteeSocketId];

  if (!invitee) {
    return socket.emit("message", {
      type: "error",
      message: "Invalid player to invite.",
    } as Message);
  }

  if (invitee.partyId) {
    return socket.emit("message", {
      type: "error",
      message: "Player is already in a party.",
    } as Message);
  }

  party.addInvitee(inviteeSocketId);

  const inviteData: PartyInvite = {
    inviter: getFullCharacterState(player),
    partyId: party.id,
  };

  io.to(inviteeSocketId).emit("partyInvite", inviteData);
}

export function partyAccept(ctx: CommandContext, partyId: ParsedCommand<"partyAccept">) {
  const { scene, socket, socketId } = ctx;
  const player: ServerPlayer = scene.players[socketId];
  const party = scene.partyManager.getPartyById(partyId);

  if (!player || !party) {
    return socket.emit("partyUpdate", {
      message: "Could not find party.",
      party: null,
      partyId,
    });
  }

  // Check if the player is already a member of the party
  if (player.partyId === partyId) {
    return socket.emit("message");
  }

  if (!party.hasInviteeId(socketId)) {
    return socket.emit("message", {
      type: "error",
      message: "You were not invited to this party.",
    } as Message);
  }

  scene.partyManager.addSocketToParty(socket, partyId);
}

export function partyLeave(ctx: CommandContext) {
  const { scene, socket } = ctx;
  scene.partyManager.removeSocketFromParty(socket);
}

export function message(ctx: CommandContext, args: ParsedCommand<"message">) {
  const { scene, io } = ctx;
  if (!args?.message) return;
  const player = scene?.players?.[ctx.socketId];
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
