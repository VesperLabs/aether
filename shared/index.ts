export { default as assetList } from "./data/assetList.json";
export { default as buffList } from "./data/buffList.json";
export { default as hairTints } from "./data/hairTints.json";
export { default as itemModsList } from "./data/itemModsList.json";
export { default as itemSetList } from "./data/itemSetList.json";
export { default as keepers } from "./data/keepers.json";
export { default as mapImageList } from "./data/mapImageList.json";
export { default as mapList } from "./data/mapList.json";
export { default as nasties } from "./data/nasties.json";
export { default as questList } from "./data/questList.json";
export { default as skinTints } from "./data/skinTints.json";
export { default as soundList } from "./data/soundList.json";
export { default as spellDetails } from "./data/spellDetails.json";
export { default as ItemBuilder, itemList } from "./ItemBuilder";
export { default as Character } from "./Character";
export * from "./Assets";
export * from "./Door";
export * from "./Maps";
export * from "./Sign";
export * from "./utils";

export const CLASS_ICON_MAP = {
  WARRIOR: process.env.SERVER_URL + `/assets/icons/axe.png`,
  ROGUE: process.env.SERVER_URL + `/assets/icons/katar.png`,
  MAGE: process.env.SERVER_URL + `/assets/icons/rod.png`,
  CLERIC: process.env.SERVER_URL + `/assets/icons/staff.png`,
};
