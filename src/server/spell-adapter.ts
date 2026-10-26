import crypto from "crypto";
import { Spell } from "./spell";

/**
 * Legacy adapter for spells in a room: keeps the live spell objects on the ServerScene
 * (`scene.spells`) and in a physics group per room. Whether a spell is expired and what it may
 * hit are decided by the rules in `@/shared/rules/spells`. Delete in Phase 4 when the world
 * holds plain data.
 */

/** Per-room spell bookkeeping, stored on the Room. */
export interface RoomSpellState {
  /** The room's live spells, for collision checks and cleanup. */
  group: Phaser.Physics.Arcade.Group;
}

export function createRoomSpellState(scene: ServerScene): RoomSpellState {
  return { group: scene.physics.add.group() };
}

/** Casts a spell in the room. */
export function createSpell(room: Room, spellData: any): Spell {
  const { scene } = room;
  const id = crypto.randomUUID();
  scene.spells[id] = new Spell(scene, { room, ...spellData, id });
  scene.add.existing(scene.spells[id]);
  room.spellState.group.add(scene.spells[id]);
  return scene?.spells?.[id];
}

/** Takes a spell out of the room and destroys it. */
export function removeSpell(room: Room, id: string) {
  const { scene } = room;
  if (!scene?.spells?.[id]) {
    return console.log("❌ Could not remove spell");
  }
  room.spellState.group.remove(scene.spells[id]);
  scene.spells[id]?.destroy(true);
  delete scene.spells?.[id];
}

/** Removes every spell of the room that has run its course. */
export function expireSpells(room: Room) {
  for (const spell of room.spellState.group?.getChildren() ?? []) {
    if ((spell as any)?.state?.isExpired) {
      removeSpell(room, (spell as any)?.id);
    }
  }
}
