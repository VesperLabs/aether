import { ITEM_CATALOG, resolveAsset } from "@/content";
import { formatLook, getLayerSheets, type HumanLayer } from "./sheets";

/** A real item as a layer could wear it: its name, and the sheet and tint the game draws. */
export type ItemLook = { value: string; label: string; texture: string; tint: string };

/**
 * The tinted items that wear on a layer, for a chest of this gender. An untinted item is just its
 * sheet, which the layer already offers, so only tinted ones are listed.
 */
export const getItemLooks = (layer: HumanLayer, gender = "male"): ItemLook[] => {
  const sheets = getLayerSheets(layer);
  const seen = new Set<string>();
  return Object.values(ITEM_CATALOG).flatMap((item) => {
    if (!item.tint || !item.slot) return [];
    const { texture } = resolveAsset(item, { profile: { race: "human", gender } });
    if (!sheets.some((sheet) => sheet.texture === texture)) return [];
    const value = formatLook({ texture, tint: item.tint });
    if (seen.has(value)) return [];
    seen.add(value);
    return [{ value, label: `${item.name} (${item.rarity})`, texture, tint: item.tint }];
  });
};
