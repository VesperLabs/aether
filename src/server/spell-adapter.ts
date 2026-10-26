import crypto from "crypto";
import { Spell } from "./spell";

/** Casts a spell in the room. */
export function createSpell(room: Room, spellData: any): Spell {
  const world: ServerWorld = spellData.caster.world;
  const id = crypto.randomUUID();
  world.spells[id] = new Spell(world, { room, ...spellData, id });
  return world.spells[id];
}

/** Takes a spell out of the world. */
export function removeSpell(world: ServerWorld, id: string) {
  if (!world.spells[id]) return console.log("❌ Could not remove spell");
  delete world.spells[id];
}

/** Removes every spell of the room that has run its course. */
export function expireSpells(world: ServerWorld, room: Room) {
  for (const spell of Object.values<Spell>(world.spells)) {
    if (spell.room === room && spell.state?.isExpired) removeSpell(world, spell.id);
  }
}
