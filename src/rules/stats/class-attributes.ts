/** The four attributes every character has. */
export interface Attributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
}

/** What each class leads with. A cleric splits its lead between mind and body. */
const LEADS: Record<string, Partial<Record<keyof Attributes, number>>> = {
  warrior: { strength: 1 },
  rogue: { dexterity: 1 },
  mage: { intelligence: 1 },
  cleric: { intelligence: 0.5, vitality: 0.5 },
};

/** Every attribute is the level plus this, so each class has its level in every stat. */
const OFF_STAT_BONUS = 1;
/** A class's lead stat gets this much more at level 1 ... */
const LEAD_START = 2;
/** ... and this much more each level after, so the gap grows slowly (6 ahead at level 17). */
const LEAD_PER_LEVEL = 0.25;

/**
 * A class's attributes at a level: the level (plus one) in each, and its lead stat a little ahead.
 * Item requirements ask for up to the item's level (see `scaleRequirements` in item-catalog.ts),
 * so anyone can use any item at the level it drops; the lead class just clears it with room to
 * spare. New characters and level-ups both come from here, so they never disagree.
 */
export function classAttributes(level: number, charClass?: string): Attributes {
  const lead = LEAD_START + LEAD_PER_LEVEL * (Math.max(1, level) - 1);
  const shares = LEADS[charClass ?? ""] ?? {};
  const stat = (name: keyof Attributes) =>
    level + OFF_STAT_BONUS + Math.round(lead * (shares[name] ?? 0));
  return {
    strength: stat("strength"),
    dexterity: stat("dexterity"),
    intelligence: stat("intelligence"),
    vitality: stat("vitality"),
  };
}
