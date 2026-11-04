import { describe, expect, it } from "vitest";
import { cleanUserName } from "./user-name";

describe("cleanUserName", () => {
  it("removes every kind of whitespace", () => {
    expect(cleanUserName(" Sir  Bob\tthe Bold ")).toBe("SirBobtheBold");
  });

  it("limits the length after removing whitespace", () => {
    expect(cleanUserName("a b".repeat(10))).toHaveLength(16);
  });

  it("leaves nothing of a blank name", () => {
    expect(cleanUserName("   ")).toBe("");
  });
});
