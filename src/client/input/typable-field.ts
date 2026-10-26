export function isTypableFieldActive() {
  const typableTags = ["INPUT", "TEXTAREA", "SELECT", "A"];
  const activeElement = document.activeElement;

  if (activeElement && typableTags.includes(activeElement.tagName)) {
    return true;
  }

  return false;
}
