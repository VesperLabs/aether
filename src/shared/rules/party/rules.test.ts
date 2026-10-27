import { describe, expect, it } from "vitest";
import {
  acceptPartyInvite,
  createPartyState,
  getParty,
  inviteToParty,
  isPartyMember,
  leaveParty,
  sharedRecipientIds,
  updateMemberRoom,
  type PartyPlayer,
  type PartyState,
} from "./index";

const player = (id: string, extra: Partial<PartyPlayer> = {}): PartyPlayer => ({
  id,
  userName: id.toUpperCase(),
  partyId: null,
  roomName: "town",
  ...extra,
});

/** A party "p1" led by a, with b as a member. */
function twoMemberParty(): PartyState {
  let state = inviteToParty(createPartyState(), {
    inviter: player("a"),
    inviterId: "a",
    invitee: player("b"),
    newPartyId: "p1",
  }).state;
  state = acceptPartyInvite(state, {
    player: player("b"),
    playerId: "b",
    partyId: "p1",
  }).state;
  return state;
}

describe("inviteToParty", () => {
  it("creates a party led by the inviter and invites the target", () => {
    const { state, effects } = inviteToParty(createPartyState(), {
      inviter: player("a"),
      inviterId: "a",
      invitee: player("b"),
      newPartyId: "p1",
    });
    expect(state.parties).toEqual([
      {
        id: "p1",
        socketRoom: "party:p1",
        members: [{ id: "a", isLeader: true, roomName: "town" }],
        invitees: [{ id: "b", inviterId: "a" }],
      },
    ]);
    expect(effects.map((e) => e.type)).toEqual([
      "setPartyId",
      "joinRoom",
      "partyUpdate",
      "partyInvite",
    ]);
    expect(effects.at(-1)).toEqual({
      type: "partyInvite",
      socketId: "b",
      inviterId: "a",
      partyId: "p1",
    });
  });

  it("reuses the inviter's party and does not duplicate invitees", () => {
    const state = twoMemberParty();
    const once = inviteToParty(state, {
      inviter: player("a", { partyId: "p1" }),
      inviterId: "a",
      invitee: player("c"),
      newPartyId: "other",
    });
    const twice = inviteToParty(once.state, {
      inviter: player("a", { partyId: "p1" }),
      inviterId: "a",
      invitee: player("c"),
      newPartyId: "other",
    });
    expect(twice.state.parties).toHaveLength(1);
    expect(getParty(twice.state, "p1")?.invitees).toEqual([{ id: "c", inviterId: "a" }]);
  });

  it("rejects an unknown or already partied invitee without creating a party", () => {
    const missing = inviteToParty(createPartyState(), {
      inviter: player("a"),
      inviterId: "a",
      newPartyId: "p1",
    });
    expect(missing.effects.at(-1)).toMatchObject({
      type: "error",
      message: "Invalid player to invite.",
    });
    expect(missing.state.parties).toHaveLength(0);

    const busy = inviteToParty(createPartyState(), {
      inviter: player("a"),
      inviterId: "a",
      invitee: player("b", { partyId: "x" }),
      newPartyId: "p1",
    });
    expect(busy.effects.at(-1)).toMatchObject({
      type: "error",
      message: "Player is already in a party.",
    });
    expect(busy.state.parties).toHaveLength(0);
  });

  it("treats inviting yourself as already in a party", () => {
    const { effects } = inviteToParty(createPartyState(), {
      inviter: player("a"),
      inviterId: "a",
      invitee: player("a"),
      newPartyId: "p1",
    });
    expect(effects).toEqual([
      { type: "error", socketId: "a", message: "Player is already in a party." },
    ]);
  });

  it("does not mutate its input", () => {
    const state = createPartyState();
    inviteToParty(state, {
      inviter: player("a"),
      inviterId: "a",
      invitee: player("b"),
      newPartyId: "p1",
    });
    expect(state.parties).toEqual([]);
  });
});

describe("acceptPartyInvite", () => {
  it("adds the invitee as a member, clears the invite and tells the room", () => {
    const state = twoMemberParty();
    const party = getParty(state, "p1")!;
    expect(party.members.map((m) => m.id)).toEqual(["a", "b"]);
    expect(party.members[1].isLeader).toBe(false);
    expect(party.invitees).toEqual([]);
  });

  it("answers with an update when the party does not exist", () => {
    const { effects } = acceptPartyInvite(createPartyState(), {
      player: player("b"),
      playerId: "b",
      partyId: "nope",
    });
    expect(effects).toEqual([
      {
        type: "partyUpdate",
        to: { socketId: "b" },
        payload: { message: "Could not find party.", party: null, partyId: "nope" },
      },
    ]);
  });

  it("refuses without an invite", () => {
    const state = twoMemberParty();
    const { effects, state: next } = acceptPartyInvite(state, {
      player: player("c"),
      playerId: "c",
      partyId: "p1",
    });
    expect(effects).toEqual([
      { type: "error", socketId: "c", message: "You were not invited to this party." },
    ]);
    expect(next).toBe(state);
  });

  it("sends an empty message when already in that party", () => {
    const { effects } = acceptPartyInvite(twoMemberParty(), {
      player: player("b", { partyId: "p1" }),
      playerId: "b",
      partyId: "p1",
    });
    expect(effects).toEqual([{ type: "emptyMessage", socketId: "b" }]);
  });

  it("does nothing for an invited player who is already in another party", () => {
    let state = twoMemberParty();
    state = inviteToParty(state, {
      inviter: player("a", { partyId: "p1" }),
      inviterId: "a",
      invitee: player("c"),
      newPartyId: "x",
    }).state;
    const { effects } = acceptPartyInvite(state, {
      player: player("c", { partyId: "other" }),
      playerId: "c",
      partyId: "p1",
    });
    expect(effects).toEqual([]);
  });
});

