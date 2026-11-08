/** An open dropdown's list (`Select`): the highlight stays in it until it closes. */
export const LIST = "[role='listbox']";

/** B on an open dropdown: shuts it, leaving its value. False when none is open. */
export function closeNavList() {
  const toggle = document.querySelector<HTMLElement>(
    "[aria-haspopup='listbox'][aria-expanded='true']",
  );
  if (!toggle) return false;
  toggle.click();
  return true;
}
