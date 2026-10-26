// @vitest-environment node
// TEMPORARY: pins old PartyManager behaviour against the new party rules. Deleted after migration.
import { describe, expect, it } from "vitest";
import "./phaser";
import { PartyManager } from "./party-manager";
import {
  legacyAcceptPartyInvite,
  legacyInviteToParty,
  legacyLeaveParty,
  legacyUpdateMemberRoom,
} from "./party-adapter";
import { createPartyState } from "@/shared/rules/party";
import { getFullCharacterState } from "./utils";

type Log = unknown[];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeWorld(log: Log, n: number) {
  const sockets: Record<string, any> = {};
  const players: Record<string, any> = {};
  const scene: any = {
    players,
    io: {
      to: (room: string) => ({
        emit: (ev: string, payload?: unknown) =>
          log.push(["room", room, ev, JSON.parse(JSON.stringify(payload ?? null))]),
      }),
      sockets: { sockets: { get: (id: string) => sockets[id] } },
    },
  };
  for (let i = 0; i < n; i++) {
    const id = `p${i}`;
    sockets[id] = {
      id,
      join: (r: string) => log.push(["join", id, r]),
      leave: (r: string) => log.push(["leave", id, r]),
      emit: (ev: string, payload?: unknown) =>
        log.push(["sock", id, ev, JSON.parse(JSON.stringify(payload ?? null))]),
    };
    players[id] = {
      getQuests: () => [],
      id,
      partyId: null,
      roomName: "r0",
      profile: { userName: `User${i}` },
    };
  }
  return { scene, sockets, players };
}

/* The old handlers, copied verbatim from social.ts, against the old manager. */
function oldInvite(scene: any, socket: any, inviteeSocketId: string) {
  const io = scene.io;
  const player = scene.players[socket.id];
  const party =
    scene.partyManager.getPartyById(player?.partyId) || scene.partyManager.createParty(socket);
  const invitee = scene.players[inviteeSocketId];
  if (!invitee)
    return socket.emit("message", { type: "error", message: "Invalid player to invite." });
  if (invitee.partyId)
    return socket.emit("message", { type: "error", message: "Player is already in a party." });
  party.addInvitee(inviteeSocketId);
  io.to(inviteeSocketId).emit("partyInvite", {
    inviter: getFullCharacterState(player),
    partyId: party.id,
  });
}
function oldAccept(scene: any, socket: any, partyId: string) {
  const player = scene.players[socket.id];
  const party = scene.partyManager.getPartyById(partyId);
  if (!player || !party)
    return socket.emit("partyUpdate", { message: "Could not find party.", party: null, partyId });
  if (player.partyId === partyId) return socket.emit("message");
  if (!party.hasInviteeId(socket.id))
    return socket.emit("message", {
      type: "error",
      message: "You were not invited to this party.",
    });
  scene.partyManager.addSocketToParty(socket, partyId);
}
function oldMove(scene: any, player: any) {
  if (player?.partyId) {
    const party = scene.partyManager.getPartyById(player.partyId);
    party.updateMember(player.id, { roomName: player.roomName });
    scene.io.to(party.socketRoom).emit("partyUpdate", { party });
  }
}

function normalise(log: Log) {
  const ids = new Map<string, string>();
  const text = JSON.stringify(log).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (m) => {
    if (!ids.has(m)) ids.set(m, `#${ids.size}`);
    return ids.get(m)!;
  });
  return text;
}

describe("party equivalence (temporary)", () => {
  it("matches the old manager on generated sequences", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rand = rng(seed);
      const n = 5;
      const oldLog: Log = [];
      const newLog: Log = [];
      const o = makeWorld(oldLog, n);
      const w = makeWorld(newLog, n);
      o.scene.partyManager = new PartyManager(o.scene);
      w.scene.partyState = createPartyState();
      const alive = new Set(Object.keys(o.players));
      const partyIdsOld: string[] = [];
      for (let step = 0; step < 40; step++) {
        const actor = `p${Math.floor(rand() * n)}`;
        const target = `p${Math.floor(rand() * n)}`;
        const op = Math.floor(rand() * 6);
        const actorAlive = alive.has(actor);
        // use a party id the actor may have been invited to, or a bogus one
        const knownParties = o.scene.partyManager.parties.map((p: any) => p.id);
        const pick = Math.floor(rand() * (knownParties.length + 1));
        const oldPid = knownParties[pick] ?? "bogus";
        // map to the new world's party in the same position
        const newPid = w.scene.partyState.parties[pick]?.id ?? "bogus";
        void partyIdsOld;
        if (!actorAlive) continue; // dead sockets send nothing
        if (op === 0) {
          oldInvite(o.scene, o.sockets[actor], target);
          legacyInviteToParty(w.scene, w.sockets[actor], target);
        } else if (op === 1 || op === 2) {
          oldAccept(o.scene, o.sockets[actor], oldPid);
          legacyAcceptPartyInvite(w.scene, w.sockets[actor], newPid);
        } else if (op === 3) {
          o.scene.partyManager.removeSocketFromParty(o.sockets[actor]);
          legacyLeaveParty(w.scene, w.sockets[actor]);
        } else if (op === 4) {
          const room = `r${Math.floor(rand() * 3)}`;
          o.players[actor].roomName = room;
          w.players[actor].roomName = room;
          oldMove(o.scene, o.players[actor]);
          legacyUpdateMemberRoom(w.scene, w.players[actor]);
        } else {
          // disconnect
          o.scene.partyManager.removeSocketFromParty(o.sockets[actor]);
          legacyLeaveParty(w.scene, w.sockets[actor]);
          delete o.players[actor];
          delete w.players[actor];
          alive.delete(actor);
        }
        const oldState = JSON.parse(JSON.stringify(o.scene.partyManager.parties));
        const newState = JSON.parse(JSON.stringify(w.scene.partyState.parties));
        expect(normalise(newState)).toBe(normalise(oldState));
        expect(normalise(newLog)).toBe(normalise(oldLog));
        const pOld = Object.values(o.players).map((p: any) => p.partyId);
        const pNew = Object.values(w.players).map((p: any) => p.partyId);
        expect(pNew.map((x) => (x ? "y" : x))).toEqual(pOld.map((x: any) => (x ? "y" : x)));
      }
    }
  });
});
