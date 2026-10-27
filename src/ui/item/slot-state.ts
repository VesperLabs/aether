import { itemHasRequiredStats } from "@/rules/inventory";
import { isEqual, get } from "@/ui/kit";
import type { SlotProps } from "./item-slot";

export function shouldReRenderSlot(prevProps: SlotProps, nextProps: SlotProps) {
  if (prevProps.location === "equipment") {
    const itemSlotsChanged = !isEqual(
      get(prevProps, "player.activeItemSlots"),
      get(nextProps, "player.activeItemSlots"),
    );
    const activeSetsChanged = !isEqual(
      get(prevProps, "player.state.activeSets"),
      get(nextProps, "player.state.activeSets"),
    );
    const isSetRarityChanged =
      (get(prevProps, "item.rarity") === "set" || get(nextProps, "item.rarity") === "set") &&
      activeSetsChanged;
    if (isSetRarityChanged || itemSlotsChanged) {
      return false;
    }
  }
  /* Update the items that have requirements when the users stats change */
  if (prevProps?.item?.requirements) {
    const playerStatsChanged = !isEqual(
      get(prevProps, "player.stats"),
      get(nextProps, "player.stats"),
    );
    if (playerStatsChanged) return false;
  }

  return ["id", "item.amount", "item.items", "item.stock", "item.id"].every((key) => {
    return isEqual(get(prevProps, key), get(nextProps, key));
  });
}

export function getIsItemActive({
  item,
  slotKey,
  player,
  location,
}: Pick<SlotProps, "item" | "slotKey" | "player" | "location">) {
  if (["abilities", "equipment"]?.includes(location as string)) {
    return player?.activeItemSlots?.includes(slotKey as string);
  }
  if (["shop", "inventory", "bag"]?.includes(location as string)) {
    return Object.keys(item?.requirements || {}).every((key) => {
      return itemHasRequiredStats({
        requirements: item?.requirements as Record<string, number | string>,
        player: player ?? undefined,
        key,
      });
    });
  }
  return true;
}
