import {
  faceTextures,
  genders,
  hairTextures,
  hairTints,
  skinTints,
  whiskersTextures,
} from "@/content";

/** The parts of a profile the character screen changes. */
export interface Appearance {
  gender?: string;
  tint?: string;
  hair?: { texture?: string; tint?: string };
  face?: { texture?: string };
  whiskers?: { texture?: string; tint?: string };
}

/** Steps to take through each option list, as the character screen's arrows send them (±1). */
export interface AppearanceSteps {
  hair?: { texture?: number; tint?: number };
  face?: { texture?: number };
  whiskers?: { texture?: number; tint?: number };
  skin?: { tint?: number };
  body?: number;
}

/** Every option list, by the step that moves through it, so callers can see how long each is. */
export const APPEARANCE_OPTIONS = {
  hairTexture: hairTextures,
  hairTint: hairTints,
  faceTexture: faceTextures,
  whiskersTexture: whiskersTextures,
  whiskersTint: hairTints,
  skinTint: skinTints,
  body: genders,
};

/** The option `step` places along from `current`, wrapping round; unchanged without a step. */
function cycle(options: readonly string[], current: string | undefined, step = 0) {
  if (!step) return current;
  const index = Math.max(options.indexOf(current ?? ""), 0);
  return options[(((index + step) % options.length) + options.length) % options.length];
}

/** The appearance after taking `steps` through each option list. Pure: returns a new one. */
export function stepAppearance(look: Appearance, steps: AppearanceSteps): Appearance {
  const o = APPEARANCE_OPTIONS;
  return {
    ...look,
    gender: cycle(o.body, look.gender, steps.body),
    tint: cycle(o.skinTint, look.tint, steps.skin?.tint),
    hair: {
      ...look.hair,
      texture: cycle(o.hairTexture, look.hair?.texture, steps.hair?.texture),
      tint: cycle(o.hairTint, look.hair?.tint, steps.hair?.tint),
    },
    face: { ...look.face, texture: cycle(o.faceTexture, look.face?.texture, steps.face?.texture) },
    whiskers: {
      ...look.whiskers,
      texture: cycle(o.whiskersTexture, look.whiskers?.texture, steps.whiskers?.texture),
      tint: cycle(o.whiskersTint, look.whiskers?.tint, steps.whiskers?.tint),
    },
  };
}
