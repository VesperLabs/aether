/**
 * A URL as a `define` value. In dev, a localhost URL becomes an expression that swaps in the host
 * the page was opened from, so a phone on the same network that reaches a dev server at the
 * computer's IP also reaches the game server and the other dev servers. Anything else stays as is.
 */
export function pageHostUrl(url: string, command: "serve" | "build") {
  const literal = JSON.stringify(url);
  if (command !== "serve" || !url || new URL(url).hostname !== "localhost") return literal;
  return literal.replace("localhost", '" + location.hostname + "');
}
