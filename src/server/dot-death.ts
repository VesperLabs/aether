import { isDotStat } from "@/content";
import type { ServerCharacter } from "./character";
import { findCharacter } from "./find-character";
import type { Npc } from "./npc";
import type { Player } from "./player";

/**
 * A damage-over-time tick (poison, bleed, burn) that took the last of a character's hp kills them,
 * as a hit would: whoever cast the debuff gets the kill (an owned NPC's goes to its owner).
 */
export function applyDotDeath(character: ServerCharacter) {
  if (character.state.isDead || character.stats.hp > 0) return;
  const dot = character.buffs.find((buff) => Object.keys(buff?.stats ?? {}).some(isDotStat));
  if (!dot) return;
  character.setDead();
  character.stats.hp = 0;
  /* The killing tick's damage shows as the death's number, fire-coloured for a burn */
  const damage = Number(Object.entries(dot.stats ?? {}).find(([key]) => isDotStat(key))?.[1] ?? 0);
  const hits: Hit[] = [
    {
      type: "death",
      amount: -damage,
      ...(dot.name === "burn" && { elements: ["fire"] as Elements[] }),
      from: dot.casterId ?? character.id,
      to: character.id,
    },
  ];
  const killer = findCharacter(character.world, dot.casterId);
  if (character.kind === "npc") {
    const credited = killer?.kind === "player" ? (killer as Player) : (killer as Npc)?.owner?.();
    credited?.creditKills([character as Npc], hits);
  }
  const roomName = character.room?.name;
  if (roomName) character.world.io.to(roomName).emit("assignDamage", hits);
}
