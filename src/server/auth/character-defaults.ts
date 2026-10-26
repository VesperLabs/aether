import { ItemBuilder } from "@/shared/content";
import { getBaseStats } from "@/shared/rules/stats";

export const PLAYER_DEFAULT_SPAWN = { roomName: "grassland-3", x: 1496, y: 2028 };

const STARTING_WEAPONS: Record<string, string> = {
  cleric: "staff",
  mage: "wand",
  warrior: "hatchet",
  rogue: "katar",
};

const STARTING_SPELLS: Record<string, string> = {
  cleric: "lightball",
  mage: "fireball",
  warrior: "flameSlash",
  rogue: "stealth",
};

/** What a brand new character of a class starts with, and where it spawns. */
export function getBaseCharacterDefaults({
  level = 1,
  charClass,
}: {
  level?: number;
  charClass?: CharClass;
}) {
  const weapon = STARTING_WEAPONS[charClass as string];
  const spell = STARTING_SPELLS[charClass as string];
  return {
    startingWeapon: weapon ? ItemBuilder.buildItem("weapon", "common", weapon) : undefined,
    startingSpell: spell ? ItemBuilder.buildItem("spell", "common", spell) : undefined,
    baseStats: getBaseStats({ level, charClass }),
    ...PLAYER_DEFAULT_SPAWN,
  };
}
