import { getBody, type BodyHabitat } from "./bodies";

/** Where a character of `race` is when its state says `habitat`: one its body lacks is its first. */
export function currentHabitat(race: string | undefined, habitat: unknown): BodyHabitat {
  const { habitats } = getBody(race);
  return habitats.find((h) => h === habitat) ?? habitats[0];
}

/**
 * The sheet a character of `race` shows in `habitat`. A body with several habitats (a bird on the
 * ground and in flight) has one ordinary sheet each: its own for the first, `<race>-<habitat>`
 * (`bird-air`) for the others, so every tool reads them like any other sheet.
 */
export function habitatTexture(race: string | undefined, habitat: unknown): string | undefined {
  const current = currentHabitat(race, habitat);
  return race && getBody(race).habitats.indexOf(current) > 0 ? `${race}-${current}` : race;
}
