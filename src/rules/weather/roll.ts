/** A steady 0..1 from whole numbers: the same inputs always roll the same, on every machine. */
export function roll(n: number, salt: number, more = 0) {
  let h = Math.imul(n ^ Math.imul(salt, 0x9e3779b1) ^ Math.imul(more, 0x27d4eb2f), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x1_0000_0000;
}
