export { CONSUMABLES_BASES, MAX_INVENTORY_ITEMS, POTION_BASES, SHOP_INFLATION } from "./constants";
export { itemHasRequiredStats } from "./requirements";
export { consumeItem } from "./consume";
export type { ConsumeRequest, ConsumeResult } from "./consume";
export { dropItem } from "./drop";
export type { DropRequest, DropResult } from "./drop";
export {
  addInventoryItem,
  deleteAbilityAtId,
  deleteBagItemAtId,
  deleteInventoryItemAtId,
  setBagItem,
  subtractAbilityAtId,
  subtractBagItemAtId,
  subtractInventoryItemAtId,
  updateBagItemAtId,
  updateInventoryItemAtId,
} from "./edit";
export type { Subtracted } from "./edit";
export {
  findAbilityById,
  findBagItemById,
  findBagItemBySlot,
  findEquipmentById,
  findInventoryItemById,
  findOpenBagSlot,
  isInventoryFull,
} from "./lookup";
export type { FoundBagItem, FoundSlot } from "./lookup";
export { moveItem } from "./move";
export { checkSlotsMatch, cloneItem, toQuantity, withSlot, withoutSlot } from "./slots";
export type {
  InventoryItem,
  InventoryState,
  ItemSlotValue,
  MoveApplied,
  MoveContext,
  MoveEndpoint,
  MoveRejected,
  MoveRequest,
  MoveResult,
  ShopSlot,
} from "./types";
export { describeItem } from "./describe";
export type {
  DescribableItem,
  DescribePlayer,
  ItemDescription,
  StatLine,
  TriggerLine,
} from "./describe";
