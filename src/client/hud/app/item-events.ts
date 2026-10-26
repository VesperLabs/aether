import React from "react";
import { CONSUMABLES_BASES } from "@/shared";
import type { ClientGameSocket } from "@/shared/network";

interface ItemEventDeps {
  hero: FullCharacterState;
  bagState: Array<string>;
  toggleBagState: (id: string) => void;
  setDropItem: React.Dispatch<React.SetStateAction<any>>;
  socket: ClientGameSocket;
}

/** Handlers for items double clicked or dropped somewhere in the HUD. */
export function createItemEventHandlers({
  hero,
  bagState,
  toggleBagState,
  setDropItem,
  socket,
}: ItemEventDeps) {
  function onDoubleClickItem(e) {
    const { item, location } = e?.detail ?? {};
    const isConsumable = CONSUMABLES_BASES.includes(item?.base);

    if (!["inventory", "abilities", "bag"].includes(location)) return;
    /* If it is food we are trying to consume it */
    if (isConsumable) {
      window.dispatchEvent(
        new CustomEvent("HERO_USE_ITEM", {
          detail: { item, location },
        }),
      );
    }
    /* If it is a bag, we open it */
    if (item?.base === "bag") {
      toggleBagState(item?.id);
    }
  }

  function onDropItem(e) {
    const { target, location, bagId, slotKey, item } = e?.detail ?? {};
    const { nodeName, dataset } = target ?? {};
    if (hero?.state?.isDead) return;
    /* Not moving an item anywhere. (Same slot) */
    if (dataset?.location === location && dataset?.slotKey === slotKey && dataset.bagId === bagId) {
      return;
    }
    /* Anywhere -> Ground */
    if (nodeName == "CANVAS" && location !== "shop") {
      if (item?.amount > 1) {
        /* If more than 1, open up the drop modal */
        return setDropItem({ ...item, location, bagId, action: "DROP" });
      } else {
        if (["set", "rare", "unique"]?.includes(item?.rarity)) {
          return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
        }
        if (["bag"]?.includes(item?.base)) {
          /* Close open bag */
          if (bagState?.find?.((id) => id === item?.id)) {
            toggleBagState(item?.id);
          }
          return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
        }
        return socket.emit("dropItem", { item, bagId, location });
      }
    }
    /* Anywhere -> Shop */
    if (target?.closest(".menu-keeper")) {
      if (item?.amount > 1) {
        /* If more than 1, open up the drop modal */
        return setDropItem({ ...item, location, bagId, action: "SHOP_SELL_AMOUNT", slotKey });
      } else {
        if (["set", "rare", "unique"]?.includes(item?.rarity) || ["bag"]?.includes(item?.base)) {
          /* Close open bag */
          if (bagState?.find?.((id) => id === item?.id)) {
            toggleBagState(item?.id);
          }
          return setDropItem({
            ...item,
            location,
            action: "SHOP_SELL_CONFIRM",
            slotKey,
            bagId,
          });
        } else {
          // so that we can play the sell sound
          if (location !== "shop") {
            window.dispatchEvent(
              new CustomEvent("AUDIO_ITEM_SELL", {
                detail: item,
              }),
            );
          }
          return socket.emit("moveItem", {
            to: {
              location: "shop",
            },
            from: { bagId, slot: slotKey, location },
          });
        }
      }
    }
    /* Anywhere -> Anywhere */
    if (dataset?.slotKey) {
      if (location === "shop") {
        if (item?.slot === "stackable") {
          return setDropItem({
            ...item,
            location,
            action: "SHOP_BUY_AMOUNT",
            slotKey,
            bagId,
            dataset,
          });
        }
      }
      /* Dragging directly on to a bag */
      if (item?.base !== "bag" && dataset?.base === "bag") {
        return socket.emit("moveItem", {
          to: {
            bagId: dataset?.id, //if we have a bag
            slot: null,
            location: "bag",
          },
          from: { bagId, slot: slotKey, location },
        });
      }
      return socket.emit("moveItem", {
        to: {
          bagId: dataset?.bagId, //if we have a bag
          slot: dataset?.slotKey,
          location: dataset?.location,
        },
        from: { bagId, slot: slotKey, location },
      });
    }
  }

  return { onDoubleClickItem, onDropItem };
}
