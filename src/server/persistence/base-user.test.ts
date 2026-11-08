import { describe, expect, it } from "vitest";
import { createServerDice } from "../server-dice";
import { APPEARANCE_OPTIONS } from "@/rules/character";
import { createBaseUser } from "./base-user";

describe("createBaseUser", () => {
  it("uses the chosen gender and stays female without one", () => {
    const dice = createServerDice(1);
    expect(createBaseUser(dice, "mage", "male").profile.gender).toBe("male");
    expect(createBaseUser(dice, "mage").profile.gender).toBe("female");
  });

  it("starts a male with hair style 2 and a female with style 4", () => {
    const dice = createServerDice(1);
    expect(createBaseUser(dice, "mage", "male").profile.hair.texture).toBe("hair-1");
    expect(createBaseUser(dice, "mage", "female").profile.hair.texture).toBe("hair-3");
  });

  it("starts with a hair and whiskers colour the profile can pick", () => {
    const { profile } = createBaseUser(createServerDice(1), "mage");
    expect(APPEARANCE_OPTIONS.hairTint).toContain(profile.hair.tint);
    expect(APPEARANCE_OPTIONS.whiskersTint).toContain(profile.whiskers.tint);
  });
});
