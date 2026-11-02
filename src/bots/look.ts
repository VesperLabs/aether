import { APPEARANCE_OPTIONS } from "@/rules/character";
import type { Rng } from "@/rules/world";

/** How many times to press each arrow on the character screen. */
export type Look = Record<keyof typeof APPEARANCE_OPTIONS, number>;

/** A random look: a random number of presses through each option list. */
export function rollLook(rng: Rng): Look {
  const presses = (options: readonly string[]) => Math.floor(rng() * options.length);
  const o = APPEARANCE_OPTIONS;
  return {
    hairTexture: presses(o.hairTexture),
    hairTint: presses(o.hairTint),
    faceTexture: presses(o.faceTexture),
    whiskersTexture: presses(o.whiskersTexture),
    whiskersTint: presses(o.whiskersTint),
    skinTint: presses(o.skinTint),
    body: presses(o.body),
  };
}

/**
 * The `updateProfile` commands that press the arrows: one per round, each moving every option
 * that still needs presses one step, as the server only takes steps of one.
 */
export function lookCommands(look: Look) {
  const rounds = Math.max(...Object.values(look));
  return Array.from({ length: rounds }, (_, round) => {
    const press = (n: number) => (round < n ? 1 : undefined);
    return {
      hair: { texture: press(look.hairTexture), tint: press(look.hairTint) },
      face: { texture: press(look.faceTexture) },
      whiskers: { texture: press(look.whiskersTexture), tint: press(look.whiskersTint) },
      skin: { tint: press(look.skinTint) },
      body: press(look.body),
    };
  });
}
