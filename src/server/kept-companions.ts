import { getPublicCharacterState } from "@/network/sync";
import { MAX_COMPANIONS, type SavedCompanion } from "@/rules/capture";
import type { System } from "@/rules/world";
import { makeCompanion, removeNpc } from "./companions";
import { spawnNpc } from "./game-world";
import { broadcastPlayerUpdate } from "./net/room-broadcast";
import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";

/*
 * Kept companions: the ones a player caught with a ball are saved to their account. They come out
 * with them when they log in unless put away, can be put away and brought out again (the Social
 * menu's Companions tab, or `/companion`), released for good, and are lost when they die. Pets from
 * `/npc spawn ... pet` and `/npc tame` are temporary: never saved, never counted, and they respawn.
 * A kept companion out in the world carries its saved entry's id as `state.keptId`.
 */

/** A dead companion stays this long so its death plays, then leaves. */
const DEATH_LINGER_MS = 1500;

/** What a player is told when they have no room for another companion. */
export const COMPANIONS_FULL =
  MAX_COMPANIONS === 1
    ? "You already have a companion."
    : `You already have ${MAX_COMPANIONS} companions.`;

/** Whether `player` has room for another companion. */
export const canKeepCompanion = (player: Player) => player.companions.length < MAX_COMPANIONS;

/** Saves the owner's companions and shows them the change. */
function saveCompanions(owner: Player, companions: SavedCompanion[]) {
  owner.companions = companions;
  owner.world.db.updateUser(owner);
  broadcastPlayerUpdate(owner.world, owner);
}

/** Saves a freshly caught companion to its owner's account. */
export function keepCompanion(owner: Player, npc: Npc) {
  const id = owner.world.dice.newId();
  npc.state.keptId = id;
  saveCompanions(owner, [...owner.companions, { id, name: npc.name }]);
}

/** The kept companion out in the world for a saved entry, if it is out. */
const outInWorld = (world: ServerWorld, id: string) =>
  Object.values(world.npcs).find((npc) => npc.state?.keptId === id);

/** Spawns one saved companion at its owner's feet and tells the room. */
function bringOut(world: ServerWorld, owner: Player, { id, name }: SavedCompanion) {
  const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
  if (!room || outInWorld(world, id)) return undefined;
  const properties = [{ name: "keptId", value: id }];
  const pet = spawnNpc(world, room, { name, x: owner.x, y: owner.y, properties });
  if (!pet) return undefined;
  makeCompanion(pet, owner);
  /* The owner gets it in their room state on login; everyone already there hears now */
  world.io.to(room.name).emit("npcJoin", getPublicCharacterState(pet));
  return pet;
}

/**
 * Brings out the owner's saved companions that aren't out yet, at their feet. On login (before
 * their room is sent) only the ones not put away; with `everyone`, the put-away ones too.
 * Returns the ones brought out.
 */
export function bringOutCompanions(world: ServerWorld, owner: Player, { everyone = false } = {}) {
  /* Saves from before companions had ids get them now */
  owner.companions = owner.companions.map((saved) =>
    saved.id ? saved : { ...saved, id: world.dice.newId() },
  );
  const brought = owner.companions
    .filter((saved) => everyone || !saved.isAway)
    .map((saved) => bringOut(world, owner, saved))
    .filter((pet): pet is Npc => !!pet);
  if (everyone && owner.companions.some((saved) => saved.isAway)) {
    saveCompanions(
      owner,
      owner.companions.map(({ isAway: _, ...saved }) => saved),
    );
  }
  return brought;
}

/** Puts every companion the owner has out away: out of the world, still saved. Returns how many. */
export function putAwayCompanions(world: ServerWorld, owner: Player) {
  const out = owner.companions.filter((saved) => {
    const pet = outInWorld(world, saved.id);
    return pet && !pet.state.isDead;
  });
  if (out.length === 0) return 0;
  for (const saved of out) removeNpc(outInWorld(world, saved.id) as Npc);
  const ids = out.map((saved) => saved.id);
  saveCompanions(
    owner,
    owner.companions.map((saved) => (ids.includes(saved.id) ? { ...saved, isAway: true } : saved)),
  );
  return out.length;
}

/** Brings one saved companion out, or puts it away if it is out. */
export function toggleCompanion(world: ServerWorld, owner: Player, id: string) {
  const saved = owner.companions.find((companion) => companion.id === id);
  if (!saved) return;
  const pet = outInWorld(world, id);
  if (pet?.state.isDead) return;
  if (pet) removeNpc(pet);
  else bringOut(world, owner, saved);
  saveCompanions(
    owner,
    owner.companions.map((companion) =>
      companion.id === id ? { id, name: companion.name, ...(pet && { isAway: true }) } : companion,
    ),
  );
}

/** Lets one saved companion go for good: it leaves the world and the owner's account. */
export function releaseCompanion(world: ServerWorld, owner: Player, id: string) {
  if (!owner.companions.some((companion) => companion.id === id)) return;
  const pet = outInWorld(world, id);
  if (pet) removeNpc(pet);
  saveCompanions(
    owner,
    owner.companions.filter((companion) => companion.id !== id),
  );
}

/** Takes a dead kept companion off its owner's account, once. */
function forgetCompanion(world: ServerWorld, npc: Npc) {
  npc.state.isLost = true;
  const owner = npc.state.ownerId ? world.players[npc.state.ownerId] : undefined;
  const { keptId } = npc.state;
  if (!owner?.companions.some((saved) => saved.id === keptId)) return;
  saveCompanions(
    owner,
    owner.companions.filter((saved) => saved.id !== keptId),
  );
}

/**
 * A kept companion that dies is lost: off its owner's account at once, out of the world once its
 * death has played. Temporary pets (`/npc spawn ... pet`) respawn like anyone else.
 */
export const loseDeadCompanions: System<ServerWorld> = (world) => {
  const now = world.now();
  for (const npc of Object.values(world.npcs)) {
    if (!npc.state?.keptId || !npc.state.isDead) continue;
    if (!npc.state.isLost) forgetCompanion(world, npc);
    if (now - npc.state.deadTime >= DEATH_LINGER_MS) removeNpc(npc);
  }
};
