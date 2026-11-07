import {
  faceTextures,
  genders,
  hairTextures,
  hairTints,
  skinTints,
  whiskersTextures,
} from "@/content";

/** The parts of a profile the profile screen changes. */
export interface Appearance {
  gender?: string;
  tint?: string;
  hair?: { texture?: string; tint?: string };
  face?: { texture?: string };
  whiskers?: { texture?: string; tint?: string };
}

/** Every option list the profile screen picks from, by the part it sets. */
export const APPEARANCE_OPTIONS = {
  gender: genders,
  tint: skinTints,
  hairTexture: hairTextures,
  hairTint: hairTints,
  faceTexture: faceTextures,
  whiskersTexture: whiskersTextures,
  whiskersTint: hairTints,
} as const;

/** Drops unset keys: saving one writes a null, which the database schema refuses. */
function withoutUnset<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** A part made of a texture and a tint. Stored with both or not at all, so a new one gets both. */
function choosePart(
  part: { texture?: string; tint?: string } | undefined,
  options: { textures: readonly string[]; tints: readonly string[] },
  choice: { texture?: string; tint?: string } = {},
) {
  const texture = choice.texture ?? part?.texture;
  const tint = choice.tint ?? part?.tint;
  if (!texture && !tint) return undefined;
  return { ...part, texture: texture ?? options.textures[0], tint: tint ?? options.tints[0] };
}

/** The appearance with each chosen part swapped in. Pure: returns a new one. */
export function chooseAppearance(look: Appearance, choice: Appearance): Appearance {
  const o = APPEARANCE_OPTIONS;
  const faceTexture = choice.face?.texture ?? look.face?.texture;
  return withoutUnset({
    ...look,
    gender: choice.gender ?? look.gender,
    tint: choice.tint ?? look.tint,
    hair: choosePart(look.hair, { textures: o.hairTexture, tints: o.hairTint }, choice.hair),
    face: faceTexture ? { ...look.face, texture: faceTexture } : undefined,
    whiskers: choosePart(
      look.whiskers,
      { textures: o.whiskersTexture, tints: o.whiskersTint },
      choice.whiskers,
    ),
  });
}
