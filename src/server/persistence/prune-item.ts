/* Stored documents are untyped; this prune only touches the item lists. */
type StoredItem = { key?: string; items?: Array<StoredItem | null> } | null;

export interface StoredItemLists {
  equipment?: Record<string, StoredItem>;
  abilities?: Record<string, StoredItem>;
  inventory?: StoredItem[];
}

/**
 * Empties every equipment, ability, inventory and bag slot holding an item with this key.
 * Changes `doc` in place and returns whether anything was removed.
 */
export function pruneItemFromUser(doc: StoredItemLists, keyToRemove: string): boolean {
  let updateNeeded = false;

  for (const slots of [doc.equipment, doc.abilities]) {
    for (const slot in slots) {
      if (slots[slot]?.key === keyToRemove) {
        slots[slot] = null;
        updateNeeded = true;
      }
    }
  }

  doc.inventory = doc.inventory?.map((item) => {
    if (item?.key === keyToRemove) {
      updateNeeded = true;
      return null;
    }
    if (item?.items) {
      item.items = item.items.map((nestedItem) => {
        if (nestedItem?.key !== keyToRemove) return nestedItem;
        updateNeeded = true;
        return null;
      });
    }
    return item;
  });

  return updateNeeded;
}
