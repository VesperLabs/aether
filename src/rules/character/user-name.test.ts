import { describe, expect, it } from "vitest";
import { cleanUserName } from "./user-name";

describe("cleanUserName", () => {
  it("removes every kind of whitespace", () => {
    expect(cleanUserName(" Sir  Bob\tthe Bold ")).toBe("SirBobtheBold");
  });

  it("removes characters that only look blank", () => {
    expect(cleanUserName("\u200B\u3164\u2800\uFFA0\u00AD")).toBe("");
    expect(cleanUserName("Bo\u200Bb")).toBe("Bob");
  });

  it("removes the characters markup is made of", () => {
    expect(cleanUserName("<img src=x onerror='alert(1)'>")).toBe("imgsrcxonerroral");
  });

  it("keeps letters, digits, underscores and hyphens", () => {
    expect(cleanUserName("Sir_Bob-42")).toBe("Sir_Bob-42");
  });

  it("limits the length after removing whitespace", () => {
    expect(cleanUserName("a b".repeat(10))).toHaveLength(16);
  });

  it("leaves nothing of a blank name", () => {
    expect(cleanUserName("   ")).toBe("");
  });
});
