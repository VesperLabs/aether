import type { FamilyName } from "./gear-data";
import type { UniqueDefinition } from "./gear-types";
import { sumMods, type ModName, type ScaledMod } from "./mods";

/** A piece of a set: a unique without its own tier, since every piece sits in the set's. */
type SetPiece = Omit<UniqueDefinition<FamilyName>, "tier">;

/**
 * Gear made to be worn together. Every piece sits in the set's one tier, has 4 slots and its
 * own fixed mod, and wearing them all adds the bonus mods, scaled by the same tier.
 */
interface ItemSetDefinition {
  readonly name: string;
  readonly tier: number;
  readonly bonus: readonly ModName[];
  readonly pieces: Readonly<Record<string, SetPiece>>;
}

export const itemSetList = {
  chets: {
    name: "Chet's Leisureware",
    tier: 1,
    bonus: ["vital", "wise", "mending"],
    pieces: {
      chetsPurpleShirt: {
        family: "robe",
        name: "Chet's Purple Shirt",
        flavor: "Chet's lucky shirt. He's never lost a game in it.",
        tint: "0x8800FF",
        mod: "vital",
      },
      chetsNeonKicks: {
        family: "boots",
        name: "Chet's Neon Kicks",
        flavor: "So bright the monsters see you coming. Chet doesn't care.",
        tint: "0x00FF00",
        mod: "swift",
      },
      chetsChampions: {
        family: "pants",
        name: "Chet's Champions",
        flavor: "Chet's championship shorts. The stains are trophies.",
        tint: "0x6666DD",
        mod: "mending",
      },
    },
  },
  cids: {
    name: "El Cid's Swords",
    tier: 2,
    bonus: ["precise", "blocking", "slowing"],
    pieces: {
      tizona: {
        family: "sword",
        name: "Tizona",
        flavor: "Twin of Colada. Its bearer was never beaten by a single foe.",
        texture: "weapon-sword-tizona",
        mod: "precise",
      },
      colada: {
        family: "sword",
        name: "Colada",
        flavor: "Twin of Tizona. The pair cut cleaner together.",
        texture: "weapon-sword-colada",
        mod: "blocking",
      },
    },
  },
  crab: {
    name: "Crustacean Chic",
    tier: 1,
    bonus: ["swift", "tideWard", "lucky"],
    pieces: {
      crabHat: {
        family: "cap",
        name: "Crab Hat",
        flavor: "The Crab Warden's colours. Trista would approve.",
        texture: "helmet-crab",
        mod: "sturdy",
        exclusive: true,
      },
      crabWalkers: {
        family: "boots",
        name: "Crab Walkers",
        flavor: "Walk sideways with pride. Trista wears a pair herself.",
        tint: "0xFF6600",
        mod: "tideWard",
        exclusive: true,
      },
    },
  },
  hawkwings: {
    name: "Hawkwing's Arms",
    tier: 1,
    bonus: ["agile", "swift", "evasive"],
    pieces: {
      hawkwingsPincher: {
        family: "scythe",
        name: "Hawkwing's Pincher",
        flavor: "Hawkwing's claw-blade, for catching what tries to fly away.",
        tint: "0x99CC66",
        mod: "earthen",
      },
      hawkwingsHood: {
        family: "hood",
        name: "Hawkwing's Hood",
        flavor: "Hawkwing's hood, feathered to break the wind.",
        tint: "0x99CC66",
        mod: "stoneWard",
      },
    },
  },
  timmys: {
    name: "Timmy's Sofa Cache",
    tier: 2,
    bonus: ["precise", "swift", "strong"],
    pieces: {
      timmysSignet: {
        family: "ring",
        name: "Timmy's Signet",
        flavor: "Timmy's signet. He stamped it on everything he owned.",
        texture: "ring-silver-sapphire",
        mod: "strong",
      },
      timmysChain: {
        family: "amulet",
        name: "Timmy's Chain",
        flavor: "Timmy's chain, matched to his signet.",
        mod: "sanguine",
      },
    },
  },
} as const satisfies Readonly<Record<string, ItemSetDefinition>>;

type ItemSetName = keyof typeof itemSetList;

export type SetPieceKey = {
  [S in ItemSetName]: keyof (typeof itemSetList)[S]["pieces"];
}[ItemSetName];

/** A worn set's bonus: its name, how many pieces it needs, and its bonus mods at its tier. */
export interface SetBonus extends ScaledMod {
  name: string;
  pieces: number;
}

export function getSetBonus(setName: string): SetBonus | undefined {
  const set: ItemSetDefinition | undefined = itemSetList[setName as ItemSetName];
  if (!set) return undefined;
  return {
    name: set.name,
    pieces: Object.keys(set.pieces).length,
    ...sumMods(set.bonus, set.tier),
  };
}
