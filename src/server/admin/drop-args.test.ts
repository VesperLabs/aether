import { describe, expect, it } from "vitest";
import { parseDropArgs } from "./drop-args";

describe("parseDropArgs", () => {
  it("finds the item by key, ignoring case", () => {
    expect(parseDropArgs(["SWORD"])).toEqual({ key: "sword", slots: 0, amount: 1 });
  });

  it("reads gear's mod slots and a stack's amount", () => {
    expect(parseDropArgs(["sword", "3"])).toMatchObject({ slots: 3, amount: 1 });
    expect(parseDropArgs(["smallHpPotion", "20"])).toMatchObject({ slots: 0, amount: 20 });
  });

  it("explains unknown items and args", () => {
    expect(parseDropArgs([])).toHaveProperty("error");
    expect(parseDropArgs(["nope"])).toHaveProperty("error");
    expect(parseDropArgs(["sword", "shiny"])).toHaveProperty("error");
    expect(parseDropArgs(["sword", "5"])).toHaveProperty("error");
    expect(parseDropArgs(["sword", "1", "2"])).toHaveProperty("error");
  });

  it("refuses a count an item can't take", () => {
    expect(parseDropArgs(["foxBlade", "2"])).toHaveProperty("error");
    expect(parseDropArgs(["fireball", "3"])).toHaveProperty("error");
  });
});
