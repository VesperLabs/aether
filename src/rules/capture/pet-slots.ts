/*
 * Pet slots: the pets a player caught and keeps, in fixed slots like equipment's. The
 * one in `active` is out with them; the stored ones wait. Moves return new slots, never change them.
 */

/** Every pet slot: the active one, then where the rest are stored. */
export const PET_SLOTS = ["active", "stored1", "stored2", "stored3", "stored4", "stored5"] as const;
export type PetSlot = (typeof PET_SLOTS)[number];

/** A caught pet as saved on its owner's account: the actor it is a copy of. */
export interface SavedPet {
  /** Ties the saved entry to the pet out in the world (its `state.petId`). */
  id: string;
  name: string;
  /** Its HP as it was put away, as a share of its max (0 to 1), so swapping never heals. Full if missing. */
  hp?: number;
  /** In the active slot but put away, not out with its owner (a double-click calls it back). */
  isAway?: boolean;
}

export type PetSlots = Record<PetSlot, SavedPet | null>;

export const STORED_PET_SLOTS = PET_SLOTS.filter((slot) => slot !== "active");

export const isPetSlot = (slot: unknown): slot is PetSlot =>
  (PET_SLOTS as readonly unknown[]).includes(slot);

/** No pets. */
export const emptyPetSlots = (): PetSlots =>
  Object.fromEntries(PET_SLOTS.map((slot) => [slot, null])) as PetSlots;

/** Slots read from a save: anything not a pet in a known slot is left empty. */
export function readPetSlots(saved: unknown): PetSlots {
  const slots = emptyPetSlots();
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return slots;
  for (const slot of PET_SLOTS) {
    const pet = (saved as Record<string, unknown>)[slot] as SavedPet | null;
    if (typeof pet?.id === "string" && typeof pet?.name === "string") {
      const { id, name, hp } = pet;
      slots[slot] = {
        id,
        name,
        ...(typeof hp === "number" && hp >= 0 && hp <= 1 && { hp }),
        /* Only the active one can be put away in place: a stored one is away already */
        ...(slot === "active" && pet.isAway === true && { isAway: true }),
      };
    }
  }
  return slots;
}

/** Where a new catch goes: out as the active one if that's free, else the first free store. */
export const slotForCatch = (slots: PetSlots): PetSlot | undefined =>
  slots.active ? STORED_PET_SLOTS.find((slot) => !slots[slot]) : "active";

/** The slot a pet is in, by its id. */
export const findPetSlot = (slots: PetSlots, id: unknown) =>
  PET_SLOTS.find((slot) => slots[slot]?.id === id);

/** A pet as it lands in a new slot: no longer put away (one moved into `active` comes out). */
function moved(pet: SavedPet | null): SavedPet | null {
  if (!pet?.isAway) return pet;
  const { isAway: _isAway, ...rest } = pet;
  return rest;
}

/** Moves a pet to another slot, swapping with whatever is there. */
export const movePet = (slots: PetSlots, from: PetSlot, to: PetSlot): PetSlots => ({
  ...slots,
  [from]: moved(slots[to]),
  [to]: moved(slots[from]),
});

/** Puts the active pet away in its slot, or calls it back out. Unchanged with none active. */
export function toggleActiveAway(slots: PetSlots): PetSlots {
  const { active } = slots;
  if (!active) return slots;
  return { ...slots, active: active.isAway ? moved(active) : { ...active, isAway: true } };
}

/** Whether the active pet is out with its owner: there is one, and it isn't put away. */
export const isActiveOut = (slots: PetSlots) => !!slots.active && !slots.active.isAway;

/**
 * Where a double-click on a stored slot sends its pet: into `active`, swapping with the one
 * there. Undefined for an empty slot, or for `active` itself, which toggles away instead.
 */
export function swapTarget(slots: PetSlots, from: PetSlot): PetSlot | undefined {
  if (!slots[from] || from === "active") return undefined;
  return "active";
}

/** Takes a pet out of its slot. */
export const withoutPet = (slots: PetSlots, slot: PetSlot): PetSlots => ({
  ...slots,
  [slot]: null,
});
