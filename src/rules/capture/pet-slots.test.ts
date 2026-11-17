import { describe, expect, it } from "vitest";
import {
  emptyPetSlots,
  findPetSlot,
  movePet,
  readPetSlots,
  slotForCatch,
  swapTarget,
} from "./pet-slots";

const crab = { id: "a", name: "crab" };
const bat = { id: "b", name: "bat" };

describe("pet slots", () => {
  it("a catch comes out as the active one, else waits in the first free store", () => {
    const slots = emptyPetSlots();
    expect(slotForCatch(slots)).toBe("active");
    expect(slotForCatch({ ...slots, active: crab })).toBe("stored1");
    expect(slotForCatch({ ...slots, active: crab, stored1: bat })).toBe("stored2");
    const full = {
      active: crab,
      stored1: bat,
      stored2: bat,
      stored3: bat,
      stored4: bat,
      stored5: bat,
    };
    expect(slotForCatch(full)).toBeUndefined();
  });

  it("moves swap with what's there", () => {
    const slots = { ...emptyPetSlots(), active: crab, stored2: bat };
    expect(movePet(slots, "stored2", "active")).toMatchObject({ active: bat, stored2: crab });
    expect(movePet(slots, "active", "stored1")).toMatchObject({
      active: null,
      stored1: crab,
    });
    expect(findPetSlot(slots, "b")).toBe("stored2");
  });

  it("a double-click swaps a stored one in, and puts the active one in the first free store", () => {
    const slots = { ...emptyPetSlots(), active: crab, stored2: bat };
    expect(swapTarget(slots, "stored2")).toBe("active");
    expect(swapTarget(slots, "active")).toBe("stored1");
    expect(swapTarget(slots, "stored1")).toBeUndefined();
  });

  it("reads only pets in known slots from a save", () => {
    expect(readPetSlots([crab])).toEqual(emptyPetSlots());
    expect(readPetSlots({ active: crab, stored9: bat, stored1: { id: 1 } })).toEqual({
      ...emptyPetSlots(),
      active: crab,
    });
  });
});
