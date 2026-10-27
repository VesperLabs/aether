import type { ComponentProps } from "react";
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
