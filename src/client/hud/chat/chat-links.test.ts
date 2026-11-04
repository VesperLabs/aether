import { describe, expect, it } from "vitest";
import type { BuiltItem } from "@/content";
import { editChatDraft, snapChatCaret, splitChatLinks } from "./chat-links";

const blade = { name: "Fox Blade", key: "foxBlade" } as BuiltItem;

describe("splitChatLinks", () => {
  it("cuts a line around its linked items", () => {
    expect(splitChatLinks("wts [Fox Blade] cheap", [blade])).toEqual(["wts ", blade, " cheap"]);
  });

  it("leaves brackets nobody linked as text", () => {
    expect(splitChatLinks("wts [Fox Blade]")).toEqual(["wts [Fox Blade]"]);
    expect(splitChatLinks("[Other]", [blade])).toEqual(["[Other]"]);
  });
});

describe("editChatDraft", () => {
  const names = ["Fox Blade"];

  it("takes a whole link out on backspace or delete", () => {
    expect(editChatDraft("hi [Fox Blade]", "hi [Fox Blad", names)).toEqual({
      value: "hi ",
      caret: 3,
    });
    expect(editChatDraft("[Fox Blade] x", "Fox Blade] x", names).value).toBe(" x");
  });

  it("takes out a link something is typed inside", () => {
    expect(editChatDraft("[Fox Blade]", "[Fox zBlade]", names)).toEqual({ value: "z", caret: 1 });
  });

  it("leaves edits around a link alone", () => {
    expect(editChatDraft("[Fox Blade] hi", "[Fox Blade] h", names).value).toBe("[Fox Blade] h");
    expect(editChatDraft("[Fox Blade]", "x[Fox Blade]", names).value).toBe("x[Fox Blade]");
    expect(editChatDraft("[Fox Blade]", "[Fox Blade]x", names).value).toBe("[Fox Blade]x");
  });
});

describe("snapChatCaret", () => {
  it("skips over a link in the direction of travel", () => {
    expect(snapChatCaret("a [Fox Blade]", ["Fox Blade"], 12, 13)).toBe(2);
    expect(snapChatCaret("a [Fox Blade]", ["Fox Blade"], 3, 2)).toBe(13);
    expect(snapChatCaret("a [Fox Blade]", ["Fox Blade"], 1, 2)).toBe(1);
  });
});
