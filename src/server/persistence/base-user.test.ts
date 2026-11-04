import { describe, expect, it } from "vitest";
import { createServerDice } from "../server-dice";
import { createBaseUser } from "./base-user";

describe("createBaseUser", () => {
  it("uses the chosen gender and stays female without one", () => {
    const dice = createServerDice(1);
    expect(createBaseUser(dice, "mage", "male").profile.gender).toBe("male");
    expect(createBaseUser(dice, "mage").profile.gender).toBe("female");
  });
});
