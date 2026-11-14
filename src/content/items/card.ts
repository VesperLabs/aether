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
}

const card = (
  file: string,
  name: string,
  mod: ModName,
  flavor: string,
): CardDefinition & { readonly texture: string } => ({
  tier: 1,
  base: "card",
  slot: "stackable",
  name: `${name} Card`,
  texture: `stackable-${file}-card`,
  mod,
  flavor,
});

/** Every card, by rarity: plain mobs are common, keepers magic, bosses magic and up. */
export const cardItems = {
  common: {
    catCard: card("cat", "Cat", "agile", "Light on its feet, and never where you swing."),
    dogCard: card("dog", "Dog", "swift", "Always first to the gate, tail going."),
    crabCard: card("crab", "Crab", "sturdy", "A shell's worth of stubbornness."),
    raccoonCard: card("raccoon", "Raccoon", "lucky", "The bandit always finds the good stuff."),
    slimeCard: card("slime", "Slime", "mending", "It soaks up anything, wounds included."),
    hornetCard: card("hornet", "Hornet", "hasty", "Fast, angry and never still."),
    fishCard: card("fish", "Fish", "evasive", "Slippery, and it knows it."),
    spiderCard: card("spider", "Spider", "piercing", "Fangs that find the gap in any armour."),
    batCard: card("bat", "Bat", "leeching", "It always goes for the neck."),
    zombieCard: card("zombie", "Zombie", "vital", "Slow, stupid and very hard to keep down."),
    wraithCard: card("wraith", "Wraith", "siphoning", "It steals the warmth, then the will."),
    mermanCard: card("merman", "Merman", "frozen", "The river's cold, carried in a blade."),
    orchidCard: card("orchid", "Orchid", "earthen", "Pretty, rooted and full of teeth."),
    wolfCard: card("wolf", "Wolf", "sharp", "Grey teeth, honed on the peaks."),
    bearCard: card("bear", "Bear", "strong", "Never get between it and anything."),
    iceCrabCard: card("ice-crab", "Ice Crab", "tideWard", "Cold water rolls right off it."),
  },
  magic: {
    hawkwingCard: card("hawkwing", "Hawkwing", "adrenal", "The rush of the hunt, on prized wings."),
    tristaCard: card("trista", "Trista", "blocking", "The Crab Warden stands like a shell."),
    sergioCard: card("sergio", "Sergio", "radiant", "The light of a lost river valley."),
    tudwickCard: card("tudwick", "Tudwick", "stoneWard", "Rangers sleep on rocks. It shows."),
    lynneCard: card("lynne", "Lynne", "precise", "She always gets the shot."),
    anthonyCard: card(
      "anthony",
      "Anthony",
      "sanguine",
      "Every cured meat, every bit of it, in you.",
    ),
    steveCard: card("steve", "Steve", "fiery", "Still warm off the anvil."),
    siobhanCard: card("siobhan", "Siobhan", "focused", "A calm mind, steeped like a good brew."),
    dannyCard: card("danny", "Danny", "arcane", "Theatrical, but the magic is real."),
    raeCard: card("rae", "Rae", "lunar", "A naturalist's patience, bottled."),
    aleCard: card("ale", "Ale", "wise", "A clear head, pressed from good apples."),
    derekCard: card("derek", "Derek", "flameWard", "Sat by the only campfire on the peaks."),
  },
  rare: {
    hoganCard: card("hogan", "Hogan", "slowing", "Webs thick as rope, and you're in them."),
    chonksCard: card("chonks", "Chonks", "enduring", "The more you hit it, the bigger it gets."),
    whiteFangCard: card(
      "white-fang",
      "White Fang",
      "bleeding",
      "The pack leader never misses twice.",
    ),
    earthElementalCard: card(
      "earth-elemental",
      "Earth Elemental",
      "stunning",
      "Living stone that hits like a landslide.",
    ),
  },
  unique: {
    wyrmCard: card("wyrm", "Wyrm", "wyrmscale", "Scales worth a fortune, and harder than steel."),
    bigMommaCard: card(
      "big-momma",
      "Big Momma",
      "venomous",
      "Every orchid in the valley started here.",
    ),
  },
} as const;
