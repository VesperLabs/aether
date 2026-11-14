const NUMERALS: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/**
 * A rank as the game writes it: spell ranks, item tiers and buff levels are "II", "IV".
 * Character levels and amounts stay plain numbers. Anything below 1 stays as it is.
 */
export function toRoman(value: number | string | null | undefined): string {
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return String(value ?? "");
  let out = "";
  for (const [size, numeral] of NUMERALS) {
    for (; n >= size; n -= size) out += numeral;
  }
  return out;
}
