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
  /* An item with requirements goes red or usable, and its tooltip's lines with it, as the
   * player's stats change: a level up, a buff, gear */
  if (prevProps?.item?.requirements && !sameRequirementInputs(prevProps.player, nextProps.player)) {
    return false;
  }

  return ["id", "item.amount", "item.items", "item.stock", "item.id"].every((key) => {
    return isEqual(get(prevProps, key), get(nextProps, key));
  });
}

/* Change on every tick, and no requirement reads them: comparing them would redraw slots for nothing */
const TICK_VITALS = ["hp", "mp", "sp"];

type RequirementInputs = {
  stats?: Record<string, unknown> | null;
  charClass?: unknown;
  activeItemSlots?: unknown;
} | null;

const withoutVitals = (stats: Record<string, unknown> | null | undefined) => {
  if (!stats) return stats;
  const rest = { ...stats };
  for (const key of TICK_VITALS) delete rest[key];
  return rest;
};

/**
 * Whether everything an item's requirements can read is the same for both: the stats (not the
 * hp, mp and sp each tick moves), the class, and what is equipped (`weaponType`). Cheap enough to
 * run each tick, and only differs when an item could change between red and usable.
 */
export function sameRequirementInputs(
  prev: RequirementInputs | undefined,
  next: RequirementInputs | undefined,
) {
  return (
    prev?.charClass === next?.charClass &&
    isEqual(prev?.activeItemSlots, next?.activeItemSlots) &&
    isEqual(withoutVitals(prev?.stats), withoutVitals(next?.stats))
  );
}

/** Whether `target` is the slot or anything in it, such as the icon a held finger first lands on. */
export function isOverSlot(target: Element | null, tooltipId: string) {
  return target?.closest("[data-tooltip-id]")?.getAttribute("data-tooltip-id") === tooltipId;
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
