import { currentHabitat, type BodyHabitat } from "@/content";
import type { Npc } from "./npc";

/** Where an NPC can go: its actor's habitat, else its body's current one. */
export const npcHabitat = (npc: Npc, actorHabitat = npc.actorHabitat) =>
  actorHabitat ?? currentHabitat(npc.profile?.race, npc.state.habitat);

/**
 * Takes the NPC to the habitat its behavior wants (unset is its body's first): a bird that takes
 * off flies over water, landed it walks round it. Null, not unset, so the change reaches clients
 * (see `pickStatusState`).
 */
export function changeHabitat(npc: Npc, habitat: BodyHabitat | undefined) {
  if ((habitat ?? null) === (npc.state.habitat ?? null)) return;
  npc.state.habitat = habitat ?? null;
  /* Landing ends an escape: drifting back past the spot must not take it up again */
  if (!habitat) npc.state.escapeTo = undefined;
  npc.habitat = npcHabitat(npc);
}
