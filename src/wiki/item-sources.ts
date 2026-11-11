import mapLoots from "virtual:map-loots";
import { actors, findDefinition, mapTitle, questList, type ActorDefinition } from "@/content";

/**
 * Where a player can get an item: monsters that drop it, keepers that sell it, quests that give
 * it, and maps that spawn it on the ground.
 */
export interface ItemSources {
  drops: { name: string; chance: number; race?: string; tint?: string }[];
  sellers: string[];
  quests: string[];
  spawns: { map: string; chance: number }[];
}

type Ref = readonly [string, string, string] | readonly string[];

/* Keyed where the item is written, so a rolled magic or rare ref counts for its common item. */
const refKey = ([type, rarity, key]: Ref) =>
  [type, findDefinition(type, rarity, key).definedRarity, key].join("/");

/** Every item's sources, keyed `type/rarity/key`. Built once from the content. */
const SOURCES = new Map<string, ItemSources>();

const sourcesOf = (key: string) => {
  let sources = SOURCES.get(key);
  if (!sources) {
    sources = { drops: [], sellers: [], quests: [], spawns: [] };
    SOURCES.set(key, sources);
  }
  return sources;
};

for (const actor of Object.values(actors as Record<string, ActorDefinition>)) {
  for (const drop of actor.drops ?? []) {
    sourcesOf(refKey([drop.type, drop.rarity, drop.key])).drops.push({
      name: actor.profile.userName,
      chance: drop.chance,
      race: actor.profile.race,
      tint: actor.profile.tint,
    });
  }
  for (const entry of actor.shop ?? []) {
    sourcesOf(refKey(entry.item as Ref)).sellers.push(actor.profile.userName);
  }
}

for (const quest of Object.values(questList)) {
  for (const item of (quest as { rewards?: { items: readonly Ref[] } }).rewards?.items ?? []) {
    sourcesOf(refKey(item)).quests.push(quest.name);
  }
}

for (const [map, items] of Object.entries(mapLoots)) {
  for (const item of items) {
    sourcesOf(refKey([item.type, item.rarity, item.key])).spawns.push({
      map: mapTitle(map),
      chance: item.chance,
    });
  }
}

/** Where to get the item `type/rarity/key`, or `undefined` when nothing in the game gives it. */
export function itemSources(type: string, rarity: string, key: string): ItemSources | undefined {
  return SOURCES.get(`${type}/${rarity}/${key}`);
}
