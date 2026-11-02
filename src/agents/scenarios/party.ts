import type { Scenario } from "./scenario";

export const party: Scenario = {
  name: "party",
  description: "three agents form a party, the leader changes room, one leaves",
  async run({ spawn, log, check }) {
    const leader = await spawn("Agent Leader");
    const second = await spawn("Agent Two");
    const third = await spawn("Agent Three");

    const partyId = await leader.inviteToParty(second);
    check((await leader.inviteToParty(third)) === partyId, "both bots join the leader's party");

    const from = leader.senses.roomName;
    const to = from === "town" ? "grassland" : "town";
    log(`leader warps from ${from} to ${to}`);
    const heard = second.waitFor(
      "partyUpdate",
      (u) => !!u.party?.members.some((m) => m.id === leader.id && m.roomName === to),
    );
    await leader.cheat(`/warp ${to}`);
    check(!!(await heard.catch(() => null)), "party members hear the leader changed room");

    const left = second.waitFor(
      "partyUpdate",
      (u) => !u.party?.members.some((m) => m.id === third.id),
    );
    third.leaveParty();
    check(!!(await left.catch(() => null)), "party members hear a bot left");
  },
};
