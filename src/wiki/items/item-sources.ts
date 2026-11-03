import { keepers, nasties, questList } from "@/content";

/** Where a player can get an item: monsters that drop it, keepers that sell it, quests that give it. */
export interface ItemSources {
  drops: { name: string; chance: number; race?: string; tint?: string }[];
  sellers: string[];
  quests: string[];
}

type Ref = readonly [string, string, string] | readonly string[];

const refKey = (ref: Ref) => ref.slice(0, 3).join("/");

/** Every item's sources, keyed `type/rarity/key`. Built once from the content. */
const SOURCES = new Map<string, ItemSources>();

const sourcesOf = (key: string) => {
  let sources = SOURCES.get(key);
  if (!sources) {
    sources = { drops: [], sellers: [], quests: [] };
    SOURCES.set(key, sources);
  }
  return sources;
};

for (const mob of Object.values(nasties)) {
  for (const drop of (
    mob as { drops?: readonly { type: string; rarity: string; key: string; chance: number }[] }
  ).drops ?? []) {
    sourcesOf(refKey([drop.type, drop.rarity, drop.key])).drops.push({
      name: mob.profile.userName,
      chance: drop.chance,
      race: mob.profile.race,
      tint: (mob.profile as { tint?: string }).tint,
    });
  }
}

for (const keeper of Object.values(keepers)) {
  for (const entry of (keeper.keeperData as { shop?: readonly { item: Ref }[] }).shop ?? []) {
    sourcesOf(refKey(entry.item)).sellers.push(keeper.profile.userName);
  }
}

for (const quest of Object.values(questList)) {
  for (const item of (quest as { rewards?: { items: readonly Ref[] } }).rewards?.items ?? []) {
    sourcesOf(refKey(item)).quests.push(quest.name);
  }
}

/** Where to get the item `type/rarity/key`, or `undefined` when nothing in the game gives it. */
export function itemSources(type: string, rarity: string, key: string): ItemSources | undefined {
  return SOURCES.get(`${type}/${rarity}/${key}`);
}
