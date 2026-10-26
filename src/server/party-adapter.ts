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
import { getFullCharacterState } from "./utils";

/**
 * Legacy adapter between the party rules and the server scene: copies players into the rules'
 * plain input, stores the new `scene.partyState` and applies the effects to sockets and players.
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

function applyEffects(scene: ServerScene, effects: PartyEffect[], acting?: Socket) {
  const socketFor = (id: string): Socket | undefined =>
    acting?.id === id ? acting : scene.io?.sockets?.sockets?.get?.(id);
  for (const effect of effects) {
    switch (effect.type) {
      case "joinRoom":
        socketFor(effect.socketId)?.join(effect.room);
        break;
      case "leaveRoom":
        socketFor(effect.socketId)?.leave(effect.room);
        break;
      case "setPartyId": {
        const player = scene.players?.[effect.playerId];
        if (player) player.partyId = effect.partyId;
        break;
      }
      case "partyUpdate":
        if ("room" in effect.to) scene.io.to(effect.to.room).emit("partyUpdate", effect.payload);
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
          inviter: getFullCharacterState(scene.players?.[effect.inviterId]),
          partyId: effect.partyId,
        };
        scene.io.to(effect.socketId).emit("partyInvite", inviteData);
        break;
      }
    }
  }
}

function run(scene: ServerScene, result: PartyResult, acting?: Socket) {
  scene.partyState = result.state;
  applyEffects(scene, result.effects, acting);
}

export function legacyInviteToParty(scene: ServerScene, socket: Socket, inviteeId: string) {
  run(
    scene,
    inviteToParty(scene.partyState, {
      inviter: toPartyPlayer(scene.players?.[socket.id]),
      inviterId: socket.id,
      invitee: toPartyPlayer(scene.players?.[inviteeId]),
      newPartyId: crypto.randomUUID(),
    }),
    socket,
  );
}

export function legacyAcceptPartyInvite(scene: ServerScene, socket: Socket, partyId: string) {
  run(
    scene,
    acceptPartyInvite(scene.partyState, {
      player: toPartyPlayer(scene.players?.[socket.id]),
      playerId: socket.id,
      partyId,
    }),
    socket,
  );
}

export function legacyLeaveParty(scene: ServerScene, socket: Socket) {
  run(
    scene,
    leaveParty(scene.partyState, {
      player: toPartyPlayer(scene.players?.[socket.id]),
      playerId: socket.id,
    }),
    socket,
  );
}

export function legacyUpdateMemberRoom(scene: ServerScene, player: ServerPlayer) {
  if (!player.partyId) return;
  run(
    scene,
    updateMemberRoom(scene.partyState, {
      partyId: player.partyId,
      playerId: player.id,
      roomName: player.roomName,
    }),
  );
}
