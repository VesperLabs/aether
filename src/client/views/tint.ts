/** Phaser's "no tint". */
const NO_TINT = 0xffffff;

/**
 * Tints in the content data are hex strings like "0xFF6666". Phaser reads them as numbers, so this
 * does the same conversion explicitly. A missing or invalid tint means no tint, as `setTint(undefined)`
 * did before; `Number(undefined)` is NaN, which Phaser renders as black.
 */
export function toTint(tint: string | number | null | undefined): number {
  if (tint == null || tint === "") return NO_TINT;
  const value = Number(tint);
  return Number.isNaN(value) ? NO_TINT : value;
}
