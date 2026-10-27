import { describe, expect, it } from "vitest";
import { playersUrl } from "./fetchers";

describe("playersUrl", () => {
  it("leaves out the page size when no limit is set", () => {
    expect(playersUrl("http://s", { kind: "players", sortBy: "updatedAt" }, 2)).toBe(
      "http://s/players/all?sortBy=updatedAt&page=2",
    );
  });

  it("sends the limit as pageSize", () => {
    expect(playersUrl("http://s", { kind: "keepers", sortBy: "level", limit: 5 }, 1)).toBe(
      "http://s/keepers/all?sortBy=level&page=1&pageSize=5",
    );
  });
});
