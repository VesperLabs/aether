export { default as assetList } from "./data/asset-list.json";
export { default as buffList } from "./data/buff-list.json";
export { default as hairTints } from "./data/hair-tints.json";
export { default as itemModsList } from "./data/item-mods-list.json";
export { default as itemSetList } from "./data/item-set-list.json";
export { default as keepers } from "./data/keepers.json";
export { default as mapImageList } from "./data/map-image-list.json";
export { default as mapList } from "./data/map-list.json";
export { default as nasties } from "./data/nasties.json";
export { default as questList } from "./data/quest-list.json";
export { default as skinTints } from "./data/skin-tints.json";
export { default as soundList } from "./data/sound-list.json";
export { default as spellDetails } from "./data/spell-details.json";
export { ItemBuilder, itemList } from "./item-builder";
export { Character } from "./character";
export * from "./constants";
export * from "./net-snapshot";
export * from "./net-wire";
export * from "./wire-tick";
export * from "./tick-state";
export * from "./tick-delta";
export * from "./assets";
export * from "./door";
export * from "./maps";
export * from "./sign";
export * from "./utils";

export const CLASS_ICON_MAP = {
  WARRIOR: `./assets/icons/axe.png`,
  ROGUE: `./assets/icons/katar.png`,
  MAGE: `./assets/icons/rod.png`,
  CLERIC: `./assets/icons/staff.png`,
};
