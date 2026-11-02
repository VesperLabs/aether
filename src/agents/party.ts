import type { AgentLink, MessageName, MessagePayload } from "./link";

/** What `inviteToParty` needs of each agent. */
export interface PartyMember {
  readonly id: string;
  readonly link: AgentLink;
  waitFor<M extends MessageName>(
    message: M,
    matches?: (payload: MessagePayload<M>) => boolean,
  ): Promise<MessagePayload<M>>;
}

/** `host` invites `guest`, who accepts. Resolves with the party id once both see it. */
export async function inviteToParty(host: PartyMember, guest: PartyMember): Promise<string> {
  const invite = guest.waitFor("partyInvite");
  host.link.send("inviteToParty", guest.id);
  const { partyId } = await invite;
  const joined = host.waitFor(
    "partyUpdate",
    (u) => !!u.party?.members.some((m) => m.id === guest.id),
  );
  guest.link.send("partyAccept", partyId);
  await joined;
  return partyId;
}
