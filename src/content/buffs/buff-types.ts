import type { PercentStatBlock, StatBlock } from "@/content/stats/stats";

export interface BuffDefinition {
  readonly type: "buff" | "debuff" | "guard";
  readonly duration?: number;
  readonly description?: string;
  readonly stats?: StatBlock;
  readonly percentStats?: PercentStatBlock;
  readonly scaleDuration?: boolean;
  readonly scaleStats?: boolean;
  readonly dispelInCombat?: boolean;
  readonly dispelAfterAttack?: boolean;
  readonly dispelOnHit?: boolean;
  /** Landing it shoves the target away from whoever applied it (see `rules/movement/knockback.ts`). */
  readonly knockback?: boolean;
}
