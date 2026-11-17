import type { Player } from "@/client/views/player";

/**
 * The NPCs the HUD shows plates for beside the hero's: the hero's companions, the ones fighting
 * the hero, and the one under the cursor. Sent on every proximity check while there are any, so their bars and buffs
 * stay live, then once more, empty, when there are none.
 */
export const NPC_PLATES_EVENT = "NPC_PLATES";

/** What an NPC's plate draws. */
export type PlateNpc = Pick<
  Player,
  "id" | "kind" | "profile" | "stats" | "buffs" | "equipment" | "activeItemSlots" | "charClass"
>;

export interface NpcPlates {
  /** The hero's own companions. */
  companions: PlateNpc[];
  /** Fighting the hero (locked on to them), nearest first. */
  foes: PlateNpc[];
  /** Under the cursor, unless it already has a plate as a companion or foe. */
  hovered: PlateNpc | null;
}

/** Most foes given plates at once. */
const MAX_FOES = 4;

let wasShowing = false;

const plateOf = (npc: Player): PlateNpc => ({
  id: npc.id,
  kind: npc.kind,
  profile: npc.profile,
  stats: { ...npc.stats },
  buffs: [...(npc.buffs ?? [])],
  equipment: npc.equipment,
  activeItemSlots: npc.activeItemSlots,
  charClass: npc.charClass,
});

/** Tells the HUD which NPCs get plates. Call on every proximity check. */
export function reportNpcPlates(companions: Player[], foes: Player[], hovered: Player | undefined) {
  const shown = foes.slice(0, MAX_FOES);
  const isShowing = companions.length > 0 || shown.length > 0 || !!hovered;
  if (!isShowing && !wasShowing) return;
  wasShowing = isShowing;
  const listed = [...companions, ...shown];
  const detail: NpcPlates = {
    companions: companions.map(plateOf),
    foes: shown.map(plateOf),
    hovered: hovered && !listed.includes(hovered) ? plateOf(hovered) : null,
  };
  window.dispatchEvent(new CustomEvent(NPC_PLATES_EVENT, { detail }));
}
