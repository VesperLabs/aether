/** A hex colour moved part of the way to another, `amount` from 0 (none) to 1 (all the way). */
export const mixHex = (from: string, to: string, amount: number) => {
  /* Short forms like `#fff` are spelled out first. */
  const channels = (hex: string) => {
    const long = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
    return [1, 3, 5].map((i) => parseInt(long.slice(i, i + 2), 16));
  };
  const [a, b] = [channels(from), channels(to)];
  return `#${a
    .map((channel, i) => Math.round(channel + (b[i] - channel) * amount))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};
