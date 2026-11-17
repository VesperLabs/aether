import type { PercentStatBlock, StatBlock } from "../stats";

export interface BuffDefinition {
  readonly type: "buff" | "debuff" | "guard";
  /** The `spell-` sheet its icon comes from, when it shares one (every holy buff shows `holy`). */
  readonly icon?: string;
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
  /**
   * What happens when it runs out on its own (not dispelled, not on death): a hook a feature
   * handles through the `buffExpired` event.
   */
  readonly onExpire?: BuffExpireHook;
  /** Landing it shoves the target away from whoever applied it (see `rules/movement/knockback.ts`). */
  readonly knockback?: boolean;
}

/** The hooks a buff may run when it runs out. `catch`: its caster may catch its wearer. */
type BuffExpireHook = "catch";
