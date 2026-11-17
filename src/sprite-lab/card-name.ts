/** A card's file name, as the lab saves it: an actor id (`earthElemental`) or a sheet's texture. */
export const isCardName = (name: unknown): name is string =>
  typeof name === "string" && /^[a-zA-Z0-9-]+$/.test(name);
