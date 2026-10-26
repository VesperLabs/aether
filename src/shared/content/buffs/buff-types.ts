import type { PercentStatBlock, StatBlock } from "../stats";

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
}
