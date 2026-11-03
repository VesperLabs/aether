import { describe, expect, it } from "vitest";
import { createServerDice } from "./server-dice";

const draw = (dice: ReturnType<typeof createServerDice>) => ({
  rolls: [dice.random(), dice.random(), dice.random()],
  ids: [dice.newId(), dice.newId()],
});

describe("createServerDice", () => {
  it("replays the same rolls and ids from the same seed", () => {
    expect(draw(createServerDice(7))).toEqual(draw(createServerDice(7)));
    expect(draw(createServerDice(7)).rolls).not.toEqual(draw(createServerDice(8)).rolls);
  });

  it("gives unseeded servers ids that never repeat", () => {
    expect(createServerDice().newId()).not.toBe(createServerDice().newId());
  });
});
