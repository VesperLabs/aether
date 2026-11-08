/**
 * The item menu a controller opens by holding A on an item: what to do with it (drop, use,
 * move). It takes the menu highlight while it's open, as the on-screen keyboard does.
 */
export const PAD_ITEM_MENU_ATTR = "data-pad-item-menu";

/** Opens the menu for the item slot in `detail`, or closes it (`null`). */
export const PAD_ITEM_MENU_EVENT = "PAD_ITEM_MENU";

export type PadItemMenuEvent = CustomEvent<Element | null>;

export const isPadItemMenuOpen = () => !!document.querySelector(`[${PAD_ITEM_MENU_ATTR}]`);

export const openPadItemMenu = (slot: Element | null) =>
  window.dispatchEvent(new CustomEvent(PAD_ITEM_MENU_EVENT, { detail: slot }));
