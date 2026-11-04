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
const APPEARANCE_OPTIONS = {
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

/** Drops unset keys: saving one writes a null, which the database schema refuses. */
function withoutUnset<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** A part made of a texture and a tint. Stored with both or not at all, so a new one gets both. */
function stepPart(
  part: { texture?: string; tint?: string } | undefined,
  options: { textures: readonly string[]; tints: readonly string[] },
  steps: { texture?: number; tint?: number } = {},
) {
  const texture = cycle(options.textures, part?.texture, steps.texture);
  const tint = cycle(options.tints, part?.tint, steps.tint);
  if (!texture && !tint) return undefined;
  return { ...part, texture: texture ?? options.textures[0], tint: tint ?? options.tints[0] };
}

/** The appearance after taking `steps` through each option list. Pure: returns a new one. */
export function stepAppearance(look: Appearance, steps: AppearanceSteps): Appearance {
  const o = APPEARANCE_OPTIONS;
  const faceTexture = cycle(o.faceTexture, look.face?.texture, steps.face?.texture);
  return withoutUnset({
    ...look,
    gender: cycle(o.body, look.gender, steps.body),
    tint: cycle(o.skinTint, look.tint, steps.skin?.tint),
    hair: stepPart(look.hair, { textures: o.hairTexture, tints: o.hairTint }, steps.hair),
    face: faceTexture ? { ...look.face, texture: faceTexture } : undefined,
    whiskers: stepPart(
      look.whiskers,
      { textures: o.whiskersTexture, tints: o.whiskersTint },
      steps.whiskers,
    ),
  });
}
