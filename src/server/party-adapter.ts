import type { ServerWorld } from "./server-world";
import type { Player } from "./player";
import { socketActor, type Actor } from "./net/actor";
import {
  acceptPartyInvite,
  inviteToParty,
  leaveParty,
  updateMemberRoom,
  type PartyEffect,
  type PartyPlayer,
  type PartyResult,
} from "@/rules/party";
import { getFullCharacterState } from "@/network/sync";

/**
 * Legacy adapter between the party rules and the server world: copies players into the rules'
 * plain input, stores the new `world.partyState` and applies the effects to sockets and players.
 * Goes away in Phase 4 when entities become plain data.
 */

function toPartyPlayer(player?: Player): PartyPlayer | undefined {
  if (!player) return undefined;
  return {
    id: player.id,
    userName: player.profile?.userName,
    partyId: player.partyId,
    // Between rooms the member matches no room, as null did before.
    roomName: player.roomName ?? "",
  };
}

function applyEffects(
  world: ServerWorld,
  effects: PartyEffect[],
  acting?: { id: string; actor: Actor },
) {
  const socketFor = (id: string): Actor | undefined => {
    if (acting?.id === id) return acting.actor;
    const socket = world.io?.sockets?.sockets?.get?.(id);
    return socket && socketActor(socket);
  };
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
        const inviteData = {
          inviter: getFullCharacterState(world.players?.[effect.inviterId]),
          partyId: effect.partyId,
        };
        world.io.to(effect.socketId).emit("partyInvite", inviteData);
        break;
      }
    }
  }
}

function run(world: ServerWorld, result: PartyResult, acting?: { id: string; actor: Actor }) {
  world.partyState = result.state;
  applyEffects(world, result.effects, acting);
}

export function legacyInviteToParty(
  world: ServerWorld,
  inviterId: string,
  actor: Actor,
  inviteeId: string,
) {
  run(
    world,
    inviteToParty(world.partyState, {
      inviter: toPartyPlayer(world.players?.[inviterId]),
      inviterId,
      invitee: toPartyPlayer(world.players?.[inviteeId]),
      newPartyId: world.dice.newId(),
    }),
    { id: inviterId, actor },
  );
}

export function legacyAcceptPartyInvite(
  world: ServerWorld,
  playerId: string,
  actor: Actor,
  partyId: string,
) {
  run(
    world,
    acceptPartyInvite(world.partyState, {
      player: toPartyPlayer(world.players?.[playerId]),
      playerId,
      partyId,
    }),
    { id: playerId, actor },
  );
}

/** The player on `socketId` leaves their party. `actor` is theirs when they are the one acting. */
export function legacyLeaveParty(world: ServerWorld, socketId: string, actor?: Actor) {
  run(
    world,
    leaveParty(world.partyState, {
      player: toPartyPlayer(world.players?.[socketId]),
      playerId: socketId,
    }),
    actor && { id: socketId, actor },
  );
}

export function legacyUpdateMemberRoom(world: ServerWorld, player: Player) {
  if (!player.partyId || !player.roomName) return;
  run(
    world,
    updateMemberRoom(world.partyState, {
      partyId: player.partyId,
      playerId: player.id,
      roomName: player.roomName,
    }),
  );
}
