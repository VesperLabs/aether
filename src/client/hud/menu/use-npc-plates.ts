import { useEffect, useState } from "react";
import { NPC_PLATES_EVENT, type NpcPlates } from "@/client/scenes/npc-plates";

const NONE: NpcPlates = { owned: [], foes: [], hovered: null };

/** The NPCs that get plates beside the hero's: their pets and followers, foes fighting them, and the one hovered. */
export function useNpcPlates() {
  const [plates, setPlates] = useState<NpcPlates>(NONE);
  useEffect(() => {
    const onPlates = (e: Event) => setPlates((e as CustomEvent<NpcPlates>).detail ?? NONE);
    window.addEventListener(NPC_PLATES_EVENT, onPlates);
    return () => window.removeEventListener(NPC_PLATES_EVENT, onPlates);
  }, []);
  return plates;
}
