import { calculateStats, type StatsInput } from "@/rules/stats";
import type { CharacterState } from "@/rules/character";

/** The fields of a character (live or loaded from the database) that stats are calculated from. */
type StatsHolder = StatsInput & { state?: CharacterState };

/**
 * Legacy adapter for the pure `calculateStats` rule: pass the character's plain data in, then
 * store the result back on the character.
 */
export function applyCalculatedStats(character: StatsHolder, shouldHeal = false) {
  const { stats, activeSets } = calculateStats(
    {
      baseStats: character.baseStats,
      stats: character.stats,
      equipment: character.equipment,
      abilities: character.abilities,
      buffs: character.buffs,
      activeItemSlots: character.activeItemSlots,
    },
    shouldHeal,
  );
  character.state = character.state ?? ({} as CharacterState);
  character.stats = stats;
  character.state.activeSets = activeSets;
}
