import { useMemo } from "react";
import { actors, getBody, isActorId, type ActorDefinition } from "@/content";
import { CharacterFace, keeperCharacter, MobFace, raceAsset } from "./card-pool";

/** A pet is drawn this big, beside its owner's feet. */
const PET_SIZE = 32;

/** A player's pet, by its actor name: its race's sheet, or its gear if its body is layered. */
export const PetFace = ({ name }: { name: string }) => {
  const actor = isActorId(name) ? (actors[name] as ActorDefinition) : undefined;
  /* Built once: a new object each render would make the renderer redraw (and flicker) */
  const character = useMemo(() => actor && keeperCharacter(actor), [actor]);
  if (!actor) return null;
  if (getBody(actor.profile.race).layered) {
    return <CharacterFace character={character} sx={{ width: PET_SIZE, height: PET_SIZE }} />;
  }
  const asset = raceAsset(actor.profile.race);
  if (!asset) return null;
  return <MobFace asset={asset} tint={actor.profile.tint} size={PET_SIZE} shadow />;
};
