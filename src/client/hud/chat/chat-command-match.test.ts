import { describe, expect, it } from "vitest";
import { getChatCommands } from "@/network";
import { getGhostText, readChatDraft } from "./chat-command-match";

const commands = getChatCommands(true);
const values = (draft: string) => readChatDraft(draft, commands).suggestions.map((s) => s.value);

describe("readChatDraft suggestions", () => {
  it("suggests nothing for plain chat", () => {
    expect(values("hello")).toEqual([]);
  });

  it("lists only player commands when cheats are off", () => {
    const { suggestions } = readChatDraft("/", getChatCommands(false));
    expect(suggestions.map((s) => s.value)).toContain("/whisper");
    expect(suggestions.map((s) => s.value)).not.toContain("/heal");
  });

  it("puts a command first when its shortcut is typed", () => {
    expect(values("/w")[0]).toBe("/whisper");
    expect(values("/r")[0]).toBe("/reply");
    expect(readChatDraft("/w bob hi", commands).command?.name).toBe("whisper");
  });

  it("puts prefix matches first, then the closest typo", () => {
    expect(values("/d").slice(0, 2)).toEqual(["/ding", "/drop"]);
    expect(values("/gins")[0]).toBe("/guns");
  });

  it("suggests items after /drop, keeping what's before the word", () => {
    const { suggestions, prefix } = readChatDraft("/drop foxb", commands);
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

describe("item hints", () => {
  it("finds items by their hint, like rarity and type", () => {
    const { suggestions } = readChatDraft("/drop rare", commands);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.hint?.startsWith("rare "))).toBe(true);
  });
});

describe("item names", () => {
  it("shows the real name but inserts the key", () => {
    const [first] = readChatDraft("/drop fox", commands).suggestions;
    expect(first).toMatchObject({ value: "foxBlade", label: "Fox Blade" });
  });
});

describe("readChatDraft arguments", () => {
  const read = (draft: string) => readChatDraft(draft, commands);

  it("lists every command after a bare slash", () => {
    expect(read("/").suggestions).toHaveLength(commands.length);
  });

  it("knows which argument is being typed", () => {
    expect(read("/tp 10 ")).toMatchObject({ argIndex: 1, args: ["10", ""] });
    expect(read("/tp")).toMatchObject({ argIndex: -1, needsMore: true });
  });

  it("moves on while required arguments are missing", () => {
    expect(read("/tp 10")).toMatchObject({ needsMore: true, error: "Needs <y>" });
    expect(read("/tp 10 20")).toMatchObject({ needsMore: false, error: undefined });
  });

  it("flags finished arguments that won't do", () => {
    const draft = read("/tp ten 2");
    expect(draft.argErrors[0]).toBe("x is a number");
    expect(draft.error).toBe("x is a number");
    expect(draft.needsMore).toBe(false);
    expect(read("/drop nope").error).toBe('No item called "nope"');
    expect(read("/warp nowhere").error).toBe('No room called "nowhere"');
  });

  it("checks an amount for stackables", () => {
    expect(read("/drop smallHpPotion 20").error).toBeUndefined();
    expect(read("/drop smallHpPotion lots ").error).toBe("amount is a number");
  });

  it("rejects unknown commands", () => {
    expect(read("/nope").error).toBe("Unknown command /nope");
    expect(read("/nope 1").error).toBe("Unknown command /nope");
  });
});

describe("getGhostText", () => {
  const ghost = (draft: string) => {
    const read = readChatDraft(draft, commands);
    return getGhostText(read, read.suggestions[0]);
  };

  it("finishes the command name and lists its arguments", () => {
    expect(ghost("/tp")).toBe(" <x> <y>");
    expect(ghost("/t")).toBe("ime [hour]");
    expect(ghost("/w")).toBe("hisper <player> <message>");
    expect(ghost("/")).toBe("");
  });

  it("finishes the argument being typed, then the ones still to come", () => {
    expect(ghost("/tp ")).toBe("<x> <y>");
    expect(ghost("/tp 10")).toBe(" <y>");
    expect(ghost("/tp 10 20")).toBe("");
    expect(ghost("/drop foxB")).toBe("lade");
  });

  it("asks for rarity only on rollable bases and amount only on stackables", () => {
    expect(ghost("/drop sword ")).toBe("[rarity]");
    expect(ghost("/drop smallHpPotion ")).toBe("[amount]");
    expect(ghost("/give foxBlade ")).toBe("");
    expect(ghost("/dro")).toBe("p <item>");
  });

  it("shows nothing for plain chat", () => {
    expect(ghost("hello")).toBe("");
  });
});

describe("far-off typing", () => {
  it("suggests nothing that isn't close", () => {
    expect(values("/zzzzzz")).toEqual([]);
    expect(values("/guns qqq")).toEqual([]);
  });
});
