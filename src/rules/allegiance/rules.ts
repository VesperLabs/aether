/*
 * Who fights whom. Every character is on a side: a player on their own, an owned NPC (pet or follower) on its owner's,
 * and every unowned NPC on the wild side. Hits, heals and targets all ask `areAllies`, so no feature
 * checks "is this a player" or "is this a pet" itself.
 */

/** The side every unowned NPC is on. */
const WILD_SIDE = "wild";

/** What allegiance reads from a character. */
interface SideInput {
  id: string;
  isPlayer: boolean;
  /** The player that owns this NPC, if a player owns it. */
  ownerId?: string | null;
}

/** The side a character fights for: its own id for a player, its owner's for an owned NPC, else wild. */
export function sideOf(character: SideInput): string {
  if (character.isPlayer) return character.id;
  return character.ownerId ?? WILD_SIDE;
}

/**
 * Are `a` and `b` on the same side? Two players' sides are allied when they share a party, which
 * `isPartyMember(playerA, playerB)` answers; owned NPCs share their owner's party.
 */
export function areAllies(
  a: SideInput,
  b: SideInput,
  isPartyMember: (playerA: string, playerB: string) => boolean = () => false,
): boolean {
  const sideA = sideOf(a);
  const sideB = sideOf(b);
  if (sideA === sideB) return true;
  if (sideA === WILD_SIDE || sideB === WILD_SIDE) return false;
  return isPartyMember(sideA, sideB);
}
