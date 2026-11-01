import { describe, expect, it } from "vitest";
import { POTION_COOLDOWN } from "@/rules/combat";
import { CharacterModel } from "./character";

function makeCharacter(now: { t: number }) {
  const character = new CharacterModel();
  character.initCharacter({ x: 0, y: 0, stats: { attackDelay: 1000 } }, () => now.t);
  return character;
}

describe("CharacterModel clock", () => {
  it("seeds its timers from the injected clock", () => {
    const character = makeCharacter({ t: 50_000 });
    expect(character.state.lastTeleport).toBe(50_000);
    expect(character.state.lastPotion).toBe(50_000 - POTION_COOLDOWN);
  });

  it("reads cooldowns against the injected clock", () => {
    const now = { t: 50_000 };
    const character = makeCharacter(now);
    character.state.lastPotion = now.t;
    expect(character.checkPotionCooldown().isReady).toBe(false);
    now.t += POTION_COOLDOWN + 1;
    expect(character.checkPotionCooldown().isReady).toBe(true);
  });
});
