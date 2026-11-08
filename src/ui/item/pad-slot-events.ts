/**
 * Events a controller sends an item slot, standing in for the mouse: drop this slot's item on
 * the slot in `detail` (as a drag would), or use it (as a double-click would).
 */
export const PAD_DROP_EVENT = "pad-drop";
export const PAD_USE_EVENT = "pad-use";

export type PadDropEvent = CustomEvent<Element>;
