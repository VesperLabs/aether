/** Loot rules: what a kill drops, what is lying on the ground, when it expires, who can grab it. */

/** Milliseconds a drop stays on the ground before it expires. */
export const LOOT_EXPIRE_TIME = 600000; // 10 min
/** Milliseconds an expired drop stays on the server so every client sees it expire. */
export const LOOT_BUFFER_DELETE_TIME = 2000;
/** Milliseconds between two spawn cycles of the loot placed on a map. */
export const LOOT_SPAWN_CYCLE_TIME = 300000; // 5 min

/** Returns a number in [0, 1), like `Math.random`. Injected so rules are deterministic in tests. */
export type Rng = () => number;

/** The part of an item that loot rules read. */
export interface LootItem {
  id?: string;
  type?: string;
  rarity?: string;
  amount?: number | string;
}

/** A reference to an item to build: an entry in a mob's drop table or a rolled main drop. */
export interface DropCandidate {
  type: string;
  rarity: string;
  key: string;
}

/** An entry in a mob's drop table. `chance` is the "1 in N" odds. */
export interface DropTableEntry extends DropCandidate {
  chance: number;
}

/** An item lying on the ground. */
export interface Loot {
  id: string;
  roomName: string;
  x: number;
  y: number;
  item: LootItem;
  dropTime: number;
  expiredSince?: number;
  texture?: string;
  grabMessage?: boolean;
  isPermanent?: boolean;
}

/** Asks for a new drop on the ground. */
export interface LootSpawn {
  x?: number;
  y?: number;
  item?: LootItem | null;
  /** Set when the drop pops out of an npc, so clients can animate it. */
  npcId?: string | null;
  /** Custom texture for how it shows on the map. */
  texture?: string;
  grabMessage?: boolean;
  isPermanent?: boolean;
}

/** `Math.floor(rng() * (max - min + 1)) + min`, or `min` when the range is empty. */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Of several rolled drops, the one that is dropped: the first of a valuable rarity or a
 * non-stackable type, otherwise the last one.
 */
export function pickPreferredDrop<T extends { rarity?: string; type?: string }>(
  runners: T[],
): T | null {
  let item: T | null = null;
  for (const runner of runners) {
    item = runner;
    if (runner.rarity == "unique") break;
    if (runner.rarity == "set") break;
    if (runner.rarity == "rare") break;
    if (runner.rarity == "magic") break;
    if (runner.type !== "stackable") break;
  }
  return item;
}

/** Item level of the drops of a mob. I.e. a lvl 8 mob drops ilvl 2 items, a lvl 16 mob ilvl 3. */
export function dropItemLevel(mobLevel: number, ilvlMultiplier: number): number {
  return 1 + Math.floor(mobLevel / ilvlMultiplier);
}

/** Everything a mob kill needs to roll a drop. */
export interface MobDropInput {
  mobLevel: number;
  magicFind: number;
  /** Mobs flagged this way skip the world drop and only use their own table. */
  noWorldDrops?: boolean;
  drops?: DropTableEntry[];
  /** Multiplier from item level to mob level, see `dropItemLevel`. */
  ilvlMultiplier: number;
}

/**
 * Rolls what a killed mob drops: one world drop (skipped for `noWorldDrops` mobs) plus each entry
 * of the mob's own table that hits, then picks one by `pickPreferredDrop`.
 * `rollWorldDrop` is the item roll for (item level, magic find).
 */
export function rollMobDrop(
  input: MobDropInput,
  rng: Rng,
  rollWorldDrop: (ilvl: number, magicFind: number) => DropCandidate | null,
): DropCandidate | null {
  const runners: DropCandidate[] = [];
  const ilvl = dropItemLevel(input.mobLevel, input.ilvlMultiplier);

  if (!input.noWorldDrops) {
    const mainDrop = rollWorldDrop(ilvl, input.magicFind);
    if (mainDrop) runners.push(mainDrop);
  }
  if (input.drops) {
    for (const entry of input.drops) {
      if (randomInt(rng, 1, entry.chance) === 1) runners.push(entry);
    }
  }
  return pickPreferredDrop(runners);
}

/**
 * The loot lying on the ground for a spawn request, or null if the request is incomplete
 * (no position or no item). `id` and `now` are given so the rule stays pure.
 */
export function createLoot(
  spawn: LootSpawn | undefined,
  context: { id: string; roomName: string; now: number },
): Loot | null {
  const { x, y, item, texture, grabMessage = true, isPermanent } = spawn ?? {};
  if (!x || !y || !item) return null;
  return {
    id: context.id,
    roomName: context.roomName,
    x,
    y,
    item,
    dropTime: context.now,
    texture,
    grabMessage,
    isPermanent,
  };
}

export interface LootExpiry {
  /** Loot that just ran out of time: stamp its `expiredSince`. */
  markExpired: string[];
  /** Loot that has been expired long enough for clients to see it go: delete it. */
  remove: string[];
}

/** What changes for the loot on the ground at `now`. Permanent loot never expires. */
export function expireLoots(loots: readonly Loot[], now: number): LootExpiry {
  const markExpired: string[] = [];
  const remove: string[] = [];
  for (const loot of loots) {
    let expiredSince = loot.expiredSince;
    if (now - loot.dropTime > LOOT_EXPIRE_TIME && !expiredSince && !loot.isPermanent) {
      markExpired.push(loot.id);
      expiredSince = now;
    }
    // Give the expired loot a bit of time to reach all users before it is wiped from the server.
    if (expiredSince && now - expiredSince > LOOT_BUFFER_DELETE_TIME) remove.push(loot.id);
  }
  return { markExpired, remove };
}

