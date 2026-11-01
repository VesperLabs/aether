import { describe, expect, it } from "vitest";
import { mobKilledEvents } from "./kills";

describe("mobKilledEvents", () => {
  it("builds one event per mob with the shared recipients", () => {
    const events = mobKilledEvents(
      { id: "p1", level: 5, magicFind: 2, partyId: "party" },
      ["p1", "p2"],
      "town",
      [
        { id: "m1", name: "rat", stats: { level: 3 }, x: 10, y: 20 },
        { id: "m2", name: "bat", stats: { level: 4 }, x: 1, y: 2 },
      ],
    );
    expect(events).toEqual([
      {
        killerId: "p1",
        killerLevel: 5,
        killerMagicFind: 2,
        partyId: "party",
        recipientIds: ["p1", "p2"],
        mobId: "m1",
        mobName: "rat",
        mobLevel: 3,
        roomName: "town",
        x: 10,
        y: 20,
      },
      expect.objectContaining({ mobId: "m2", mobName: "bat", mobLevel: 4 }),
    ]);
  });

  it("returns nothing when no mob died", () => {
    expect(mobKilledEvents({ id: "p1", level: 1, magicFind: 0 }, ["p1"], "town", [])).toEqual([]);
  });
});
