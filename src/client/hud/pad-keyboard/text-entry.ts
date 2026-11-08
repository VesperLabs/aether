/** A field the on-screen keyboard can type into. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

const TEXT_TYPES = ["text", "email", "password", "search", "url", "tel", ""];

export const isTextField = (el: Element | null): el is TextField =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && TEXT_TYPES.includes(el.type));

/* Email inputs have no caret position to read, so they type at the end */
function caret(el: TextField) {
  try {
    const end = el.value.length;
    return [el.selectionStart ?? end, el.selectionEnd ?? end] as const;
  } catch {
    return [el.value.length, el.value.length] as const;
  }
}

/**
 * Sets the field's text as typing would. The prototype's setter skips React's copy of the
 * value, so React sees the input event as a change and calls the field's onChange.
 */
function setValue(el: TextField, value: string, caretAt: number) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  try {
    el.setSelectionRange(caretAt, caretAt);
  } catch {
    /* Email inputs can't set a caret either */
  }
}

/** Types `text` at the caret, replacing any selection, and stops at the field's max length. */
export function typeInto(el: TextField, text: string) {
  const [start, end] = caret(el);
  const value = el.value.slice(0, start) + text + el.value.slice(end);
  if (el.maxLength >= 0 && value.length > el.maxLength) return;
  setValue(el, value, start + text.length);
}

/** Deletes the selection, or the character before the caret. */
export function backspace(el: TextField) {
  const [start, end] = caret(el);
  const from = start === end ? Math.max(0, start - 1) : start;
  setValue(el, el.value.slice(0, from) + el.value.slice(end), from);
}

/** Presses a key in the field, as a keyboard would (named by `key` and `code`, as handlers read
 * either). */
function pressKey(el: TextField, key: string) {
  for (const type of ["keydown", "keyup"] as const) {
    el.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true }));
  }
}

export const pressEnter = (el: TextField) => pressKey(el, "Enter");
