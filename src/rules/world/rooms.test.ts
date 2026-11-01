import { describe, expect, it } from "vitest";
import { entitiesInRoom, groupByRoom } from "./rooms";

const entities = {
  a: { id: "a", room: { name: "town" } },
  b: { id: "b", room: { name: "cave" } },
  c: { id: "c", room: null },
  d: { id: "d", room: { name: "town" } },
  e: { id: "e", room: { name: "elsewhere" } },
};

describe("groupByRoom", () => {
  it("lists every named room, even empty ones", () => {
    const groups = groupByRoom(entities, ["town", "cave", "empty"]);
    expect(groups.town.map((e) => e.id)).toEqual(["a", "d"]);
    expect(groups.cave.map((e) => e.id)).toEqual(["b"]);
    expect(groups.empty).toEqual([]);
    expect(groups.elsewhere).toBeUndefined();
  });

  it("skips entities that fail the filter", () => {
    const groups = groupByRoom(entities, ["town"], (e) => e.id !== "a");
    expect(groups.town.map((e) => e.id)).toEqual(["d"]);
  });

  it("agrees with entitiesInRoom", () => {
    const groups = groupByRoom(entities, ["town", "cave"]);
    expect(groups.town).toEqual(entitiesInRoom(entities, "town"));
    expect(groups.cave).toEqual(entitiesInRoom(entities, "cave"));
  });
});
