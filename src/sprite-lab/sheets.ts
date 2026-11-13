import { assetList } from "@/content";

/** A sheet with no atlas is taken to be just its rows of frames, one per facing. */
const DIRECTIONS_PER_SHEET = 4;

/** The layers worn over a human, in the game's `getLayerOrder` names. */
export const HUMAN_LAYERS = [
  "shadow",
  "chest",
  "pants",
  "boots",
  "gloves",
  "armor",
  "accessory",
  "hair",
  "face",
  "whiskers",
  "helmet",
] as const;
export type HumanLayer = (typeof HUMAN_LAYERS)[number];

/** A sheet file. A `tint` colours it for viewing only; edits always load it plain. */
export type Sheet = { texture: string; src: string; tint?: string };

/**
 * Every character sheet with the walk layout: humans, their layers and mobs. Each image is listed
 * once, under its first texture, though the game may name it several times (all gloves share one).
 */
export const ANIMATED_SHEETS: (Sheet & { atlas?: string })[] = assetList
  .filter(({ atlas }) => /\/(50x50|80x80|150x150)\.json$/.test(atlas ?? ""))
  .filter(({ src }, i, all) => all.findIndex((sheet) => sheet.src === src) === i);

/** Everything held in a hand: weapons, shields and bows. */
export const WEAPON_SHEETS: Sheet[] = assetList
  .filter(({ atlas }) => atlas?.endsWith("/weapon.json"))
  .filter(({ src }, i, all) => all.findIndex((sheet) => sheet.src === src) === i);

/**
 * A frame's size on a sheet. The atlas says so; a sheet's height can't, as some carry a row of item
 * art below their four rows of frames.
 */
export const getSheetCell = (src: string, height: number) => {
  const atlas = ANIMATED_SHEETS.find((sheet) => sheet.src === src)?.atlas;
  const size = /\/(\d+)x\d+\.json$/.exec(atlas ?? "")?.[1];
  return size ? Number(size) : height / DIRECTIONS_PER_SHEET;
};

/** Sheets for one layer, whether gendered or not (`human-hair-1`, `human-male-armor-coat`). */
export const getLayerSheets = (layer: HumanLayer) => {
  /* The shadow is one sheet of its own, not one of the human's. */
  const name = layer === "shadow" ? /^shadow$/ : new RegExp(`^human-((male|female)-)?${layer}-`);
  return ANIMATED_SHEETS.filter(({ texture }) => name.test(texture));
};

/** The sheets a character is built on: bodies and mobs, so nothing worn over one. */
export const BASE_SHEETS = ANIMATED_SHEETS.filter(
  (sheet) => !HUMAN_LAYERS.some((layer) => getLayerSheets(layer).includes(sheet)),
);

/** The gender a sheet is drawn for, if any: unisex sheets like `human-hair-1` have none. */
export const getSheetGender = (texture: string) => /^human-(male|female)-/.exec(texture)?.[1];

/** Whether a sheet fits a body of this gender. With no gender set, everything does. */
export const fitsGender = (texture: string, gender?: string) => {
  const own = getSheetGender(texture);
  return !gender || !own || own === gender;
};

/** The worn sheets after choosing a chest: anything drawn for the other gender comes off. */
export const dropOtherGender = <T extends Record<string, string>>(textures: T, gender?: string) =>
  Object.fromEntries(
    Object.entries(textures).map(([layer, texture]) => [
      layer,
      fitsGender(texture, gender) ? texture : "",
    ]),
  ) as T;

/** A layer's pick, as kept in state: a sheet's texture, or `texture|tint` when it's tinted. */
export type Look = { texture: string; tint?: string };

export const parseLook = (value: string): Look => {
  const [texture, tint] = value.split("|");
  return { texture, tint: tint || undefined };
};

export const formatLook = ({ texture, tint }: Look) => (tint ? `${texture}|${tint}` : texture);