describe("leaveParty", () => {
  it("hands leadership to the next member when the leader leaves", () => {
    const { state, effects } = leaveParty(twoMemberParty(), {
      player: player("a", { partyId: "p1" }),
      playerId: "a",
    });
    expect(getParty(state, "p1")?.members).toEqual([{ id: "b", isLeader: true, roomName: "town" }]);
    expect(effects).toEqual([
      { type: "leaveRoom", socketId: "a", room: "party:p1" },
      expect.objectContaining({
        to: { room: "party:p1" },
        payload: expect.objectContaining({ message: "A has left the party." }),
      }),
      {
        type: "partyUpdate",
        to: { socketId: "a" },
        payload: { message: "You have left the party", party: null },
      },
      { type: "setPartyId", playerId: "a", partyId: null },
    ]);
  });

  it("withdraws the invites the leaver sent", () => {
    let state = inviteToParty(twoMemberParty(), {
      inviter: player("a", { partyId: "p1" }),
      inviterId: "a",
      invitee: player("c"),
      newPartyId: "unused",
    }).state;
    state = leaveParty(state, { player: player("a", { partyId: "p1" }), playerId: "a" }).state;
    expect(getParty(state, "p1")?.invitees).toEqual([]);
    const accept = acceptPartyInvite(state, { player: player("c"), playerId: "c", partyId: "p1" });
    expect(accept.effects).toEqual([
      { type: "error", socketId: "c", message: "You were not invited to this party." },
    ]);
  });

  it("refuses an invite to a party that has since disbanded", () => {
    let state = inviteToParty(createPartyState(), {
      inviter: player("a"),
      inviterId: "a",
      invitee: player("b"),
      newPartyId: "p1",
    }).state;
    state = leaveParty(state, { player: player("a", { partyId: "p1" }), playerId: "a" }).state;
    expect(state.parties).toEqual([]);
    const accept = acceptPartyInvite(state, { player: player("b"), playerId: "b", partyId: "p1" });
    expect(accept.effects[0]).toMatchObject({ payload: { message: "Could not find party." } });
  });

  it("names a leaver without a user name", () => {
    const { effects } = leaveParty(twoMemberParty(), {
      player: player("b", { partyId: "p1", userName: undefined }),
      playerId: "b",
    });
    expect(effects[1]).toMatchObject({ payload: { message: "A player has left the party." } });
  });

  it("keeps the leader when a regular member leaves", () => {
    const { state } = leaveParty(twoMemberParty(), {
      player: player("b", { partyId: "p1" }),
      playerId: "b",
    });
    expect(getParty(state, "p1")?.members).toEqual([{ id: "a", isLeader: true, roomName: "town" }]);
  });

  it("disbands the party when the last member leaves", () => {
    let state = leaveParty(twoMemberParty(), {
      player: player("b", { partyId: "p1" }),
      playerId: "b",
    }).state;
    state = leaveParty(state, { player: player("a", { partyId: "p1" }), playerId: "a" }).state;
    expect(state.parties).toEqual([]);
  });

  it("only clears the party id for a player with no party", () => {
    const state = createPartyState();
    const { effects, state: next } = leaveParty(state, { player: player("a"), playerId: "a" });
    expect(effects).toEqual([{ type: "setPartyId", playerId: "a", partyId: null }]);
    expect(next).toBe(state);
    expect(leaveParty(state, { playerId: "ghost" }).effects).toEqual([]);
  });
});

describe("updateMemberRoom", () => {
  it("records the new room and notifies the party", () => {
    const { state, effects } = updateMemberRoom(twoMemberParty(), {
      partyId: "p1",
      playerId: "b",
      roomName: "cave",
    });
    expect(getParty(state, "p1")?.members.find((m) => m.id === "b")?.roomName).toBe("cave");
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ type: "partyUpdate", to: { room: "party:p1" } });
  });

  it("ignores an unknown party", () => {
    expect(
      updateMemberRoom(createPartyState(), { partyId: "x", playerId: "b", roomName: "cave" })
        .effects,
    ).toEqual([]);
  });
});

describe("membership queries", () => {
  it("knows who is a member", () => {
    const state = twoMemberParty();
    expect(isPartyMember(state, "p1", "b")).toBe(true);
    expect(isPartyMember(state, "p1", "c")).toBe(false);
    expect(isPartyMember(state, null, "b")).toBe(false);
  });

  it("shares kills with party members in the same room only", () => {
    const state = updateMemberRoom(twoMemberParty(), {
      partyId: "p1",
      playerId: "b",
      roomName: "cave",
    }).state;
    expect(sharedRecipientIds(state, { partyId: "p1", id: "a", roomName: "town" })).toEqual(["a"]);
    const together = updateMemberRoom(state, {
      partyId: "p1",
      playerId: "b",
      roomName: "town",
    }).state;
    expect(sharedRecipientIds(together, { partyId: "p1", id: "a", roomName: "town" })).toEqual([
      "a",
      "b",
    ]);
  });

  it("falls back to just the killer without a party", () => {
    expect(
      sharedRecipientIds(createPartyState(), { partyId: null, id: "a", roomName: "town" }),
    ).toEqual(["a"]);
  });
});
