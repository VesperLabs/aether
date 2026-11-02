/** Cardinal facing used by movement + `getSpinDirection` (top-down). */
const WIRE_DIRECTIONS = ["up", "down", "left", "right"] as const;
type WireDirection = (typeof WIRE_DIRECTIONS)[number];

export function encodeWireDirection(dir: string | undefined): number {
  if (!dir) return 1;
  const i = WIRE_DIRECTIONS.indexOf(dir as WireDirection);
  return i >= 0 ? i : 1;
}

export function decodeWireDirection(d: unknown, fallback: string): string {
  if (typeof d !== "number" || !Number.isFinite(d)) return fallback;
  return WIRE_DIRECTIONS[d] ?? fallback;
}
