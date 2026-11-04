const MAX_USER_NAME_LENGTH = 16;

/** A character name as it may be stored: no whitespace anywhere, and short enough to display. */
export function cleanUserName(name: string) {
  return name.replace(/\s/g, "").substring(0, MAX_USER_NAME_LENGTH);
}
