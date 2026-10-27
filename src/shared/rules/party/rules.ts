/**
 * Party rules: pure functions over plain `PartyState`.
 * Each rule returns the new state plus the effects the host must apply (socket room joins/leaves,
 * messages to send, which party a player now belongs to). Nothing here mutates its input.
 */

export interface PartyMember {
  id: string;
  isLeader: boolean;
  roomName: string;
}

export interface PartyInvitee {
  id: string;
  /** Who sent the invite. It is withdrawn when they leave. */
  inviterId: string;
}

export interface Party {
  id: string;
  members: PartyMember[];
  invitees: PartyInvitee[];
  /** Name of the socket room every member joins. */
  socketRoom: string;
}

export interface PartyState {
  parties: Party[];
}

/** The little the party rules need to know about a player. */
export interface PartyPlayer {
  id: string;
  userName?: string;
  partyId?: string | null;
  roomName: string;
}

export interface PartyUpdatePayload {
  message?: string;
  party: Party | null;
  partyId?: string;
}

export type PartyEffect =
  | { type: "joinRoom"; socketId: string; room: string }
  | { type: "leaveRoom"; socketId: string; room: string }
  /** The player now belongs to this party (null: none). */
  | { type: "setPartyId"; playerId: string; partyId: string | null }
  | {
      type: "partyUpdate";
      to: { room: string } | { socketId: string };
      payload: PartyUpdatePayload;
    }
  | { type: "error"; socketId: string; message: string }
  /** `message` emitted with no payload. */
  | { type: "emptyMessage"; socketId: string }
  | { type: "partyInvite"; socketId: string; inviterId: string; partyId: string };

export interface PartyResult {
  state: PartyState;
  effects: PartyEffect[];
}

export function createPartyState(): PartyState {
  return { parties: [] };
}

export function getParty(state: PartyState, partyId: string | null | undefined) {
  return state.parties.find((party) => party?.id === partyId);
}

export function isPartyMember(state: PartyState, partyId: string | null | undefined, id: string) {
  return Boolean(getParty(state, partyId)?.members.some((member) => member.id === id));
}

/**
 * Who shares a kill by `id`: their party members in the same room, or just themselves when
 * they have no party.
 */
export function sharedRecipientIds(
  state: PartyState,
  { partyId, id, roomName }: { partyId?: string | null; id: string; roomName: string },
): string[] {
  const members = getParty(state, partyId)?.members || [{ id, roomName }];
  return members.filter((member) => member.roomName === roomName).map((member) => member.id);
}

/** How party messages name a player, even one without a profile name. */
function displayName(player: PartyPlayer | undefined) {
  return player?.userName || "A player";
}

function replaceParty(state: PartyState, party: Party): PartyState {
  return { parties: state.parties.map((p) => (p.id === party.id ? party : p)) };
}

function withoutParty(state: PartyState, partyId: string): PartyState {
  return { parties: state.parties.filter((p) => p.id !== partyId) };
}

function addMember(party: Party, id: string, isLeader: boolean, roomName: string): Party {
  const members = party.members.some((m) => m.id === id)
    ? party.members
    : [...party.members, { id, isLeader, roomName }];
  return { ...party, members, invitees: party.invitees.filter((i) => i.id !== id) };
}

/** Start a party with `leader` in it (or empty when the leader is unknown). */
function createParty(
  state: PartyState,
  leader: PartyPlayer | undefined,
  partyId: string,
): PartyResult & { party: Party } {
  let party: Party = { id: partyId, members: [], invitees: [], socketRoom: `party:${partyId}` };
  let next: PartyState = { parties: [...state.parties, party] };
  const effects: PartyEffect[] = [];
  if (leader && !leader.partyId) {
    party = addMember(party, leader.id, true, leader.roomName);
    next = replaceParty(next, party);
    effects.push(
      { type: "setPartyId", playerId: leader.id, partyId },
      { type: "joinRoom", socketId: leader.id, room: party.socketRoom },
      {
        type: "partyUpdate",
        to: { room: party.socketRoom },
        payload: { message: `${displayName(leader)} has joined the party.`, party },
      },
    );
  }
  return { state: next, effects, party };
}

/**
 * `inviter` invites `invitee` (undefined when no such player). Creates the inviter's party if
 * needed, once the invitee is known to be invitable.
 */
