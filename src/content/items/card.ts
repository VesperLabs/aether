import { actors } from "../actors/actors";
import type { ItemDefinition } from "./item-types";
import type { ModName } from "./mods";

/**
 * A monster card carries one mod. Slotting it into a blank mod slot on gear uses the card up and
 * writes its mod there. Each actor has one card, named after it; its art is
 * `public/assets/cards/<actor-id-in-kebab-case>.png`, saved from the sprite lab.
 */
export interface CardDefinition extends ItemDefinition {
  readonly base: "card";
  readonly mod: ModName;
  /** Its mob's level: what the card is worth grows with it (see `getItemCost`). */
  readonly mobLevel: number;
}

/** `iceCrab` as "ice-crab", the name its art is saved under. */
const kebab = (id: string) => id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** A mob's card: named after it, with its art, and its flavor taken from the mob itself. */
const mob = (id: string) =>
  (actors as Record<string, { flavor?: string; baseStats?: { level?: number } }>)[id];

/* The id is a plain string: typed as an actor id, the item list and the actors (whose drops name
   items) would each wait on the other's type. The card test checks every id is a real mob. */
const card = (
  id: string,
  name: string,
  mod: ModName,
): CardDefinition & { readonly texture: string } => ({
  tier: 1,
  base: "card",
  slot: "stackable",
  name: `${name} Card`,
  texture: `stackable-${kebab(id)}-card`,
  mod,
  flavor: mob(id)?.flavor,
  mobLevel: mob(id)?.baseStats?.level ?? 1,
});

/**
 * Every card, by rarity: plain mobs are common, bosses rare and up. Only mobs have cards, each
 * dropped from its own `drops`. Early mobs carry the plain stats every build wants (damage,
 * defense, its main attribute); later ones speed, elements and spells; bosses the triggers. The
 * strongest plain mods (stat steals, percent HP and MP, crit, block) wait for later mobs.
 */
export const cardItems = {
  common: {
    /* Levels 1–5: the basics */
    crabCard: card("crab", "Crab", "sturdy"),
    fishCard: card("fish", "Fish", "agile"),
    slimeCard: card("slime", "Slime", "vital"),
    raccoonCard: card("raccoon", "Raccoon", "wise"),
    hornetCard: card("hornet", "Hornet", "sharp"),
    spiderCard: card("spider", "Spider", "piercing"),
    batCard: card("bat", "Bat", "evasive"),
    /* Levels 6–11: staying power, spells, elements and speed */
    zombieCard: card("zombie", "Zombie", "mending"),
    wraithCard: card("wraith", "Wraith", "arcane"),
    mermanCard: card("merman", "Merman", "frozen"),
    orchidCard: card("orchid", "Orchid", "earthen"),
    iceCrabCard: card("iceCrab", "Ice Crab", "tideWard"),
    wolfCard: card("wolf", "Wolf", "hasty"),
    bearCard: card("bear", "Bear", "strong"),
  },
  magic: {
    hawkwingCard: card("hawkwing", "Hawkwing", "lucky"),
  },
  rare: {
    hoganCard: card("hogan", "Hogan", "slowing"),
    chonksCard: card("chonks", "Chonks", "enduring"),
    whiteFangCard: card("whiteFang", "White Fang", "bleeding"),
    earthElementalCard: card("earthElemental", "Earth Elemental", "stunning"),
  },
  unique: {
    wyrmCard: card("wyrm", "Wyrm", "wyrmscale"),
    bigMommaCard: card("bigMomma", "Big Momma", "venomous"),
  },
} as const;
