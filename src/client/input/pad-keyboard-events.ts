/** Marks the on-screen keyboard, which takes the controller's menu highlight while it's open. */
export const PAD_KEYBOARD_ATTR = "data-pad-keyboard";

/**
 * Marks a list that opens from what's typed (chat's command list). On a controller it takes over
 * from the on-screen keyboard: the highlight goes to it, and picking or B goes back to typing.
 */
export const PAD_POPUP_ATTR = "data-pad-popup";

export const isPadPopupOpen = () => !!document.querySelector(`[${PAD_POPUP_ATTR}]`);

/* The field the keyboard was typing in before a list took over, to go back to */
let typing: HTMLElement | null = null;

export const leaveTyping = (field: HTMLElement) => {
  typing = field;
};

/** Back to typing in the field a list took over from, with the on-screen keyboard up. */
export function resumeTyping() {
  if (!typing?.isConnected) return;
  choosePadField(typing);
  typing.focus();
}

/** Sent to the on-screen keyboard for the controller's shortcuts on it. */
export const PAD_KEYBOARD_EVENT = "PAD_KEYBOARD";

export type PadKeyboardAction = "back" | "space" | "shift" | "done" | "close";

export const isPadKeyboardOpen = () => !!document.querySelector(`[${PAD_KEYBOARD_ATTR}]`);

export const sendPadKeyboard = (action: PadKeyboardAction) =>
  window.dispatchEvent(new CustomEvent(PAD_KEYBOARD_EVENT, { detail: action }));

/* The field the player chose with A, the only one the keyboard opens for: not one that took
 * focus by itself, or that had it when the controller was picked up */
let chosen: Element | null = null;

export const choosePadField = (field: Element) => {
  chosen = field;
};

export const isPadFieldChosen = (field: Element) => field === chosen;
