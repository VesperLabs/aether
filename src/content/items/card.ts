import { actorDefs } from "../actors/actor-defs";
import type { ItemDrop } from "./item-refs";
import type { ItemDefinition } from "./item-types";
import type { ModName } from "./mods";

/**
 * A monster card carries one mod. Slotting it into a blank mod slot on gear uses the card up and
 * writes its mod there. Each mob has one card, named after it; its art is
 * `public/assets/cards/<actor id>.png`, saved from the sprite lab. Its actor drops it on its own:
 * no actor lists its card (see `CARD_DROPS`).
 */
export interface CardDefinition extends ItemDefinition {
  readonly base: "card";
  readonly mod: ModName;
  /** Its mob's level: what the card is worth grows with it (see `getItemCost`). */
  readonly mobLevel: number;
}

/** A mob as its card reads it: its name, flavor and level. */
const mob = (id: string) =>
  (
    actorDefs as Record<
      string,
      { flavor?: string; baseStats?: { level?: number }; profile?: { userName?: string } }
    >
  )[id];

/* The id is a plain string: typed as an actor id, the item list and the actors (whose drops name
   items) would each wait on the other's type. The card test checks every id is a real mob. */
const card = (id: string, mod: ModName): CardDefinition & { readonly texture: string } => ({
  tier: 1,
  base: "card",
  slot: "stackable",
  name: `${mob(id)?.profile?.userName ?? id} Card`,
  texture: `stackable-${id}-card`,
  mod,
  flavor: mob(id)?.flavor,
  mobLevel: mob(id)?.baseStats?.level ?? 1,
});

/**
 * Every card, by rarity: plain mobs are common, bosses rare and up. Only mobs have cards; the
 * rarity sets how often its mob drops it (`CARD_DROPS`). Early mobs carry the plain stats every build wants (damage,
 * defense, its main attribute); later ones speed, elements and spells; bosses the triggers. The
 * strongest plain mods (stat steals, percent HP and MP, crit, block) wait for later mobs.
 */
export const cardItems = {
  common: {
    /* Levels 1–5: the basics */
    crabCard: card("crab", "sturdy"),
    fishCard: card("fish", "agile"),
    slimeCard: card("slime", "vital"),
    raccoonCard: card("raccoon", "wise"),
    hornetCard: card("hornet", "sharp"),
    spiderCard: card("spider", "piercing"),
    batCard: card("bat", "evasive"),
    /* Levels 6–11: staying power, spells, elements and speed */
    zombieCard: card("zombie", "mending"),
    wraithCard: card("wraith", "arcane"),
    mermanCard: card("merman", "frozen"),
    orchidCard: card("orchid", "earthen"),
    iceCrabCard: card("iceCrab", "tideWard"),
    wolfCard: card("wolf", "hasty"),
    bearCard: card("bear", "strong"),
  },
  magic: {
    hawkwingCard: card("hawkwing", "lucky"),
  },
  rare: {
    hoganCard: card("hogan", "slowing"),
    chonksCard: card("chonks", "enduring"),
    whiteFangCard: card("whiteFang", "bleeding"),
    earthElementalCard: card("earthElemental", "stunning"),
  },
  unique: {
    wyrmCard: card("wyrm", "wyrmscale"),
    bigMommaCard: card("bigMomma", "venomous"),
  },
} as const;

/** How often a mob drops its card, out of `chance` (1 in N), by the card's rarity. */
const DROP_CHANCE: Record<keyof typeof cardItems, number> = {
  common: 40,
  magic: 100,
  rare: 200,
  unique: 500,
};

/** Each mob's card drop, by actor id: its card is `<id>Card`. */
export const CARD_DROPS: ReadonlyMap<string, ItemDrop> = new Map(
  (Object.keys(cardItems) as (keyof typeof cardItems)[]).flatMap((rarity) =>
    Object.keys(cardItems[rarity]).map((key) => [
      key.replace(/Card$/, ""),
      { item: key as ItemDrop["item"], chance: DROP_CHANCE[rarity] },
    ]),
  ),
);
