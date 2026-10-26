/**
 * Tints in the content data are hex strings like "0xFF6666". Phaser reads them as numbers, so this
 * does the same conversion explicitly.
 */
export function toTint(tint: string | number): number {
  return Number(tint);
}
