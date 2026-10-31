import { describe, expect, it } from "vitest";
import { getChatCommands } from "@/network";
import { getChatSuggestions } from "./chat-command-match";

const commands = getChatCommands(true);
const values = (draft: string) =>
  getChatSuggestions(draft, commands).suggestions.map((s) => s.value);

describe("getChatSuggestions", () => {
  it("suggests nothing for plain chat or when cheats are off", () => {
    expect(values("hello")).toEqual([]);
    expect(getChatSuggestions("/", getChatCommands(false)).suggestions).toEqual([]);
  });

  it("puts prefix matches first, then the closest typo", () => {
    expect(values("/d").slice(0, 2)).toEqual(["/ding", "/drop"]);
    expect(values("/gins")[0]).toBe("/guns");
  });

  it("suggests items after /drop, keeping what's before the word", () => {
    const { suggestions, prefix } = getChatSuggestions("/drop foxb", commands);
    expect(suggestions[0].value).toBe("foxBlade");
    expect(prefix).toBe("/drop ");
  });

  it("offers rolled rarities only for common bases", () => {
    expect(values("/drop sword ")).toEqual(["magic", "rare"]);
    expect(values("/drop foxBlade ")).toEqual([]);
    expect(values("/drop fireball ")).toEqual([]);
  });

  it("keeps an exact match listed first so Tab can move on", () => {
    expect(values("/guns rare")[0]).toBe("rare");
    expect(values("/drop sword")[0]).toBe("sword");
    expect(values("/drop")[0]).toBe("/drop");
  });
});

describe("item names", () => {
  it("shows the real name but inserts the key", () => {
    const [first] = getChatSuggestions("/drop fox", commands).suggestions;
    expect(first).toMatchObject({ value: "foxBlade", label: "Fox Blade" });
  });
});
