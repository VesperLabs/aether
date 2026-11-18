import { getPublicCharacterState } from "@/network/sync";
import {
  PET_SLOTS,
  findPetSlot,
  isActiveOut,
  movePet,
  slotForCatch,
  swapTarget,
  toggleActiveAway,
  withoutPet,
  type PetSlot,
  type PetSlots,
  type SavedPet,
} from "@/rules/capture";
import type { System } from "@/rules/world";
import { makeOwned, removeNpc } from "./owned-npcs";
import { spawnNpc } from "./game-world";
import { broadcastPlayerUpdate } from "./net/room-broadcast";
import type { Npc } from "./npc";
import type { Player } from "./player";
import type { ServerWorld } from "./server-world";

/*
 * Pets: NPCs a player caught with a ball (or `/npc catch`), saved to their account in slots
 * (`rules/capture`'s pet slots). The one in the active slot is out with them; the stored ones wait.
 * Moved between slots from the Pets & Abilities menu (or `/pet`), released for good, and lost when
 * they die. Followers (`/npc spawn ... follower`, `/npc follow`) are not pets: never saved, never
 * counted, and they respawn. A pet out in the world carries its saved entry's id as `state.petId`.
 */

/** A dead pet stays this long so its death plays, then leaves. */
const DEATH_LINGER_MS = 1500;

/** What a player is told when a ball would catch something and every slot is full. */
export const PETS_FULL = `You already have ${PET_SLOTS.length} pets.`;

/** Whether `player` has a free slot for another pet. */
export const canKeepPet = (player: Player) => !!slotForCatch(player.pets);

/** Saves the owner's pets and shows them the change. */
function savePets(owner: Player, slots: PetSlots) {
  owner.pets = slots;
  owner.world.db.updateUser(owner);
  broadcastPlayerUpdate(owner.world, owner);
}

/** The pet out in the world for a saved entry, if it is out. */
const outInWorld = (world: ServerWorld, id: string | undefined) =>
  id ? Object.values(world.npcs).find((npc) => npc.state?.petId === id) : undefined;

/** Spawns the active pet at its owner's feet and tells the room. */
function bringOut(world: ServerWorld, owner: Player, saved: SavedPet) {
  const { id, name } = saved;
  const room = owner.roomName ? world.rooms[owner.roomName] : undefined;
  if (!room || outInWorld(world, id)) return undefined;
  const properties = [{ name: "petId", value: id }];
  const pet = spawnNpc(world, room, { name, x: owner.x, y: owner.y, properties });
  if (!pet) return undefined;
  makeOwned(pet, owner);
  /* As hurt as it was put away (never dead: a lost pet leaves its slot) */
  if (saved.hp !== undefined) {
    pet.stats.hp = Math.max(1, Math.round(pet.stats.maxHp * saved.hp));
  }
  /* The owner gets it in their room state on login; everyone already there hears now */
  world.io.to(room.name).emit("npcJoin", getPublicCharacterState(pet));
  return pet;
}

/** Takes a pet out of the world, if it's out and alive. */
function putAway(world: ServerWorld, saved: SavedPet | null) {
  const pet = outInWorld(world, saved?.id);
  if (pet && !pet.state.isDead) removeNpc(pet);
}

/** Its HP now as a share of its max, for its saved entry. */
const hpShare = (pet: Npc) =>
  pet.stats.maxHp > 0 ? Math.max(0, Math.min(1, pet.stats.hp / pet.stats.maxHp)) : 1;

/** `slots` with the active pet's current HP written into its entry, while it's out and alive. */
function withActiveHp(world: ServerWorld, slots: PetSlots): PetSlots {
  const pet = outInWorld(world, slots.active?.id);
  if (!slots.active || !pet || pet.state.isDead) return slots;
  return { ...slots, active: { ...slots.active, hp: hpShare(pet) } };
}