export function inviteToParty(
  state: PartyState,
  {
    inviter,
    inviterId,
    invitee,
    newPartyId,
  }: {
    inviter?: PartyPlayer;
    inviterId: string;
    invitee?: PartyPlayer;
    newPartyId: string;
  },
): PartyResult {
  const existing = getParty(state, inviter?.partyId);
  if (!invitee) {
    return {
      state,
      effects: [{ type: "error", socketId: inviterId, message: "Invalid player to invite." }],
    };
  }
  const inviteeInParty =
    invitee.partyId ||
    invitee.id === inviterId ||
    existing?.members.some((m) => m.id === invitee.id);
  if (inviteeInParty) {
    return {
      state,
      effects: [{ type: "error", socketId: inviterId, message: "Player is already in a party." }],
    };
  }
  let next = state;
  const effects: PartyEffect[] = [];
  let party = existing;
  if (!party) {
    const created = createParty(state, inviter, newPartyId);
    next = created.state;
    party = created.party;
    effects.push(...created.effects);
  }
  if (!party.invitees.some((i) => i.id === invitee.id)) {
    party = { ...party, invitees: [...party.invitees, { id: invitee.id, inviterId }] };
    next = replaceParty(next, party);
  }
  effects.push({ type: "partyInvite", socketId: invitee.id, inviterId, partyId: party.id });
  return { state: next, effects };
}

/** `player` accepts the invite to `partyId`. */
export function acceptPartyInvite(
  state: PartyState,
  { player, playerId, partyId }: { player?: PartyPlayer; playerId: string; partyId: string },
): PartyResult {
  const party = getParty(state, partyId);
  if (!player || !party) {
    return {
      state,
      effects: [
        {
          type: "partyUpdate",
          to: { socketId: playerId },
          payload: { message: "Could not find party.", party: null, partyId },
        },
      ],
    };
  }
  if (player.partyId === partyId) {
    return { state, effects: [{ type: "emptyMessage", socketId: playerId }] };
  }
  if (!party.invitees.some((i) => i.id === playerId)) {
    return {
      state,
      effects: [
        { type: "error", socketId: playerId, message: "You were not invited to this party." },
      ],
    };
  }
  if (player.partyId) return { state, effects: [] };
  const joined = addMember(party, playerId, false, player.roomName);
  return {
    state: replaceParty(state, joined),
    effects: [
      { type: "setPartyId", playerId, partyId },
      { type: "joinRoom", socketId: playerId, room: joined.socketRoom },
      {
        type: "partyUpdate",
        to: { room: joined.socketRoom },
        payload: { message: `${displayName(player)} has joined the party.`, party: joined },
      },
    ],
  };
}

/**
 * `player` leaves their party (also used when they disconnect). The next member becomes leader if
 * the leader left, an empty party is disbanded, and the invites they sent are withdrawn.
 */
export function leaveParty(
  state: PartyState,
  { player, playerId }: { player?: PartyPlayer; playerId: string },
): PartyResult {
  const party = getParty(state, player?.partyId);
  const effects: PartyEffect[] = [];
  let next = state;
  if (party) {
    const wasLeader = party.members.find((m) => m.id === playerId)?.isLeader;
    let members = party.members.filter((m) => m.id !== playerId);
    if (wasLeader && members.length > 0) {
      members = members.map((m, i) => (i === 0 ? { ...m, isLeader: true } : m));
    }
    const invitees = party.invitees.filter((i) => i.inviterId !== playerId);
    const remaining: Party = { ...party, members, invitees };
    next = members.length === 0 ? withoutParty(state, party.id) : replaceParty(state, remaining);
    effects.push(
      { type: "leaveRoom", socketId: playerId, room: party.socketRoom },
      {
        type: "partyUpdate",
        to: { room: party.socketRoom },
        payload: { message: `${displayName(player)} has left the party.`, party: remaining },
      },
      {
        type: "partyUpdate",
        to: { socketId: playerId },
        payload: { message: "You have left the party", party: null },
      },
    );
  }
  if (player) effects.push({ type: "setPartyId", playerId, partyId: null });
  return { state: next, effects };
}

/** A member moved to another room; tell the party. */
export function updateMemberRoom(
  state: PartyState,
  { partyId, playerId, roomName }: { partyId: string; playerId: string; roomName: string },
): PartyResult {
  const party = getParty(state, partyId);
  if (!party) return { state, effects: [] };
  const updated: Party = {
    ...party,
    members: party.members.map((m) => (m.id === playerId && roomName ? { ...m, roomName } : m)),
  };
  return {
    state: replaceParty(state, updated),
    effects: [{ type: "partyUpdate", to: { room: party.socketRoom }, payload: { party: updated } }],
  };
}
