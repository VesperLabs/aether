import type { ComponentProps } from "react";
import { CHAT_DROP_ATTR, linkItemToChat } from "@/client/hud/chat/chat-links";
import { ItemSlot, type SlotEvents } from "@/ui";

/** HUD slots hand drops and double-clicks to the app as window events. */
export const HUD_SLOT_EVENTS: SlotEvents = {
  onDrop: (place, target) => {
    window.dispatchEvent(
      new CustomEvent("HERO_DROP_ITEM", {
        detail: { ...place, location: place.location as string, target },
      }),
    );
  },
  onLink: ({ item, location }) => {
    /* Only items you own can be linked, and a shop's are the keeper's */
    if (location === "shop") return;
    linkItemToChat(item);
  },
  onDragOver: ({ item, location }, target) => {
    const over = location !== "shop" && !!target?.closest(`[${CHAT_DROP_ATTR}]`);
    const name = item.name ?? item.key;
    window.dispatchEvent(
      new CustomEvent("HERO_CHAT_DROP_PREVIEW", {
        detail: over ? { name, rarity: item.rarity } : null,
      }),
    );
  },
  onDoubleClick: ({ item, location }) => {
    window.dispatchEvent(
      new CustomEvent("HERO_DOUBLE_CLICK_ITEM", {
        detail: { item, location: location as string },
      }),
    );
  },
};

/** An item slot the hero can drag and double-click. */
export const Slot = (props: ComponentProps<typeof ItemSlot>) => (
  <ItemSlot events={HUD_SLOT_EVENTS} {...props} />
);