/** Writes the active pet's HP into the owner's save, e.g. as they log out, so it comes back as hurt. */
export function recordPetHealth(world: ServerWorld, owner: Player) {
  owner.pets = withActiveHp(world, owner.pets);
}

/**
 * Saves a freshly caught pet in the slot a catch goes to. Out in the active slot it stays in
 * the world; stored, it leaves it at once. Returns whether it stays out.
 */
export function keepPet(owner: Player, npc: Npc) {
  const slot = slotForCatch(owner.pets);
  if (!slot) return false;
  const id = owner.world.dice.newId();
  npc.state.petId = id;
  if (slot !== "active") removeNpc(npc);
  savePets(owner, { ...owner.pets, [slot]: { id, name: npc.name, hp: hpShare(npc) } });
  return slot === "active";
}

/** Brings out the owner's active pet at their feet, as they log in (before their room is sent). */
export function bringOutPet(world: ServerWorld, owner: Player) {
  const { active } = owner.pets;
  return active && isActiveOut(owner.pets) ? bringOut(world, owner, active) : undefined;
}

/**
 * Moves a pet between slots, swapping with whatever is there: whatever lands in the active
 * slot comes out, whatever leaves it is put away.
 */
export function movePetSlot(world: ServerWorld, owner: Player, from: PetSlot, to: PetSlot) {
  const slots = owner.pets;
  if (from === to || !slots[from]) return;
  /* A dying active pet can't be swapped out: it is about to be lost */
  if (outInWorld(world, slots.active?.id)?.state.isDead) return;
  const moved = movePet(withActiveHp(world, slots), from, to);
  if (moved.active?.id !== slots.active?.id) {
    putAway(world, slots.active);
    if (moved.active && isActiveOut(moved)) bringOut(world, owner, moved.active);
  }
  savePets(owner, moved);
}

/**
 * Puts the active pet away in its slot, or calls it back out, so the active slot can go quiet
 * even with every store full.
 */
export function toggleActivePet(world: ServerWorld, owner: Player) {
  const slots = withActiveHp(world, owner.pets);
  if (!slots.active) return;
  /* A dying active pet can't be put away: it is about to be lost */
  if (outInWorld(world, slots.active.id)?.state.isDead) return;
  const toggled = toggleActiveAway(slots);
  if (isActiveOut(toggled)) bringOut(world, owner, toggled.active!);
  else putAway(world, slots.active);
  savePets(owner, toggled);
}

/** A double-click on a slot: a stored pet swaps in to be active; the active one goes away or comes back. */
export function swapPet(world: ServerWorld, owner: Player, from: PetSlot) {
  if (from === "active") return toggleActivePet(world, owner);
  const to = swapTarget(owner.pets, from);
  if (to) movePetSlot(world, owner, from, to);
}

/** Lets the pet in a slot go for good: it leaves the world and the owner's account. */
export function releasePet(world: ServerWorld, owner: Player, slot: PetSlot) {
  if (!owner.pets[slot]) return;
  putAway(world, owner.pets[slot]);
  savePets(owner, withoutPet(owner.pets, slot));
}

/** Takes a dead pet off its owner's account, once. */
function forgetPet(world: ServerWorld, npc: Npc) {
  npc.state.isLost = true;
  const owner = npc.state.ownerId ? world.players[npc.state.ownerId] : undefined;
  const slot = owner && findPetSlot(owner.pets, npc.state.petId);
  if (owner && slot) savePets(owner, withoutPet(owner.pets, slot));
}

/**
 * A pet that dies is lost: off its owner's account at once, out of the world once its
 * death has played. Temporary pets (`/npc spawn ... pet`) respawn like anyone else.
 */
export const loseDeadPets: System<ServerWorld> = (world) => {
  const now = world.now();
  for (const npc of Object.values(world.npcs)) {
    if (!npc.state?.petId || !npc.state.isDead) continue;
    if (!npc.state.isLost) forgetPet(world, npc);
    if (now - npc.state.deadTime >= DEATH_LINGER_MS) removeNpc(npc);
  }
};
