const MAX_USER_NAME_LENGTH = 16;

/**
 * A character name as it may be stored: only ASCII letters, digits, `_` and `-`, and short enough
 * to display. An allowlist, because blank-looking characters (zero-width spaces, Hangul fillers,
 * braille blanks) and markup all get past a check for whitespace.
 */
export function cleanUserName(name: string) {
  return name.replace(/[^A-Za-z0-9_-]/g, "").substring(0, MAX_USER_NAME_LENGTH);
}
