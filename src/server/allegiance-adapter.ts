import { areAllies } from "@/rules/allegiance";
import { isPartyMember } from "@/rules/party";
import type { ServerWorld } from "./server-world";

/** What the server knows about a character's side. */
interface Sided {
  id: string;
  socketId?: string;
  kind: string;
  state?: { ownerId?: string | null } | null;
}

/** Are two live characters on the same side? Players in one party are, and so are their companions. */
export function isAlly(world: ServerWorld, a: Sided, b: Sided): boolean {
  return areAllies(toSide(a), toSide(b), (playerA, playerB) =>
    isPartyMember(world.partyState, world.players[playerA]?.partyId, playerB),
  );
}

/* Players are filed under their socket id, which is what `ownerId` holds. */
const toSide = (c: Sided) => ({
  id: c.socketId || c.id,
  isPlayer: c.kind === "player",
  ownerId: c.state?.ownerId,
});
