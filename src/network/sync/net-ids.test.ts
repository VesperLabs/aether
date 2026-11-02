import { describe, expect, it } from "vitest";
import { createNetIds } from "./net-ids";

describe("createNetIds", () => {
  it("keeps a number per id and reuses freed ones", () => {
    const ids = createNetIds();
    expect(ids.take("a")).toBe(0);
    expect(ids.take("b")).toBe(1);
    expect(ids.take("a")).toBe(0);
    ids.release("a");
    expect(ids.take("c")).toBe(0);
    expect(ids.take("d")).toBe(2);
  });
});
