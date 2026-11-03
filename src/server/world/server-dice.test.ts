import { describe, expect, it } from "vitest";
import { createServerDice } from "./server-dice";

describe("createServerDice", () => {
  it("repeats rolls and ids for the same seed", () => {
    const a = createServerDice(7);
    const b = createServerDice(7);
    expect([a.random(), a.newId(), a.newId()]).toEqual([b.random(), b.newId(), b.newId()]);
  });

  it("keeps rolls the same however many ids are made", () => {
    const a = createServerDice(7);
    const b = createServerDice(7);
    a.newId();
    expect(a.random()).toBe(b.random());
  });

  it("makes unique random ids when unseeded", () => {
    const dice = createServerDice();
    expect(dice.newId()).not.toBe(dice.newId());
  });
});
