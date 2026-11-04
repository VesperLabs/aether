import type { BuiltItem } from "@/content";
import {
  findAbilityById,
  findBagItemById,
  findEquipmentById,
  findInventoryItemById,
} from "@/rules/inventory";
import type { Player } from "@/server/player";

/** The player's own item with this id, wherever they keep it. */
function findOwnItem(player: Player, id: string) {
  return (
    findEquipmentById(player.equipment, id).item ??
    findInventoryItemById(player.inventory, id) ??
    findBagItemById(player.inventory, id).item ??
    findAbilityById(player.abilities, id).item
  );
}

/**
 * The items a chat line links: only the sender's own, and only ones the text really names, copied
 * as they are now. A bag's contents stay private.
 */
export function resolveChatLinks(
  player: Player,
  ids: readonly string[] | null | undefined,
  message: string,
): BuiltItem[] | undefined {
  const links = (ids ?? []).flatMap((id) => {
    const item = findOwnItem(player, id);
    if (!item || !message.includes(`[${item.name ?? item.key}]`)) return [];
    return [{ ...item, items: undefined } as unknown as BuiltItem];
  });
  return links.length > 0 ? links : undefined;
}
