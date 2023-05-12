import crypto from "crypto";
import { Socket } from "socket.io";

interface PartyMember {
  id: string;
  isLeader: boolean;
}

interface PartyInvited {
  id: string;
}

class Party {
  public id: string;
  public members: Array<PartyMember>;
  public invitees: Array<PartyInvited>;
  public socketRoom: string;

  constructor() {
    this.id = crypto.randomUUID();
    this.members = [];
    this.invitees = [];
    this.socketRoom = `party:${this.id}`;
  }
  addInvitee(id: string) {
    if (!this.hasInviteeId(id)) {
      this.invitees.push({ id });
    }
  }
  removeInvitee(id: string) {
    this.invitees = this.invitees.filter((invitee: PartyInvited) => invitee.id !== id);
  }
  addMember(id: string, isLeader: boolean) {
    if (!this.hasMemberId(id)) {
      this.members.push({ id, isLeader });
    }
    if (this.hasInviteeId(id)) {
      this.removeInvitee(id);
    }
  }
  removeMember(id: string) {
    this.members = this.members.filter((member: PartyMember) => member.id !== id);
  }
  updateMember(id: string, isLeader: boolean) {
    const member = this.members.find((member: PartyMember) => member.id === id);
    if (member) {
      member.isLeader = isLeader;
    }
  }
  hasMemberId(id: string) {
    return this.members.find((member: PartyMember) => member.id === id);
  }
  hasInviteeId(id: string) {
    return this.invitees.find((invitee: PartyInvited) => invitee.id === id);
  }
}

class PartyManager {
  public scene: ServerScene;
  public parties: Array<Party>;

  constructor(scene: ServerScene) {
    this.parties = [];
    this.scene = scene;
  }

  createParty(socket: Socket) {
    const leaderId = socket?.id;
    const player: Player = this?.scene?.players?.[leaderId];
    const party = new Party();
    socket.join(party.socketRoom);
    party.addMember(leaderId, true);
    player.partyId = party.id;
    this.parties.push(party);
    return party;
  }

  removeSocketFromParty(socket: Socket) {
    const playerId = socket?.id;
    const player: Player = this?.scene?.players?.[playerId];
    const party = this.getPartyById(player.partyId);
    if (party) {
      const isLeader = party.hasMemberId(playerId)?.isLeader;
      party.removeMember(playerId);
      player.partyId = null;
      socket.leave(party.socketRoom);
      this.broadcastPartyUpdate(party, `${player?.profile?.userName} has left the party.`);

      // If the leaving player was the leader, assign a new leader
      if (isLeader && party.members.length > 0) {
        const newLeader = party.members[0];
        newLeader.isLeader = true;
      }

      // If there are no more members in the party, remove the party
      if (party.members.length === 0) {
        this.removeParty(party.id);
      }
    }
  }

  addSocketToParty(socket: Socket, partyId: string) {
    const playerId = socket?.id;
    const player: Player = this.scene.players[playerId];
    const party = this.getPartyById(partyId);

    if (party && player && !player.partyId) {
      // Remove the player from their current party, if any
      const currentParty = this.getPartyById(player.partyId);
      if (currentParty) {
        currentParty.removeMember(playerId);
        if (currentParty.members.length === 0) {
          // If there are no more members in the current party, remove it
          this.removeParty(currentParty.id);
        }
        this.broadcastPartyUpdate(currentParty, `${player?.profile?.userName} has left the party.`);
        socket.leave(currentParty.socketRoom);
      }

      // Add the player to the new party
      party.addMember(playerId, false);
      player.partyId = party.id;
      socket.join(party.socketRoom);
      this.scene.io.to(party.socketRoom).emit("partyUpdate", {
        message: `${player?.profile?.userName} has joined the party.`,
        party,
      });
    }
  }

  private broadcastPartyUpdate(party: Party, message: string) {
    const io = this.scene.io;
    io.to(party.socketRoom).emit("partyUpdate", {
      message,
      party,
    });
  }

  private removeParty(partyId: string) {
    this.parties = this.parties.filter((party) => party.id !== partyId);
  }

  getPartyById(id: string) {
    return this.parties.find((p) => p?.id === id);
  }
}

export default PartyManager;
