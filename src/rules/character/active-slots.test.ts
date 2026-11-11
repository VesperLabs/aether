import { describe, expect, it } from "vitest";
import { getActiveItemSlots } from "./active-slots";

const robe = { type: "armor", requirements: { level: 1 } };
const sword = { type: "weapon", requirements: {} };
const bow = { type: "ranged", requirements: {} };
const shield = { type: "shield", requirements: {} };
const human = { profile: { race: "human" } };

describe("getActiveItemSlots", () => {
  it("counts a new character's starting clothes and weapon", () => {
    const slots = getActiveItemSlots({
      ...human,
      baseStats: { level: 1 },
      equipment: { armor: robe, handRight: sword, helmet: null },
    });
    expect(slots).toEqual(expect.arrayContaining(["armor", "handRight"]));
  });

  it("leaves out an item the character is too low a level for", () => {
    const plate = { type: "armor", requirements: { level: 9 } };
    const slots = getActiveItemSlots({
      ...human,
      baseStats: { level: 1 },
      equipment: { armor: plate },
    });
    expect(slots).not.toContain("armor");
  });

  it("leaves out an item for another class", () => {
    const staff = { type: "weapon", requirements: { charClass: "cleric" } };
    const slots = getActiveItemSlots({
      ...human,
      charClass: "warrior",
      equipment: { handRight: staff },
    });
    expect(slots).not.toContain("handRight");
  });

  it("lets one item's stats meet the next item's requirement", () => {
    const ring = { type: "ring", stats: { strength: 5 }, requirements: {} };
    const axe = { type: "weapon", requirements: { strength: 5 } };
    const slots = getActiveItemSlots({
      ...human,
      baseStats: { strength: 1 },
      equipment: { ring1: ring, handRight: axe },
    });
    expect(slots).toContain("handRight");
  });

  it("drops both hands for a bow held with a shield", () => {
    const slots = getActiveItemSlots({ ...human, equipment: { handRight: bow, handLeft: shield } });
    expect(slots).not.toContain("handRight");
    expect(slots).not.toContain("handLeft");
  });

  it("drops a melee skill without a melee weapon", () => {
    const slash = { type: "spell", requirements: { weaponType: "melee" } };
    expect(getActiveItemSlots({ ...human, abilities: { 1: slash } })).not.toContain("1");
    expect(
      getActiveItemSlots({ ...human, equipment: { handRight: sword }, abilities: { 1: slash } }),
    ).toContain("1");
  });
});
