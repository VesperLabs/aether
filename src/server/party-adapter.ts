import crypto from "crypto";
import type { Socket } from "socket.io";
import {
  acceptPartyInvite,
  inviteToParty,
  leaveParty,
  updateMemberRoom,
  type PartyEffect,
  type PartyPlayer,
  type PartyResult,
} from "@/shared/rules/party";
import { getFullCharacterState } from "@/shared/network/sync";

/**
 * Legacy adapter between the party rules and the server world: copies players into the rules'
 * plain input, stores the new `world.partyState` and applies the effects to sockets and players.
 * Goes away in Phase 4 when entities become plain data.
 */

export function toPartyPlayer(player?: ServerPlayer): PartyPlayer | undefined {
  if (!player) return undefined;
  return {
    id: player.id,
    userName: player.profile?.userName,
    partyId: player.partyId,
    roomName: player.roomName,
  };
}

function applyEffects(world: ServerWorld, effects: PartyEffect[], acting?: Socket) {
  const socketFor = (id: string): Socket | undefined =>
    acting?.id === id ? acting : world.io?.sockets?.sockets?.get?.(id);
  for (const effect of effects) {
    switch (effect.type) {
      case "joinRoom":
        socketFor(effect.socketId)?.join(effect.room);
        break;
      case "leaveRoom":
        socketFor(effect.socketId)?.leave(effect.room);
        break;
      case "setPartyId": {
        const player = world.players?.[effect.playerId];
        if (player) player.partyId = effect.partyId;
        break;
      }
      case "partyUpdate":
        if ("room" in effect.to) world.io.to(effect.to.room).emit("partyUpdate", effect.payload);
        else socketFor(effect.to.socketId)?.emit("partyUpdate", effect.payload);
        break;
      case "error":
        socketFor(effect.socketId)?.emit("message", { type: "error", message: effect.message });
        break;
      case "emptyMessage":
        socketFor(effect.socketId)?.emit("message");
        break;
      case "partyInvite": {
        const inviteData: PartyInvite = {
          inviter: getFullCharacterState(world.players?.[effect.inviterId]),
          partyId: effect.partyId,
        };
        world.io.to(effect.socketId).emit("partyInvite", inviteData);
        break;
      }
    }
  }
}

function run(world: ServerWorld, result: PartyResult, acting?: Socket) {
  world.partyState = result.state;
  applyEffects(world, result.effects, acting);
}

export function legacyInviteToParty(world: ServerWorld, socket: Socket, inviteeId: string) {
  run(
    world,
    inviteToParty(world.partyState, {
      inviter: toPartyPlayer(world.players?.[socket.id]),
      inviterId: socket.id,
      invitee: toPartyPlayer(world.players?.[inviteeId]),
      newPartyId: crypto.randomUUID(),
    }),
    socket,
  );
}

export function legacyAcceptPartyInvite(world: ServerWorld, socket: Socket, partyId: string) {
  run(
    world,
    acceptPartyInvite(world.partyState, {
      player: toPartyPlayer(world.players?.[socket.id]),
      playerId: socket.id,
      partyId,
    }),
    socket,
  );
}

export function legacyLeaveParty(world: ServerWorld, socket: Socket) {
  run(
    world,
    leaveParty(world.partyState, {
      player: toPartyPlayer(world.players?.[socket.id]),
      playerId: socket.id,
    }),
    socket,
  );
}

export function legacyUpdateMemberRoom(world: ServerWorld, player: ServerPlayer) {
  if (!player.partyId) return;
  run(
    world,
    updateMemberRoom(world.partyState, {
      partyId: player.partyId,
      playerId: player.id,
      roomName: player.roomName,
    }),
  );
}
