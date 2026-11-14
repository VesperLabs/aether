import type { PercentStatBlock, StatBlock } from "../stats";

export interface BuffDefinition {
  readonly type: "buff" | "debuff" | "guard";
  readonly duration?: number;
  readonly description?: string;
  readonly stats?: StatBlock;
  readonly percentStats?: PercentStatBlock;
  /**
   * What each level past 1 adds: a level 3 buff has its values plus twice these. Mods apply
   * buffs at the gear's tier, spells at their rank, food at its own level. Left out, a buff is
   * the same at every level.
   */
  readonly perLevel?: {
    readonly duration?: number;
    readonly stats?: StatBlock;
    readonly percentStats?: PercentStatBlock;
  };
  readonly dispelInCombat?: boolean;
  readonly dispelAfterAttack?: boolean;
  readonly dispelOnHit?: boolean;
  /** Landing it shoves the target away from whoever applied it (see `rules/movement/knockback.ts`). */
  readonly knockback?: boolean;
}