/** A spot on a map where loot respawns, with the items that can appear there. */
export interface MapLoot {
  id?: number;
  x?: number;
  y?: number;
  items: MapLootItem[];
}

export interface MapLootItem {
  type: string;
  rarity: string;
  key: string;
  /** "1 in N" odds. */
  chance: number;
  /** [min, max] stack size. */
  amount?: [number, number];
}

/** Reads the map's "Loots" object layer. Each object's first property holds the item list as JSON. */
export function parseMapLootList(
  objects:
    | readonly {
        id?: number;
        x?: number;
        y?: number;
        properties?: { value?: unknown }[];
      }[]
    | undefined,
): MapLoot[] {
  if (!objects) return [];
  return objects.map((loot) => ({
    id: loot.id,
    x: loot.x,
    y: loot.y,
    items: JSON.parse(String(loot.properties?.[0]?.value)),
  }));
}

/** True once a map's loot is due to spawn again. */
export function isMapLootDue(now: number, lastSpawn: number): boolean {
  return now - lastSpawn > LOOT_SPAWN_CYCLE_TIME;
}

/**
 * The permanent loot to place on a map this cycle. Spots that already hold permanent loot are
 * skipped. `buildItem` turns an item reference into an item (and may return null).
 */
export function planMapLootSpawns(
  mapLootList: readonly MapLoot[],
  existing: readonly Pick<Loot, "x" | "y" | "isPermanent">[],
  rng: Rng,
  buildItem: (type: string, rarity: string, key: string, amount?: number) => LootItem | null,
): LootSpawn[] {
  const spawns: LootSpawn[] = [];
  for (const mapLoot of mapLootList) {
    const taken = (l: { x?: number; y?: number; isPermanent?: boolean }) =>
      l.x === mapLoot.x && l.y === mapLoot.y && l.isPermanent;
    // do not spawn if there is already a perm loot here
    if (existing.some(taken) || spawns.some(taken)) continue;

    const runners: LootItem[] = [];
    for (const mapItem of mapLoot.items) {
      if (randomInt(rng, 1, mapItem.chance) === 1) {
        // decide how many to spawn randomly.
        const amount = randomInt(rng, mapItem.amount?.[0] as number, mapItem.amount?.[1] as number);
        const built = buildItem(mapItem.type, mapItem.rarity, mapItem.key, amount);
        // An unknown item builds to null and is skipped.
        if (built) runners.push(built);
      }
    }
    const item = pickPreferredDrop(runners);
    if (item) {
      spawns.push({
        x: mapLoot.x,
        y: mapLoot.y,
        texture: "loot-anim-sparkle",
        isPermanent: true,
        item,
      });
    }
  }
  return spawns;
}

/** What a grab attempt amounts to. */
export type GrabOutcome =
  /** Nothing happens: the loot is gone or expired, or the grabber can't pick up. */
  | "ignore"
  /** The item is added to a stack the grabber already has. */
  | "stack"
  /** The item goes into a free inventory slot. */
  | "pickup"
  /** There is no room; the loot stays on the ground. */
  | "inventoryFull";

/** The client only sends a grab within 32px of the loot; the extra 32px forgives latency and movement. */
export const LOOT_GRAB_RANGE = 64;

export interface GrabInput {
  /** The loot being grabbed, if it still exists. */
  loot?: {
    item?: LootItem | null;
    expiredSince?: number;
    roomName?: string;
    x?: number;
    y?: number;
  } | null;
  /** Where the grabber stands. When given, the grab must be in the loot's room and in range. */
  grabberPosition?: { roomName?: string; x: number; y: number };
  /** Whether the grabber exists. */
  hasGrabber: boolean;
  grabberIsDead?: boolean;
  /** For stackable items: the grabber already holds this item (bag, abilities or inventory). */
  hasStackToJoin: boolean;
  inventoryFull: boolean;
}

export function resolveGrab(input: GrabInput): GrabOutcome {
  if (input.loot?.expiredSince) return "ignore";
  const item = input.loot?.item;
  if (!input.loot || !input.hasGrabber || !item) return "ignore";
  if (input.grabberIsDead) return "ignore";
  if (input.grabberPosition && !isInGrabRange(input.grabberPosition, input.loot)) return "ignore";
  if (item.type === "stackable" && input.hasStackToJoin) return "stack";
  return input.inventoryFull ? "inventoryFull" : "pickup";
}

function isInGrabRange(
  grabber: { roomName?: string; x: number; y: number },
  loot: { roomName?: string; x?: number; y?: number },
): boolean {
  if (grabber.roomName !== loot.roomName) return false;
  if (typeof loot.x !== "number" || typeof loot.y !== "number") return false;
  return Math.hypot(loot.x - grabber.x, loot.y - grabber.y) <= LOOT_GRAB_RANGE;
}

/** Total of two stack amounts. Either may be a string or missing. */
export function addStackAmounts(
  current: number | string | undefined | null,
  added: number | string | undefined | null,
): number {
  return parseInt(String(current || 0)) + parseInt(String(added || 0));
}
