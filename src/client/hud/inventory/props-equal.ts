/** Reads a dotted path such as "player.state.activeSets" from nested objects. */
export function get(source: unknown, path: string): unknown {
  let node = source;
  for (const key of path.split(".")) {
    if (node == null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Structural equality for plain data: primitives, arrays and plain objects. */
export function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}
